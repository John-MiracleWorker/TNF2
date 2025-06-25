import { useState, useRef, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { Send, Book, MessageSquare, Mic, Keyboard, StopCircle, FileText, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { VoiceChat } from '@/components/chat/VoiceChat';
import { ChatMessage as ChatMessageType } from '@/lib/types';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { AuthContext } from '@/App';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Local storage keys for persistence
const CHAT_STORAGE_KEY = 'truenorth_chat_messages';
const THREAD_STORAGE_KEY = 'truenorth_chat_thread';

// Maximum retry attempts for failed requests
const MAX_RETRIES = 2;
// Base timeout in milliseconds (50 seconds)
const BASE_TIMEOUT = 50000;

const ChatPage = () => {
  const { session } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      id: 'initial-message',
      role: 'assistant',
      content: "Hello! I'm TrueNorth, your faith-centered AI companion. How can I support your spiritual journey today?",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [conversationStarted, setConversationStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [chatMode, setChatMode] = useState<'text' | 'voice'>('text');
  const { toast } = useToast();
  const [hasProcessedInitialVerse, setHasProcessedInitialVerse] = useState(false);
  
  // State for chat streaming
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Flag to prevent saving during chat recovery
  const recoveryCompleteRef = useRef(false);
  const initialLoadDoneRef = useRef(false);
  
  // Timeout reference for request timeout
  const timeoutIdRef = useRef<number | null>(null);
  
  // Retry counter for failed requests
  const retryCountRef = useRef(0);

  // Use localStorage for persistence
  useEffect(() => {
    // Attempt to restore messages from localStorage
    try {
      const savedMessages = localStorage.getItem(CHAT_STORAGE_KEY);
      const savedThreadId = localStorage.getItem(THREAD_STORAGE_KEY);
      
      if (savedMessages && session) {
        const parsedMessages = JSON.parse(savedMessages);
        // Only restore if we have more than the initial message and the messages are valid
        if (parsedMessages && Array.isArray(parsedMessages) && parsedMessages.length > 1) {
          setMessages(parsedMessages);
          setConversationStarted(true);
          
          // Show a toast indicating chat was restored
          toast({
            title: 'Chat Restored',
            description: 'Your previous conversation has been recovered.',
          });
        }
      }
      
      if (savedThreadId && session) {
        setThreadId(savedThreadId);
      }
      
      // Mark initial load as complete
      initialLoadDoneRef.current = true;
      recoveryCompleteRef.current = true;
    } catch (e) {
      console.error('Error parsing saved messages:', e);
      localStorage.removeItem(CHAT_STORAGE_KEY);
      
      // Ensure recovery is marked as complete even on error
      initialLoadDoneRef.current = true;
      recoveryCompleteRef.current = true;
    }
  }, [session]);
  
  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (!initialLoadDoneRef.current) {
      return; // Skip saving until initial load is complete
    }
    
    // Only save if we have something meaningful to save (more than initial message)
    if (messages.length > 1) {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);
  
  // Save threadId to localStorage whenever it changes
  useEffect(() => {
    if (threadId) {
      localStorage.setItem(THREAD_STORAGE_KEY, threadId);
    }
  }, [threadId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentStreamingMessage]);

  // Extract verse information from URL if provided
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const verseRef = params.get('verse');
    const verseText = params.get('text');
    
    if (verseRef && verseText && !hasProcessedInitialVerse && !isLoading) {
      // Create a user message asking about the verse
      const initialMessage = `I'd like to reflect on this verse: "${verseText}" - ${verseRef}. Can you help me understand its meaning and application to my life?`;
      setInput(initialMessage);
      
      // Set flag to prevent duplicate processing
      setHasProcessedInitialVerse(true);
      
      // Only send the message once
      handleSendMessage(initialMessage);
    }
  }, [location.search, hasProcessedInitialVerse, isLoading]);

  // Cleanup function to abort any pending requests and clear timeouts
  const cleanupRequest = () => {
    // Abort any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Clear any pending timeouts
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
  };

  const handleSendMessage = async (messageText: string = input, retry = 0) => {
    if (!messageText.trim() || isLoading) return;

    // Check if user is authenticated
    if (!session?.access_token) {
      setMessages((prev) => [...prev, {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: "Please log in to continue the conversation.",
      }]);
      return;
    }

    console.log('Sending message:', messageText);

    // Clean up any existing request
    cleanupRequest();

    const userMessage: ChatMessageType = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: messageText,
    };

    // Add user message to chat immediately
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    // Mark conversation as started after first user message
    if (!conversationStarted) {
      setConversationStarted(true);
    }

    try {
      // Determine the correct API URL based on the environment
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      
      // Check if we have the required configuration
      if (!supabaseUrl) {
        console.error('Missing Supabase URL configuration. Showing mock response.');
        setTimeout(() => {
          const mockResponse: ChatMessageType = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "I'm sorry, I'm having trouble connecting to the backend service. Please check your environment configuration.",
          };
          setMessages(prev => [...prev, mockResponse]);
          setIsLoading(false);
        }, 1000);
        return;
      }
      
      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();
      
      // Set a timeout for the request (55 seconds)
      timeoutIdRef.current = window.setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort('Request timed out');
          
          // Add timeout error message
          setMessages(prev => [
            ...prev,
            {
              id: `error_${Date.now()}`,
              role: 'assistant',
              content: "I'm sorry, but the request timed out. Please try again with a shorter message or check your internet connection."
            }
          ]);
          
          setIsLoading(false);
          setCurrentStreamingMessage('');
          abortControllerRef.current = null;
        }
      }, 55000);
      
      try {
        // Reset streaming message
        setCurrentStreamingMessage('');

        // Set the current retry count
        retryCountRef.current = retry;

        // Call the chat API with streaming enabled
        const response = await fetch(`${supabaseUrl}/functions/v1/chat-stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'X-Client-Info': 'truenorth-app',
            'Cache-Control': 'no-cache'
          },
          body: JSON.stringify({
            message: messageText,
            threadId: threadId,
          }),
          signal: abortControllerRef.current.signal
        });

        // Clear the timeout since we got a response
        if (timeoutIdRef.current) {
          clearTimeout(timeoutIdRef.current);
          timeoutIdRef.current = null;
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to get response from assistant: ${response.status} ${response.statusText} - ${errorText}`);
        }

        // Process the stream
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Response body is not readable');
        }

        // Read stream chunks
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        let fullResponse = "";

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          // Decode the chunk and add to buffer
          buffer += decoder.decode(value, { stream: true });
          
          // Process complete lines from the buffer
          let lines = buffer.split('\n\n');
          // Keep the last (potentially incomplete) line in the buffer
          buffer = lines.pop() || "";
          
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                // Parse the JSON data
                const data = JSON.parse(line.substring(6));
                const content = data.content || "";
                
                if (content) {
                  fullResponse = content;
                  setCurrentStreamingMessage(content);
                  
                  // If this is the final message chunk
                  if (data.done) {
                    // Add the complete message to chat
                    const newAssistantMessage: ChatMessageType = {
                      id: `assistant_${Date.now()}`,
                      role: 'assistant',
                      content: content,
                    };
                    
                    setMessages((prev) => [...prev, newAssistantMessage]);
                    setCurrentStreamingMessage('');
                  }
                }
                
                // If we received a threadId, save it
                if (data.threadId && !threadId) {
                  setThreadId(data.threadId);
                }
                
                // Handle errors
                if (data.error) {
                  throw new Error(data.error);
                }
              } catch (parseError) {
                console.error('Error parsing event:', parseError, line);
              }
            }
          }
        }
      } catch (error) {
        // Handle different error types
        if (error.name === 'AbortError') {
          console.log('Request was aborted:', error.message);
          
          // Only add a message if it was a timeout (not a user-initiated abort)
          if (error.message === 'Request timed out') {
            setMessages((prev) => [...prev, {
              id: `error_${Date.now()}`,
              role: 'assistant',
              content: "I'm sorry, the request timed out. Please try again with a shorter message or check your internet connection.",
            }]);
          }
        } else {
          // Handle other errors
          console.error('Error in fetch:', error);
          
          // Implement retry logic
          if (retry < MAX_RETRIES) {
            console.log(`Retrying request (${retry + 1}/${MAX_RETRIES})...`);
            
            // Add a slight delay before retrying
            setTimeout(() => {
              handleSendMessage(messageText, retry + 1);
            }, 1000 * (retry + 1)); // Exponential backoff
            
            return;
          } else {
            // We've exhausted retries
            setMessages((prev) => [...prev, {
              id: `error_${Date.now()}`,
              role: 'assistant',
              content: "I'm sorry, I'm having trouble connecting. Our servers might be busy. Please try again in a moment.",
            }]);
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      setMessages((prev) => [...prev, {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: "I'm sorry, I'm having trouble connecting. Please try again in a moment.",
      }]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
      
      // Clear any remaining timeout
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
    }
  };

  const handleEndChat = async () => {
    if (!session?.access_token || !conversationStarted) {
      toast({
        title: 'Cannot End Chat',
        description: 'No active conversation to save.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Filter out the initial greeting message for journal creation
      const conversationMessages = messages.filter(msg => msg.id !== 'initial-message');
      
      if (conversationMessages.length < 2) {
        toast({
          title: 'Cannot Save',
          description: 'Conversation too short to create a meaningful journal entry.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      
      const response = await fetch(`${supabaseUrl}/functions/v1/chat-journal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: conversationMessages,
          threadId: threadId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create journal entry: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (data.journalEntry) {
        toast({
          title: 'Chat Saved!',
          description: 'Your conversation has been saved to your spiritual journal.',
        });
        
        // Reset the chat and clear storage
        setMessages([{
          id: 'initial-message',
          role: 'assistant',
          content: "Hello! I'm TrueNorth, your faith-centered AI companion. How can I support your spiritual journey today?",
        }]);
        setThreadId(null);
        setConversationStarted(false);
        localStorage.removeItem(CHAT_STORAGE_KEY);
        localStorage.removeItem(THREAD_STORAGE_KEY);
        
      } else {
        throw new Error('No journal entry created');
      }
      
    } catch (error) {
      console.error('Error ending chat:', error);
      toast({
        title: 'Error',
        description: 'Failed to save conversation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    // If there's an active request, abort it
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Clear any pending timeouts
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    
    setMessages([{
      id: 'initial-message',
      role: 'assistant',
      content: "Hello! I'm TrueNorth, your faith-centered AI companion. How can I support your spiritual journey today?",
    }]);
    setThreadId(null);
    setConversationStarted(false);
    setInput('');
    setCurrentStreamingMessage('');
    // Reset the URL parameters without refreshing the page
    navigate('/chat', { replace: true });
    // Reset the verse processing flag
    setHasProcessedInitialVerse(false);
    // Clear stored chat data
    localStorage.removeItem(CHAT_STORAGE_KEY);
    localStorage.removeItem(THREAD_STORAGE_KEY);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Get the last assistant message for voice chat
  const lastAssistantMessage = messages.slice().reverse().find(msg => msg.role === 'assistant');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRequest();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-grow flex flex-col pt-24 pb-16">
        <div className="container-custom mx-auto flex-grow flex flex-col max-w-4xl">
          <motion.div 
            className="mb-4 text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-bold text-foreground mb-2">Your Faith Companion</h1>
            <p className="text-muted-foreground">Ask questions, seek guidance, or discuss your spiritual journey</p>
          </motion.div>
          
          <div className="mb-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-2 w-full bg-background">
                <TabsTrigger 
                  value="chat" 
                  className={`${activeTab === 'chat' ? 'bg-secondary text-secondary-foreground' : 'bg-background/50 text-muted-foreground'}`}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Chat
                </TabsTrigger>
                <TabsTrigger 
                  value="journal" 
                  className={`${activeTab === 'journal' ? 'bg-secondary text-secondary-foreground' : 'bg-background/50 text-muted-foreground'}`}
                  asChild
                >
                  <Link to="/journal">
                    <Book className="h-4 w-4 mr-2" />
                    Journal
                  </Link>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {/* Input Mode Selector */}
          <div className="mb-4 flex justify-between items-center">
            <div></div> {/* Empty div for spacing */}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setChatMode(chatMode === 'text' ? 'voice' : 'text')}
              className="mb-2"
            >
              {chatMode === 'text' ? (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Switch to Voice Mode
                </>
              ) : (
                <>
                  <Keyboard className="h-4 w-4 mr-2" />
                  Switch to Text Mode
                </>
              )}
            </Button>
          </div>
          
          {/* Chat Actions - Only shown when conversation has started */}
          {conversationStarted && (
            <div className="mb-4 flex justify-between items-center">
              <div className="flex space-x-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-secondary text-secondary hover:bg-secondary/10"
                      disabled={isLoading}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      End & Save Chat
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Save Conversation to Journal</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will save your entire conversation as a journal entry and start a new chat. 
                        This action will help you preserve meaningful spiritual conversations for future reflection.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Continue Chatting</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleEndChat}
                        className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Saving...' : 'Save to Journal'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleNewChat}
                  disabled={isLoading}
                >
                  <StopCircle className="mr-2 h-4 w-4" />
                  New Chat
                </Button>
              </div>
            </div>
          )}
          
          <div className="flex-grow bg-card rounded-lg shadow-md p-4 md:p-6 mb-4 overflow-y-auto max-h-[60vh]">
            <div className="flex flex-col space-y-4">
              {messages.map((message, index) => (
                <ChatMessage key={message.id || index} message={message} />
              ))}
              
              {/* Streaming Message */}
              {currentStreamingMessage && (
                <div className="flex w-full gap-3 my-4 justify-start">
                  <div className="h-8 w-8 border border-gold flex-shrink-0 rounded-full flex items-center justify-center bg-navy text-cream">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L4 7L12 12L20 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M4 17L12 22L20 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M4 12L12 17L20 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  
                  <div className="max-w-[80%] rounded-lg p-4 bg-navy text-cream">
                    <div className="flex flex-col gap-1">
                      <div className="text-sm font-medium">
                        TrueNorth
                      </div>
                      <div className="mt-1 whitespace-pre-wrap">{currentStreamingMessage}</div>
                    </div>
                  </div>
                </div>
              )}
              
              {isLoading && !currentStreamingMessage && (
                <div className="flex justify-center py-4">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span className="text-muted-foreground">TrueNorth is thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            {chatMode === 'text' ? (
              <div className="flex items-end gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message here..."
                  className="resize-none min-h-[60px]"
                  disabled={isLoading}
                />
                <Button 
                  onClick={() => handleSendMessage()} 
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90 h-[60px] px-4"
                  disabled={isLoading || !input.trim()}
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <VoiceChat 
                onSendMessage={handleSendMessage}
                isProcessing={isLoading}
                lastMessage={lastAssistantMessage || null}
              />
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ChatPage;