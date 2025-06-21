import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Loader2, User, Users, Settings, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';

interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isAdmin?: boolean;
  isOwner?: boolean;
}

interface LiveChatProps {
  channelId: string;
  platform: 'youtube' | 'twitch';
  height?: number;
  showHeader?: boolean;
  useRealEmbed?: boolean;
}

export function LiveChat({
  channelId,
  platform = 'youtube',
  height = 480,
  showHeader = true,
  useRealEmbed = false
}: LiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'chat' | 'embed'>('chat');
  const [userProfile, setUserProfile] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // YouTube and Twitch chat embed URLs
  const youtubeChatUrl = `https://www.youtube.com/live_chat?v=${channelId}&embed_domain=${window.location.hostname}`;
  const twitchChatUrl = `https://www.twitch.tv/embed/${channelId}/chat?parent=${window.location.hostname}`;

  // Scroll to bottom whenever messages update
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load user profile
  useEffect(() => {
    const loadUserProfile = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
          
        setUserProfile(profile);
      }
    };
    
    loadUserProfile();
  }, []);

  // Load and initialize chat
  useEffect(() => {
    // If using real embed, we don't need to load sample messages
    if (useRealEmbed && activeTab === 'embed') {
      setIsLoading(false);
      return;
    }
    
    // For demo purposes, we'll generate some sample messages
    const sampleMessages: ChatMessage[] = [
      { id: '1', sender: 'JohnDoe', content: 'Hello everyone! Excited for the stream today!', timestamp: new Date(Date.now() - 15 * 60000).toISOString() },
      { id: '2', sender: 'StreamHost', content: 'Welcome to the stream! Today we\'ll be discussing faith and technology.', timestamp: new Date(Date.now() - 10 * 60000).toISOString(), isOwner: true },
      { id: '3', sender: 'Sarah123', content: 'I\'ve been looking forward to this all week!', timestamp: new Date(Date.now() - 8 * 60000).toISOString() },
      { id: '4', sender: 'Moderator', content: 'Remember to keep chat respectful and on-topic everyone!', timestamp: new Date(Date.now() - 6 * 60000).toISOString(), isAdmin: true },
      { id: '5', sender: 'PrayerWarrior', content: 'The last stream was so inspiring. I\'ve been reflecting on it all week.', timestamp: new Date(Date.now() - 4 * 60000).toISOString() },
      { id: '6', sender: 'StreamHost', content: 'Today we\'ll start with a short prayer and then get into our topic.', timestamp: new Date(Date.now() - 2 * 60000).toISOString(), isOwner: true },
    ];

    setMessages(sampleMessages);
    setViewerCount(42); // Simulate viewer count
    setIsLoading(false);

    // In a real application, we would set up WebSockets or polling to get live chat
    // For demo purposes, we'll simulate new messages coming in
    const interval = setInterval(() => {
      // Only add new messages if not using the real embed
      if (!useRealEmbed || activeTab === 'chat') {
        const randomMessages = [
          'Amen to that! 🙏',
          'That\'s such a good point!',
          'Could you elaborate on that?',
          'Scripture reference for that?',
          'I\'ve been struggling with this too',
          'This is exactly what I needed to hear today',
          'God bless you all ✝️',
          'I\'m sharing this with my small group!'
        ];
        
        const randomSenders = [
          'FaithfulFollower',
          'BibleStudent',
          'GraceFinder',
          'PrayerWarrior',
          'TruthSeeker',
          'HopeBringer',
          'LightBearer'
        ];
        
        const newMessage: ChatMessage = {
          id: Date.now().toString(),
          sender: randomSenders[Math.floor(Math.random() * randomSenders.length)],
          content: randomMessages[Math.floor(Math.random() * randomMessages.length)],
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, newMessage]);
        setViewerCount(prev => Math.max(40, prev + Math.floor(Math.random() * 3) - 1));
      }
    }, 12000);

    return () => clearInterval(interval);
  }, [channelId, platform, useRealEmbed, activeTab]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    // In a real application, you would send this to your backend/API
    // For demo purposes, we'll just add it to local state
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: userProfile?.display_name || 'You',
      content: newMessage.trim(),
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
  };

  // If real embed is enabled, default to the embed tab
  useEffect(() => {
    if (useRealEmbed) {
      setActiveTab('embed');
    }
  }, [useRealEmbed]);

  return (
    <Card className="h-full flex flex-col">
      {showHeader && (
        <CardHeader className="pb-0">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <span>Live Chat</span>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 ml-2">
                <Users className="h-3 w-3 mr-1" />
                {viewerCount} viewers
              </Badge>
            </CardTitle>
            
            <Tabs defaultValue={useRealEmbed ? 'embed' : 'chat'} value={activeTab} onValueChange={(value) => setActiveTab(value as 'chat' | 'embed')}>
              <TabsList className="h-8">
                <TabsTrigger value="chat" className="h-7 text-xs px-2">
                  Custom Chat
                </TabsTrigger>
                <TabsTrigger value="embed" className="h-7 text-xs px-2">
                  {platform === 'youtube' ? 'YouTube Chat' : 'Twitch Chat'}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
      )}
      
      <CardContent className={`pt-4 flex-grow overflow-hidden flex flex-col ${showHeader ? '' : 'pt-0'}`}>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Loading chat...</p>
          </div>
        ) : (
          <Tabs value={activeTab} defaultValue="chat" className="flex-grow flex flex-col h-full">
            <TabsContent value="chat" className="flex-grow flex flex-col h-full mt-0 data-[state=active]:flex">
              {/* Custom chat UI */}
              <div className="flex-grow overflow-y-auto pr-1 mb-2" style={{ height: height - 150 }}>
                {messages.map((message) => (
                  <div key={message.id} className="mb-3 flex">
                    <Avatar className="h-8 w-8 mr-2 mt-0.5">
                      <AvatarFallback className={
                        message.isOwner 
                          ? "bg-secondary text-secondary-foreground" 
                          : message.isAdmin 
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                      }>
                        {message.sender.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${
                          message.isOwner 
                            ? "text-secondary" 
                            : message.isAdmin 
                              ? "text-primary"
                              : ""
                        }`}>
                          {message.sender}
                        </span>
                        {message.isOwner && (
                          <Badge variant="outline" className="px-1 py-0 h-4 text-[10px] bg-secondary/10 text-secondary border-secondary/20">
                            Host
                          </Badge>
                        )}
                        {message.isAdmin && (
                          <Badge variant="outline" className="px-1 py-0 h-4 text-[10px] bg-primary/10 text-primary border-primary/20">
                            Mod
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.timestamp).toLocaleTimeString(undefined, { 
                            hour: '2-digit', 
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </TabsContent>
            
            <TabsContent value="embed" className="h-full mt-0 data-[state=active]:flex">
              {/* Embedded platform chat */}
              <div className="w-full h-full">
                <iframe 
                  src={platform === 'youtube' ? youtubeChatUrl : twitchChatUrl}
                  width="100%" 
                  height={height - 100}
                  frameBorder="0"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms"
                ></iframe>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
      
      {activeTab === 'chat' && (
        <CardFooter className="border-t p-3">
          <form onSubmit={handleSendMessage} className="flex space-x-2 w-full">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-grow"
            />
            <Button type="submit" disabled={!newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardFooter>
      )}
    </Card>
  );
}