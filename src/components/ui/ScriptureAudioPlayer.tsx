import { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  Settings, 
  VolumeX, 
  Volume, 
  SkipForward, 
  SkipBack, 
  Loader2 
} from 'lucide-react';
import { 
  Button,
  ButtonProps 
} from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Slider
} from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { callEdgeFunction } from '@/lib/supabase-functions';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Available voice options
const VOICE_OPTIONS = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral & Versatile' },
  { id: 'echo', name: 'Echo', description: 'Soft & Conversational' },
  { id: 'fable', name: 'Fable', description: 'Warm & Relatable' },
  { id: 'onyx', name: 'Onyx', description: 'Deep & Authoritative' },
  { id: 'nova', name: 'Nova', description: 'Bright & Professional' },
  { id: 'shimmer', name: 'Shimmer', description: 'Clear & Gentle' }
];

interface ScriptureAudioPlayerProps extends ButtonProps {
  title?: string;
  scripture: string;
  reflection?: string;
  showSettings?: boolean;
  voiceId?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
}

export function ScriptureAudioPlayer({ 
  title, 
  scripture,
  reflection,
  showSettings = false,
  voiceId = 'echo',
  size = 'default',
  variant = 'default',
  className,
  ...props 
}: ScriptureAudioPlayerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(voiceId);
  const [error, setError] = useState<string | null>(null);
  const [useOpenAIVoice, setUseOpenAIVoice] = useState(true);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const { toast } = useToast();

  // Initialize audio element on mount
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      
      // Set up event handlers
      audioRef.current.onplay = () => {
        setIsPlaying(true);
        setIsPaused(false);
      };
      
      audioRef.current.onpause = () => {
        if (!audioRef.current?.ended) {
          setIsPaused(true);
        }
      };
      
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentTime(0);
      };
      
      audioRef.current.ontimeupdate = () => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
      };
      
      audioRef.current.ondurationchange = () => {
        if (audioRef.current) {
          setDuration(audioRef.current.duration);
        }
      };
      
      audioRef.current.onerror = () => {
        setError('Error loading audio. Please try again.');
        setIsPlaying(false);
        setIsPaused(false);
      };
    }
    
    // Clean up on unmount
    return () => {
      cleanupAudio();
    };
  }, []);

  // Update volume when changed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100 * (isMuted ? 0 : 1);
    }
  }, [volume, isMuted]);

  // Cleanup function
  const cleanupAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setIsPlaying(false);
    setIsPaused(false);
    setIsLoading(false);
  };

  // Toggle play/pause
  const togglePlayback = async () => {
    try {
      if (!audioRef.current?.src || audioRef.current.error) {
        // Need to load audio first
        await loadAndPlayAudio();
        return;
      }
      
      if (isPlaying && !isPaused) {
        // Pause
        audioRef.current.pause();
      } else if (isPaused) {
        // Resume
        audioRef.current.play();
      } else {
        // Start playing from beginning
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
      setError('Error controlling playback');
      toast({
        title: 'Playback Error',
        description: 'There was an error playing the audio.',
        variant: 'destructive',
      });
    }
  };

  // Load and play audio using OpenAI TTS
  const loadAndPlayAudio = async () => {
    if (!scripture.trim()) {
      toast({
        title: 'No Content',
        description: 'There is no scripture content to read.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Determine what text to read (scripture only or scripture + reflection)
      const textToRead = reflection 
        ? `${scripture}\n\n${reflection}` 
        : scripture;
      
      if (useOpenAIVoice) {
        await loadWithOpenAI(textToRead);
      } else {
        // Fallback to browser TTS
        playWithBrowserTTS(textToRead);
      }
    } catch (error) {
      console.error('Failed to load audio:', error);
      setError('Failed to load audio. Trying browser voices instead.');
      
      // Fallback to browser TTS
      playWithBrowserTTS(scripture);
    } finally {
      setIsLoading(false);
    }
  };

  // Load audio using OpenAI TTS
  const loadWithOpenAI = async (text: string) => {
    try {
      // Set up for checking if Supabase session is available
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured');
      }
      
      // Call the OpenAI TTS edge function
      const response = await fetch(`${supabaseUrl}/functions/v1/openai-tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          text,
          voice: selectedVoice
        }),
      });
      
      // Handle subscription requirements
      if (response.status === 402) {
        toast({
          title: 'Premium Feature',
          description: 'High-quality voices require a TrueNorth Pro subscription.',
          variant: 'default',
        });
        
        // Fall back to browser voices
        setUseOpenAIVoice(false);
        playWithBrowserTTS(text);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status}`);
      }
      
      // Create audio URL from response
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Clean up previous URL if it exists
      if (audioRef.current?.src) {
        URL.revokeObjectURL(audioRef.current.src);
      }
      
      // Set the audio source and play
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.volume = volume / 100 * (isMuted ? 0 : 1);
        await audioRef.current.play();
      }
    } catch (error) {
      console.error('Error with OpenAI TTS:', error);
      throw error;
    }
  };

  // Fallback to browser TTS
  const playWithBrowserTTS = (text: string) => {
    if (!('speechSynthesis' in window)) {
      toast({
        title: 'Not Supported',
        description: 'Speech synthesis is not supported in your browser.',
        variant: 'destructive',
      });
      return;
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Create utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = volume / 100 * (isMuted ? 0 : 1);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    // Try to find a good voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(voice => voice.lang?.includes('en'));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }
    
    // Event handlers
    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };
    
    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };
    
    utterance.onerror = () => {
      setError('Speech synthesis error');
      setIsPlaying(false);
      setIsPaused(false);
    };
    
    // Speak
    window.speechSynthesis.speak(utterance);
  };

  // Skip forward/backward
  const skipTime = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(
        Math.max(0, audioRef.current.currentTime + seconds),
        audioRef.current.duration || 0
      );
    }
  };

  // Format time display
  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  // Handle simple button click
  const handleButtonClick = () => {
    if (isExpanded) {
      togglePlayback();
    } else {
      setIsExpanded(true);
    }
  };

  // Simple player button
  if (!isExpanded) {
    return (
      <Button
        size={size}
        variant={variant}
        className={cn("flex items-center gap-2", className)}
        onClick={handleButtonClick}
        {...props}
      >
        <Volume2 className={size === 'icon' ? "h-4 w-4" : "h-4 w-4 mr-1"} />
        {size !== 'icon' && <span>Listen</span>}
      </Button>
    );
  }

  // Full player UI
  return (
    <div className={cn("w-full p-4 rounded-lg border border-border bg-card text-card-foreground", className)}>
      {/* Title */}
      {title && (
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-medium text-sm">{title}</h3>
          
          {showSettings && (
            <div className="flex items-center space-x-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <Settings className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Voice</h4>
                      <select 
                        value={selectedVoice}
                        onChange={(e) => setSelectedVoice(e.target.value)}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      >
                        {VOICE_OPTIONS.map(voice => (
                          <option key={voice.id} value={voice.id}>
                            {voice.name} - {voice.description}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Use OpenAI Voices</span>
                      <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
                        data-state={useOpenAIVoice ? 'checked' : 'unchecked'}
                        onClick={() => setUseOpenAIVoice(!useOpenAIVoice)}
                      >
                        <span className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${useOpenAIVoice ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-sm">Volume</h4>
                        <span className="text-xs text-muted-foreground">{volume}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={toggleMute}>
                          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume className="h-4 w-4" />}
                        </Button>
                        <Slider
                          value={[volume]}
                          min={0}
                          max={100}
                          step={1}
                          className="flex-1"
                          onValueChange={(values) => setVolume(values[0])}
                        />
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              
              <Button variant="ghost" size="icon" onClick={() => setIsExpanded(false)} className="h-8 w-8">
                <SkipBack className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
      
      {/* Progress bar */}
      <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary"
          style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
        />
      </div>
      
      {/* Time display */}
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
      
      {/* Controls */}
      <div className="flex justify-between items-center mt-3">
        <div className="flex items-center space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={toggleMute} className="h-8 w-8">
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isMuted ? 'Unmute' : 'Mute'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={() => skipTime(-10)} className="h-8 w-8">
            <SkipBack className="h-4 w-4" />
          </Button>
          
          <Button 
            onClick={togglePlayback}
            variant="default"
            size="icon"
            disabled={isLoading}
            className="h-10 w-10 rounded-full"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isPlaying && !isPaused ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>
          
          <Button variant="ghost" size="icon" onClick={() => skipTime(10)} className="h-8 w-8">
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>
        
        <div>
          {!showSettings && (
            <Button variant="ghost" size="icon" onClick={() => setIsExpanded(false)} className="h-8 w-8">
              <SkipBack className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="mt-2 text-sm text-destructive">{error}</div>
      )}
    </div>
  );
}