import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  MessageSquare, 
  ListChecks, 
  Download, 
  Trash2, 
  Copy, 
  CheckCircle,
  FileAudio,
  FileVideo,
  CalendarClock,
  Clock,
  Loader2
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
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
import { useToast } from '@/hooks/use-toast';
import { SermonSummary } from '@/lib/types';
import { deleteSermonSummary, getSermonProcessingStatus } from '@/lib/sermons';

interface SermonDetailProps {
  sermon: SermonSummary;
  onDelete?: (id: string) => void;
}

export function SermonDetail({ sermon, onDelete }: SermonDetailProps) {
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [processing, setProcessing] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    // Check if sermon is still processing
    if (sermon.ai_context?.status === 'processing' || sermon.ai_context?.status === 'processing_started') {
      setProcessing(true);
      startStatusPolling();
    } else {
      setProcessing(false);
    }
  }, [sermon]);
  
  const startStatusPolling = async () => {
    if (!sermon.id) return;
    
    try {
      const status = await getSermonProcessingStatus(sermon.id);
      
      if (status?.status === 'completed') {
        setProcessing(false);
        setProcessingStatus('Processing complete!');
        
        // Reload the page to get updated sermon data
        window.location.reload();
        
        return;
      } else if (status?.status === 'error') {
        setProcessing(false);
        setProcessingStatus(`Error: ${status.error || 'Unknown error'}`);
        return;
      } else if (status?.step) {
        let statusMessage = 'Processing...';
        
        switch (status.step) {
          case 'started':
            statusMessage = 'Starting processing...';
            break;
          case 'file_downloaded':
            statusMessage = 'Preparing audio for transcription...';
            break;
          case 'transcription_completed':
            statusMessage = 'Transcription complete. Generating AI analysis...';
            break;
          default:
            statusMessage = `Processing: ${status.step}`;
        }
        
        setProcessingStatus(statusMessage);
      } else {
        setProcessingStatus('Processing sermon...');
      }
      
      // Continue polling
      setTimeout(() => startStatusPolling(), 5000);
    } catch (error) {
      console.error('Error polling status:', error);
      setProcessingStatus('Error checking status');
    }
  };
  
  const handleDelete = async () => {
    if (!sermon.id) return;
    
    setIsDeleting(true);
    try {
      await deleteSermonSummary(sermon.id);
      
      toast({
        title: 'Sermon Deleted',
        description: 'Sermon summary has been deleted',
      });
      
      if (onDelete) {
        onDelete(sermon.id);
      }
    } catch (error) {
      console.error('Error deleting sermon:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete sermon summary',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  const handleCopyToClipboard = (text: string, what: string = 'text') => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${what} copied to clipboard`,
    });
  };
  
  const formatFileSize = (url: string | undefined): string => {
    if (!url) return 'Unknown size';
    return ''; // In a real app, you might fetch the file metadata
  };
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between">
            <CardTitle className="text-2xl">{sermon.title}</CardTitle>
            
            <div className="flex space-x-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/30"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Sermon Summary</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this sermon summary? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDelete}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          
          <CardDescription>
            {sermon.description}
          </CardDescription>
          
          <div className="flex flex-wrap gap-2 mt-2">
            {sermon.sermon_date && (
              <Badge variant="outline" className="bg-muted/50 flex items-center gap-1">
                <CalendarClock className="h-3 w-3" />
                {format(new Date(sermon.sermon_date), 'MMMM d, yyyy')}
              </Badge>
            )}
            
            {sermon.created_at && (
              <Badge variant="outline" className="bg-muted/50 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Processed: {format(new Date(sermon.created_at), 'MMM d, yyyy')}
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
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Processing Status */}
          {processing && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-950/30 dark:border-blue-900">
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 text-blue-500 animate-spin mr-2" />
                <p className="text-blue-700 dark:text-blue-300">
                  {processingStatus || 'Processing sermon...'}
                </p>
              </div>
            </div>
          )}
          
          {/* Summary */}
          {sermon.summary_text ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-primary" />
                  AI-Generated Summary
                </h3>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyToClipboard(sermon.summary_text!, 'Summary')}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
              
              <div className="prose dark:prose-invert max-w-none text-foreground/80">
                <p>{sermon.summary_text}</p>
              </div>
            </div>
          ) : !processing ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 dark:bg-yellow-950/30 dark:border-yellow-900">
              <p className="text-yellow-700 dark:text-yellow-300">
                No summary available yet. The sermon may still be processing.
              </p>
            </div>
          ) : null}
          
          {/* Key Points */}
          {sermon.ai_context?.key_points && sermon.ai_context.key_points.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium flex items-center">
                  <ListChecks className="h-5 w-5 mr-2 text-primary" />
                  Key Points
                </h3>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyToClipboard(sermon.ai_context?.key_points!.join('\n- '), 'Key Points')}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
              
              <div className="bg-muted/30 rounded-lg p-4">
                <ul className="space-y-2">
                  {sermon.ai_context.key_points.map((point, index) => (
                    <li key={index} className="flex items-start">
                      <div className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center mr-2 mt-0.5 shrink-0">
                        {index + 1}
                      </div>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          {/* Discussion Questions */}
          {sermon.follow_up_questions && sermon.follow_up_questions.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2 text-primary" />
                  Discussion Questions
                </h3>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyToClipboard(sermon.follow_up_questions!.join('\n- '), 'Questions')}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sermon.follow_up_questions.map((question, index) => (
                  <div key={index} className="bg-secondary/10 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="bg-secondary/20 text-secondary rounded-full w-5 h-5 flex items-center justify-center mr-2 mt-0.5 shrink-0">
                        {index + 1}
                      </div>
                      <p>{question}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Full Transcription */}
          {sermon.transcription_text && (
            <Collapsible
              open={isTranscriptExpanded}
              onOpenChange={setIsTranscriptExpanded}
              className="border rounded-lg p-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-primary" />
                  Full Transcription
                </h3>
                
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyToClipboard(sermon.transcription_text!, 'Transcription')}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      {isTranscriptExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>
              
              <CollapsibleContent className="pt-4">
                <div className="max-h-96 overflow-y-auto bg-muted/20 p-4 rounded-lg">
                  <p className="whitespace-pre-line">{sermon.transcription_text}</p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          {/* File Download */}
          {(sermon.audio_url || sermon.video_url) && (
            <Button variant="outline" asChild>
              <a 
                href={sermon.audio_url || sermon.video_url} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Download className="mr-2 h-4 w-4" />
                Download {sermon.audio_url ? 'Audio' : 'Video'}
              </a>
            </Button>
          )}
          
          {sermon.transcription_text && (
            <Button 
              variant="outline" 
              onClick={() => handleCopyToClipboard(sermon.transcription_text!, 'Transcription')}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Full Transcription
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}