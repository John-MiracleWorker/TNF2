import { useState, useEffect } from 'react';
import { Loader2, Wifi, WifiOff, Volume2, VolumeX, Maximize, Settings, DownloadCloud, Clock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface LiveStreamPlayerProps {
  channelId: string;
  platform: 'youtube' | 'twitch';
  autoplay?: boolean;
  muted?: boolean;
  fullWidth?: boolean;
  height?: number;
}

export function LiveStreamPlayer({
  channelId,
  platform = 'youtube',
  autoplay = true,
  muted = false,
  fullWidth = true,
  height = 480
}: LiveStreamPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [selectedQuality, setSelectedQuality] = useState('auto');
  const [error, setError] = useState<string | null>(null);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [isProcessingSermon, setIsProcessingSermon] = useState(false);
  const { toast } = useToast();

  // YouTube embed URL
  const youtubeUrl = currentVideoId 
    ? `https://www.youtube.com/embed/${currentVideoId}?autoplay=${autoplay ? 1 : 0}&mute=${isMuted ? 1 : 0}`
    : `https://www.youtube.com/embed/live_stream?channel=${channelId}&autoplay=${autoplay ? 1 : 0}&mute=${isMuted ? 1 : 0}`;
  
  // Twitch embed URL
  const twitchUrl = `https://player.twitch.tv/?channel=${channelId}&parent=${window.location.hostname}&autoplay=${autoplay}&muted=${isMuted}`;

  // Handle platform selection
  const embedUrl = platform === 'youtube' ? youtubeUrl : twitchUrl;

  // Check if stream is live and get current video ID if available
  useEffect(() => {
    const checkStreamStatus = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (platform === 'youtube') {
          // Try to get the active livestream for this channel
          const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
          
          if (!YOUTUBE_API_KEY) {
            console.warn('YouTube API key not configured, simulating live status');
            // Simulate success for demo without API key
            setIsLive(true);
            setIsLoading(false);
            return;
          }
          
          const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}` +
            `&eventType=live&type=video&key=${YOUTUBE_API_KEY}`
          );
          
          if (!response.ok) {
            throw new Error(`YouTube API error: ${await response.text()}`);
          }
          
          const data = await response.json();
          
          if (data.items && data.items.length > 0) {
            // Channel is currently live
            setIsLive(true);
            setCurrentVideoId(data.items[0].id.videoId);
            console.log('Live video ID:', data.items[0].id.videoId);
          } else {
            // Try to get most recent completed broadcast
            const completedResponse = await fetch(
              `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}` +
              `&eventType=completed&type=video&order=date&maxResults=1&key=${YOUTUBE_API_KEY}`
            );
            
            if (completedResponse.ok) {
              const completedData = await completedResponse.json();
              
              if (completedData.items && completedData.items.length > 0) {
                setCurrentVideoId(completedData.items[0].id.videoId);
                console.log('Recent completed video ID:', completedData.items[0].id.videoId);
              }
            }
            
            setIsLive(false);
          }
        } else if (platform === 'twitch') {
          // For Twitch, we would use their API
          // Simulating for now
          setIsLive(true);
        }
      } catch (error) {
        console.error('Error checking stream status:', error);
        
        // Simulate live status for demo purposes if API fails
        setIsLive(true);
        
        setError('Could not verify stream status. Attempting to load stream anyway.');
      } finally {
        setIsLoading(false);
      }
    };

    checkStreamStatus();
    
    // Check status every 5 minutes
    const interval = setInterval(checkStreamStatus, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [channelId, platform]);

  const handleFullscreen = () => {
    const iframe = document.querySelector('.stream-iframe') as HTMLIFrameElement;
    if (iframe) {
      if (iframe.requestFullscreen) {
        iframe.requestFullscreen();
      }
    }
  };

  const handleAnalyzeSermon = async () => {
    if (!currentVideoId) {
      toast({
        title: "No Video Available",
        description: "There is no video available to analyze.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessingSermon(true);
    
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured');
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in to analyze sermons');
      }
      
      // Call the Edge Function
      const response = await fetch(`${supabaseUrl}/functions/v1/process-livestream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          videoId: currentVideoId,
          channelId,
          manual: true
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to start sermon analysis: ${errorText}`);
      }
      
      const result = await response.json();
      
      if (result.sermon_id) {
        toast({
          title: "Sermon Analysis Started",
          description: "The sermon is being processed. You can view the results in the Sermon Analysis tab.",
        });
      } else {
        toast({
          title: "Analysis In Progress",
          description: result.message || "Sermon analysis has been started.",
        });
      }
    } catch (error) {
      console.error('Error analyzing sermon:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to start sermon analysis.",
        variant: "destructive"
      });
    } finally {
      setIsProcessingSermon(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="flex items-center gap-2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isLive ? (
            <span className="flex items-center">
              <Wifi className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-500">Live</span>
            </span>
          ) : (
            <span className="flex items-center">
              <WifiOff className="h-4 w-4 text-gray-400 mr-1" />
              <span className="text-gray-400">Offline</span>
            </span>
          )}
          <span className="ml-2">{platform === 'youtube' ? 'YouTube' : 'Twitch'} Stream</span>
          
          {currentVideoId && !isLive && (
            <Badge className="ml-2 bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300">
              <Calendar className="h-3 w-3 mr-1" />
              Previous Stream
            </Badge>
          )}
        </CardTitle>
        
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setIsMuted(!isMuted)}
                  className="h-8 w-8"
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isMuted ? 'Unmute' : 'Mute'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleFullscreen}
                  className="h-8 w-8"
                >
                  <Maximize className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Fullscreen
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Select 
            value={selectedQuality} 
            onValueChange={setSelectedQuality}
          >
            <SelectTrigger className="w-[100px] h-8">
              <SelectValue placeholder="Quality" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto</SelectItem>
              <SelectItem value="1080p">1080p</SelectItem>
              <SelectItem value="720p">720p</SelectItem>
              <SelectItem value="480p">480p</SelectItem>
              <SelectItem value="360p">360p</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-40">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-40 px-4 text-center">
            <WifiOff className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Stream Not Available</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        ) : isLive || currentVideoId ? (
          <div className={`relative ${fullWidth ? 'w-full' : 'max-w-3xl mx-auto'}`}>
            <iframe 
              src={embedUrl}
              className="stream-iframe"
              width="100%" 
              height={height} 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              allowFullScreen
            ></iframe>
            
            {!isLive && currentVideoId && (
              <div className="absolute bottom-4 right-4">
                <Button 
                  onClick={handleAnalyzeSermon}
                  disabled={isProcessingSermon}
                  className="bg-secondary/90 backdrop-blur-sm text-secondary-foreground hover:bg-secondary"
                >
                  {isProcessingSermon ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <DownloadCloud className="mr-2 h-4 w-4" />
                      Analyze This Sermon
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-40 px-4 text-center">
            <WifiOff className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Stream Offline</h3>
            <p className="text-muted-foreground mb-4">The streamer is not currently live. Please check back later.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}