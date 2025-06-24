import { useState, useEffect } from 'react';
import { 
  Search, 
  FileText, 
  Loader2, 
  SlidersHorizontal, 
  SortDesc, 
  SortAsc, 
  Calendar, 
  FileAudio, 
  FileVideo,
  CheckCircle,
  Clock,
  Sparkles,
  RefreshCcw // New icon for re-analyze
} from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { SermonSummary } from '@/lib/types';
import { getSermonSummaries, processSermon, getSermonProcessingStatus } from '@/lib/sermons';

interface SermonListProps {
  onSelectSermon: (sermon: SermonSummary) => void;
}

export function SermonList({ onSelectSermon }: SermonListProps) {
  const [sermons, setSermons] = useState<SermonSummary[]>([]);
  const [filteredSermons, setFilteredSermons] = useState<SermonSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [processingSermons, setProcessingSermons] = useState<Set<string>>(new Set()); // Track sermons currently being processed
  const { toast } = useToast();
  
  useEffect(() => {
    loadSermons();
  }, []);
  
  useEffect(() => {
    // Filter and sort sermons when any of these change
    filterAndSortSermons();
  }, [searchQuery, sortOrder, sermons]);
  
  const loadSermons = async () => {
    setIsLoading(true);
    try {
      const data = await getSermonSummaries();
      setSermons(data);
      setFilteredSermons(data);

      // Re-poll status for any sermon that was previously marked as processing
      data.forEach(sermon => {
        if (sermon.ai_context?.status === 'processing') {
          pollProcessingStatus(sermon.id!); 
        }
      });

    } catch (error) {
      console.error('Error loading sermons:', error);
      toast({
        title: 'Error',
        description: 'Failed to load sermon summaries',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const filterAndSortSermons = () => {
    // First filter by search query
    let filtered = sermons;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = sermons.filter(sermon => 
        sermon.title.toLowerCase().includes(query) ||
        (sermon.description && sermon.description.toLowerCase().includes(query)) ||
        (sermon.transcription_text && sermon.transcription_text.toLowerCase().includes(query))
      );
    }
    
    // Then sort by date
    filtered = [...filtered].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    
    setFilteredSermons(filtered);
  };
  
  const getSermonStatus = (sermon: SermonSummary) => {
    const status = sermon.ai_context?.status;
    
    if (!status) {
      return {
        label: 'Unknown',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
        icon: Clock
      };
    }
    
    if (status === 'completed') {
      return {
        label: 'Complete',
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        icon: CheckCircle
      };
    }
    
    if (status.includes('processing')) {
      return {
        label: 'Processing',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        icon: Loader2
      };
    }
    
    if (status === 'error') {
      return {
        label: 'Error',
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        icon: Clock
      };
    }
    
    return {
      label: status,
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
      icon: Clock
    };
  };

  const pollProcessingStatus = async (sermonId: string) => {
    if (processingSermons.has(sermonId)) {
      // Already polling this sermon
      return;
    }

    setProcessingSermons(prev => new Set(prev).add(sermonId));

    const checkStatus = async () => {
      try {
        const { data: statusData, error: statusError } = await getSermonProcessingStatus(sermonId);
        
        if (statusError) {
          throw statusError;
        }
  
        const status = statusData; // ai_context is returned directly now
        
        if (status?.status === 'completed') {
          toast({
            title: 'Analysis Complete',
            description: `Sermon analysis for ${sermonId} is complete!`,
          });
          // Remove from processing set and reload sermons
          setProcessingSermons(prev => {
            const newSet = new Set(prev);
            newSet.delete(sermonId);
            return newSet;
          });
          loadSermons(); 
          return;
        } else if (status?.status === 'error') {
          toast({
            title: 'Analysis Failed',
            description: `Sermon analysis for ${sermonId} failed: ${status.error || 'Unknown error'}`,
            variant: 'destructive',
          });
          // Remove from processing set and reload sermons
          setProcessingSermons(prev => {
            const newSet = new Set(prev);
            newSet.delete(sermonId);
            return newSet;
          });
          loadSermons();
          return;
        } else { // Still processing
          // Update the specific sermon's status in the list without full reload
          setSermons(prevSermons => 
            prevSermons.map(s => 
              s.id === sermonId 
                ? { ...s, ai_context: { ...s.ai_context, status: 'processing', step: status?.step || '' } } 
                : s
            )
          );
        }
        
        // Continue polling
        setTimeout(checkStatus, 5000); // Poll every 5 seconds

      } catch (error) {
        console.error(`Error polling status for ${sermonId}:`, error);
        toast({
          title: 'Polling Error',
          description: `Failed to check status for sermon ${sermonId}`,
          variant: 'destructive',
        });
        // Remove from processing set on polling error
        setProcessingSermons(prev => {
            const newSet = new Set(prev);
            newSet.delete(sermonId);
            return newSet;
        });
        loadSermons(); // Reload to show potential error status
      }
    };

    setTimeout(checkStatus, 1000); // Start polling after 1 second
  };

  const handleReanalyze = async (sermon: SermonSummary) => {
    if (!sermon.id || !sermon.storage_file_path) {
      toast({
        title: 'Cannot Re-analyze',
        description: 'Sermon ID or stored file path is missing.',
        variant: 'destructive',
      });
      return;
    }

    // Prevent re-triggering if already processing
    if (processingSermons.has(sermon.id)) {
      toast({
        title: 'Already Processing',
        description: 'This sermon is already being re-analyzed.',
        variant: 'default',
      });
      return;
    }

    try {
      toast({
        title: 'Re-analysis Initiated',
        description: `Re-processing sermon: ${sermon.title}. Please wait...`,
      });
      
      // Optimistically update the UI to show processing
      setSermons(prevSermons => 
        prevSermons.map(s => 
            s.id === sermon.id 
                ? { ...s, ai_context: { status: 'processing', step: 'reanalyzing' } } 
                : s
        )
      );
      setProcessingSermons(prev => new Set(prev).add(sermon.id!));

      // Call the process function
      await processSermon(sermon.id, sermon.storage_file_path);
      
      // Start polling for the status of this specific sermon
      pollProcessingStatus(sermon.id);

    } catch (error) {
      console.error('Error re-analyzing sermon:', error);
      toast({
        title: 'Re-analysis Failed',
        description: error.message || 'Failed to re-analyze sermon.',
        variant: 'destructive',
      });
       // Revert status on error
      setSermons(prevSermons => 
        prevSermons.map(s => 
            s.id === sermon.id 
                ? { ...s, ai_context: { status: 'error', error: error.message || 'Re-analysis failed' } } 
                : s
        )
      );
      setProcessingSermons(prev => { const newSet = new Set(prev); newSet.delete(sermon.id!); return newSet; });
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search sermons..."
            className="pl-9"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="shrink-0"
          >
            {sortOrder === 'desc' ? <SortDesc className="h-4 w-4" /> : <SortAsc className="h-4 w-4" />}
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={loadSermons}
            className="shrink-0"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredSermons.length > 0 ? (
        <div className="space-y-4">
          {filteredSermons.map(sermon => {
            const status = getSermonStatus(sermon);
            const StatusIcon = status.icon;
            const isSermonProcessing = processingSermons.has(sermon.id!);
            
            return (
              <Card 
                key={sermon.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle 
                      className="text-xl flex-grow" 
                      onClick={() => onSelectSermon(sermon)}
                    >
                      {sermon.title}
                    </CardTitle>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`${status.color} ${status.label === 'Processing' ? 'animate-pulse' : ''}`}>
                        <StatusIcon className={`h-3 w-3 mr-1 ${status.label === 'Processing' ? 'animate-spin' : ''}`} />
                        {status.label}
                      </Badge>
                      
                      {/* Re-analyze Button */}
                      {sermon.storage_file_path && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent card click event
                            handleReanalyze(sermon);
                          }}
                          disabled={isSermonProcessing} // Disable if already processing
                          title={isSermonProcessing ? "Sermon is being processed" : "Re-analyze sermon with AI"}
                        >
                          {isSermonProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCcw className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  {sermon.description && (
                    <CardDescription>{sermon.description}</CardDescription>
                  )}
                </CardHeader>
                
                <CardContent onClick={() => onSelectSermon(sermon)}>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {sermon.sermon_date && (
                      <Badge variant="outline" className="bg-muted/50 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(sermon.sermon_date), 'MMM d, yyyy')}
                      </Badge>
                    )}
                    
                    {sermon.audio_url && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                        <FileAudio className="h-3 w-3 mr-1" />
                        Audio
                      </Badge>
                    )}
                    
                    {sermon.video_url && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800">
                        <FileVideo className="h-3 w-3 mr-1" />
                        Video
                      </Badge>
                    )}
                    
                    {sermon.summary_text && (
                      <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
                        <Sparkles className="h-3 w-3 mr-1" />
                        AI Summary
                      </Badge>
                    )}
                  </div>
                  
                  {/* Preview of transcript/summary */}
                  {sermon.summary_text ? (
                    <p className="text-muted-foreground line-clamp-2">{sermon.summary_text}</p>
                  ) : sermon.transcription_text ? (
                    <p className="text-muted-foreground line-clamp-2">{sermon.transcription_text}</p>
                  ) : (
                    <p className="text-muted-foreground italic">
                      {status.label === 'Processing' ? 'Processing sermon...' : 'No content available yet'}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Sermons Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? `No sermons match "${searchQuery}"`
                : "You haven't processed any sermons yet"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}