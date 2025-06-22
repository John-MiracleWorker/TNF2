import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Youtube, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Calendar,
  Settings,
  ToggleLeft,
  Clock
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { callEdgeFunction } from '@/lib/supabase-functions';
import { format, parseISO } from 'date-fns';

// Type definitions for channel monitoring
interface MonitoredChannel {
  id: string;
  channel_id: string;
  platform: string;
  channel_name: string;
  is_active: boolean;
  last_checked_at?: string;
  last_processed_at?: string;
  last_video_id?: string;
  created_at?: string;
}

interface ProcessingResult {
  channelId: string;
  status: string;
  message: string;
  videoId?: string;
  sermonId?: string;
  details?: any;
}

export function AutoSermonProcessor() {
  const [channels, setChannels] = useState<MonitoredChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newChannelId, setNewChannelId] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [processingResults, setProcessingResults] = useState<ProcessingResult[]>([]);
  const [activeTab, setActiveTab] = useState('channels');
  const { toast } = useToast();

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('monitored_channels')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      setChannels(data || []);
    } catch (error) {
      console.error('Error loading monitored channels:', error);
      toast({
        title: 'Error',
        description: 'Failed to load monitored channels',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addChannel = async () => {
    if (!newChannelId.trim()) {
      toast({
        title: 'Error',
        description: 'Channel ID is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Extract channel ID from URL if a URL was pasted
      let channelId = newChannelId.trim();
      
      if (channelId.includes('youtube.com')) {
        // Try to extract channel ID from URL
        const urlObj = new URL(channelId);
        
        if (urlObj.pathname.includes('/channel/')) {
          channelId = urlObj.pathname.split('/channel/')[1].split('/')[0];
        } else if (urlObj.pathname.includes('/c/') || urlObj.pathname.includes('/@')) {
          // For custom URLs, we can't extract the channel ID directly
          // We'd need to use the YouTube API, but for simplicity we'll ask the user for the ID
          toast({
            title: 'Channel ID Required',
            description: 'Please enter the actual channel ID (starts with "UC")',
            variant: 'destructive',
          });
          return;
        }
      }
      
      // Validate channel ID format (for YouTube)
      if (!/^UC[\w-]{22}$/.test(channelId)) {
        toast({
          title: 'Invalid Channel ID',
          description: 'Please enter a valid YouTube channel ID (starts with "UC" followed by 22 characters)',
          variant: 'destructive',
        });
        return;
      }

      const { data, error } = await supabase
        .from('monitored_channels')
        .insert([
          { 
            channel_id: channelId, 
            platform: 'youtube',
            channel_name: newChannelName.trim() || 'YouTube Channel',
            is_active: true
          }
        ])
        .select()
        .single();
      
      if (error) {
        // Handle unique constraint violation
        if (error.code === '23505') {
          toast({
            title: 'Channel Already Exists',
            description: 'This channel is already being monitored',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
      } else {
        // Success
        setChannels([data, ...channels]);
        setNewChannelId('');
        setNewChannelName('');
        
        toast({
          title: 'Channel Added',
          description: 'The channel has been added for sermon monitoring',
        });
      }
    } catch (error) {
      console.error('Error adding channel:', error);
      toast({
        title: 'Error',
        description: 'Failed to add monitored channel',
        variant: 'destructive',
      });
    }
  };

  const deleteChannel = async (id: string) => {
    try {
      const { error } = await supabase
        .from('monitored_channels')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      // Update the state
      setChannels(channels.filter(channel => channel.id !== id));
      
      toast({
        title: 'Channel Removed',
        description: 'The channel has been removed from monitoring',
      });
    } catch (error) {
      console.error('Error deleting channel:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove channel',
        variant: 'destructive',
      });
    }
  };

  const toggleChannelActive = async (channel: MonitoredChannel) => {
    try {
      const { error } = await supabase
        .from('monitored_channels')
        .update({ is_active: !channel.is_active })
        .eq('id', channel.id);
      
      if (error) {
        throw error;
      }
      
      // Update the state
      setChannels(channels.map(c => 
        c.id === channel.id ? { ...c, is_active: !c.is_active } : c
      ));
      
      toast({
        title: channel.is_active ? 'Channel Paused' : 'Channel Activated',
        description: channel.is_active 
          ? 'The channel will no longer be monitored' 
          : 'The channel will now be monitored for sermons',
      });
    } catch (error) {
      console.error('Error updating channel status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update channel status',
        variant: 'destructive',
      });
    }
  };

  const checkForNewSermons = async () => {
    setIsProcessing(true);
    setProcessingResults([]);
    
    try {
      // Get all active channel IDs
      const activeChannelIds = channels
        .filter(channel => channel.is_active)
        .map(channel => channel.channel_id);
      
      if (activeChannelIds.length === 0) {
        toast({
          title: 'No Active Channels',
          description: 'There are no active channels to check',
          variant: 'destructive',
        });
        setIsProcessing(false);
        return;
      }

      // Call the livestream-monitor Edge Function
      const data = await callEdgeFunction(
        'livestream-monitor',
        {
          channelIds: activeChannelIds,
          force: false,
        },
        { authenticated: true, timeoutMs: 30000 }
      );
      
      // Process results
      setProcessingResults(data.results || []);
      
      // Update channels with last checked timestamp
      const now = new Date().toISOString();
      setChannels(channels.map(c => ({
        ...c,
        last_checked_at: c.is_active ? now : c.last_checked_at
      })));
      
      // Display toast message
      const processedCount = data.processed || 0;
      
      if (processedCount > 0) {
        toast({
          title: 'Sermons Found',
          description: `Found ${processedCount} new sermon(s) to process!`,
        });
      } else {
        toast({
          title: 'No New Sermons',
          description: 'No new sermons found to process',
        });
      }

    } catch (error) {
      console.error('Error checking for new sermons:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to check for new sermons',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Youtube className="h-5 w-5 text-primary mr-2" />
          Sermon Analysis Automation
        </CardTitle>
        <CardDescription>
          Monitor YouTube channels and automatically process sermons from livestreams
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="channels" className="flex items-center gap-2">
              <Youtube className="h-4 w-4" />
              <span>Monitored Channels</span>
            </TabsTrigger>
            <TabsTrigger value="status" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span>Processing Status</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="channels" className="mt-4 space-y-4">
            {/* Add Channel Form */}
            <div className="space-y-2">
              <Label htmlFor="channel-id">Add YouTube Channel</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="space-y-1 flex-1">
                  <Input 
                    id="channel-id"
                    placeholder="Channel ID (e.g., UC...)" 
                    value={newChannelId}
                    onChange={e => setNewChannelId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the YouTube channel ID (starts with "UC")
                  </p>
                </div>
                
                <div className="flex-1">
                  <Input 
                    placeholder="Channel Name (optional)" 
                    value={newChannelName}
                    onChange={e => setNewChannelName(e.target.value)}
                  />
                </div>
                
                <Button 
                  onClick={addChannel}
                  className="shrink-0"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Channel
                </Button>
              </div>
            </div>
            
            {/* Channel List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Monitored Channels</h3>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={loadChannels}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh
                </Button>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : channels.length > 0 ? (
                <div className="space-y-3">
                  {channels.map(channel => (
                    <motion.div
                      key={channel.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className={`${channel.is_active ? '' : 'bg-muted/10'}`}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <Youtube className="h-4 w-4 text-red-500" />
                                <h4 className="text-base font-medium">{channel.channel_name}</h4>
                                {!channel.is_active && (
                                  <Badge variant="outline" className="bg-muted text-muted-foreground">
                                    Paused
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="text-sm text-muted-foreground mt-1">
                                ID: {channel.channel_id}
                              </div>
                              
                              <div className="flex flex-wrap gap-2 mt-2">
                                {channel.last_checked_at && (
                                  <div className="text-xs text-muted-foreground flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Last checked: {format(parseISO(channel.last_checked_at), 'MMM d, yyyy h:mm a')}
                                  </div>
                                )}
                                
                                {channel.last_processed_at && (
                                  <div className="text-xs text-muted-foreground flex items-center ml-3">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    Last processed: {format(parseISO(channel.last_processed_at), 'MMM d, yyyy h:mm a')}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <div className="flex items-center space-x-2 mr-2">
                                <Switch
                                  checked={channel.is_active}
                                  onCheckedChange={() => toggleChannelActive(channel)}
                                />
                                <span className="text-sm">
                                  {channel.is_active ? 'Active' : 'Paused'}
                                </span>
                              </div>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Monitored Channel</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this channel? This channel will no longer be monitored for new sermons.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteChannel(channel.id)}
                                      className="bg-red-500 hover:bg-red-600"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border rounded-md border-dashed">
                  <Youtube className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No Monitored Channels</h3>
                  <p className="text-muted-foreground mb-4">
                    Add YouTube channels to automatically monitor for new sermons.
                  </p>
                </div>
              )}
            </div>
            
            <div className="pt-2">
              <Button 
                variant="default" 
                onClick={checkForNewSermons}
                disabled={isProcessing || channels.filter(c => c.is_active).length === 0}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking for sermons...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Check for New Sermons
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="status" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Processing Status</h3>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setProcessingResults([])}
                disabled={processingResults.length === 0}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
            
            {processingResults.length > 0 ? (
              <div className="space-y-4">
                {processingResults.map((result, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 ${
                      result.status === 'error' || result.status === 'processing_error'
                        ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900'
                        : result.status === 'processing_started'
                          ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900'
                          : 'bg-muted/20 border-muted'
                    }`}
                  >
                    <div className="flex items-start">
                      {result.status === 'error' || result.status === 'processing_error' ? (
                        <AlertTriangle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                      ) : result.status === 'processing_started' ? (
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                      ) : result.status === 'live' ? (
                        <Youtube className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-muted-foreground mr-2 mt-0.5" />
                      )}
                      
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h4 className="font-medium">Channel: {result.channelId}</h4>
                          <Badge variant="outline" className={`
                            ${result.status === 'error' || result.status === 'processing_error'
                              ? 'bg-red-100 text-red-800 border-red-300'
                              : result.status === 'processing_started'
                                ? 'bg-green-100 text-green-800 border-green-300'
                                : result.status === 'live'
                                  ? 'bg-red-100 text-red-800 border-red-300'
                                  : 'bg-gray-100 text-gray-800 border-gray-300'
                            }`}
                          >
                            {result.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        
                        <p className="text-sm">
                          {result.message}
                        </p>
                        
                        {result.videoId && (
                          <div className="mt-2 text-sm">
                            <a 
                              href={`https://www.youtube.com/watch?v=${result.videoId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center"
                            >
                              <Youtube className="h-3.5 w-3.5 mr-1" />
                              Video: {result.videoId}
                            </a>
                          </div>
                        )}
                        
                        {result.sermonId && (
                          <div className="mt-1 text-sm">
                            <span className="text-green-600 flex items-center">
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />
                              Sermon ID: {result.sermonId}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : isProcessing ? (
              <div className="flex justify-center py-8">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Checking for new sermons...</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 border rounded-md border-dashed">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Processing Results</h3>
                <p className="text-muted-foreground mb-4">
                  Check for new sermons to see processing results.
                </p>
                <Button 
                  onClick={checkForNewSermons}
                  disabled={channels.filter(c => c.is_active).length === 0}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Check Now
                </Button>
              </div>
            )}
            
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 dark:bg-blue-950/30 dark:border-blue-900">
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                How Automatic Processing Works
              </h4>
              <ul className="space-y-1 text-sm text-blue-700 dark:text-blue-400">
                <li className="flex items-start">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mt-1.5 mr-2"></div>
                  <span>The system checks monitored channels every 15 minutes</span>
                </li>
                <li className="flex items-start">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mt-1.5 mr-2"></div>
                  <span>When a livestream ends, the sermon processing begins automatically</span>
                </li>
                <li className="flex items-start">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mt-1.5 mr-2"></div>
                  <span>The audio is transcribed and analyzed using AI</span>
                </li>
                <li className="flex items-start">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mt-1.5 mr-2"></div>
                  <span>The processed sermon becomes available to all users</span>
                </li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}