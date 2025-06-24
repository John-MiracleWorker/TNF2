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
  Sparkles,
  FileAudio,
  FileVideo,
  CalendarClock,
  Clock,
  Loader2,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
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
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

import { SermonSummary } from '@/lib/types';
import {
  deleteSermonSummary,
  getSermonProcessingStatus,
} from '@/lib/sermons';

interface SermonDetailProps {
  sermon: SermonSummary;
  onDelete?: (id: string) => void;
}

export function SermonDetail({ sermon, onDelete }: SermonDetailProps) {
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [processing, setProcessing] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);

  useEffect(() => {
    if (
      sermon.ai_context?.status === 'processing' ||
      sermon.ai_context?.status === 'processing_started'
    ) {
      setProcessing(true);
      startStatusPolling();
    } else {
      setProcessing(false);
    }
  }, [sermon]);

  useEffect(() => {
    if (sermon.summary_text || sermon.follow_up_questions) {
      setAiAnalysisResult({
        summary: sermon.summary_text,
        key_points: sermon.ai_context?.key_points,
        followUpQuestions: sermon.follow_up_questions,
      });
    }
  }, [sermon]);

  const startStatusPolling = async () => {
    if (!sermon.id) return;

    try {
      const status = await getSermonProcessingStatus(sermon.id);

      if (status?.status === 'completed') {
        setProcessing(false);
        setProcessingStatus('Processing complete!');
        window.location.reload();
        return;
      }
      if (status?.status === 'error') {
        setProcessing(false);
        setProcessingStatus(`Error: ${status.error || 'Unknown error'}`);
        return;
      }
      if (status?.step) {
        const statusMessage: Record<string, string> = {
          started: 'Starting processing...',
          file_downloaded: 'Preparing audio for transcription...',
          transcription_completed: 'Transcription complete. Generating AI analysis...',
        };
        setProcessingStatus(statusMessage[status.step] ?? `Processing: ${status.step}`);
      } else {
        setProcessingStatus('Processing sermon...');
      }
      setTimeout(() => startStatusPolling(), 5_000);
    } catch (error) {
      console.error('Error polling status:', error);
      setProcessingStatus('Error checking status');
    }
  };

  const handleAnalyzeWithAI = async () => {
    if (!sermon.id) {
      toast({
        title: 'Error',
        description: 'Cannot analyze sermon without an ID.',
        variant: 'destructive',
      });
      return;
    }

    const filePath = sermon.audio_url || sermon.video_url;
    if (!filePath) {
      toast({
        title: 'Error',
        description: 'Cannot analyze sermon: Audio or video file URL is not available.',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setProcessingStatus('Sending to AI for analysis...');

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      toast({
        title: 'Error',
        description: 'You must be logged in to analyze sermons.',
        variant: 'destructive',
      });
      setIsAnalyzing(false);
      return;
    }

    try {
      const response = await fetch('/.netlify/functions/process-sermon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ sermon_id: sermon.id, file_path: filePath }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to analyze sermon with AI');

      setAiAnalysisResult(data);
      setProcessingStatus('AI analysis complete!');
      toast({ title: 'Analysis Complete', description: 'AI analysis of the sermon is complete.' });
    } catch (error: any) {
      console.error('Error analyzing sermon with AI:', error);
      const errorMessage = error.message || 'Failed to analyze sermon with AI.';
      setProcessingStatus(`AI analysis failed: ${errorMessage}`);
      setAnalysisError(errorMessage);
      toast({
        title: 'Analysis Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
      if (aiAnalysisResult || processingStatus?.startsWith('AI analysis failed')) {
        setTimeout(() => setProcessingStatus(null), 5_000);
      }
    }
  };

  const handleDelete = async () => {
    if (!sermon.id) return;

    setIsDeleting(true);
    try {
      await deleteSermonSummary(sermon.id);
      toast({ title: 'Sermon Deleted', description: 'Sermon summary has been deleted' });
      onDelete?.(sermon.id);
    } catch (error) {
      console.error('Error deleting sermon:', error);
      toast({ title: 'Error', description: 'Failed to delete sermon summary', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyToClipboard = (text: string, what = 'text') => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: `${what} copied to clipboard` });
  };

  // Helpers for rendering
  const points = aiAnalysisResult?.key_points ?? sermon.ai_context?.key_points ?? [];
  const questions = aiAnalysisResult?.followUpQuestions ?? sermon.follow_up_questions ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between">
            <CardTitle className="text-2xl">{sermon.title}</CardTitle>
            <div className="flex space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAnalyzeWithAI}
                disabled={processing || isAnalyzing}
              >
                <Sparkles className="h-4 w-4 mr-2" /> Analyze with AI
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/30"
                    disabled={isDeleting}
                  >
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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

          <CardDescription>{sermon.description}</CardDescription>

          <div className="flex flex-wrap gap-2 mt-2">
            {sermon.sermon_date && (
              <Badge variant="outline" className="bg-muted/50 flex items-center gap-1">
                <CalendarClock className="h-3 w-3" />
                {format(new Date(sermon.sermon_date), 'MMMM d, yyyy')}
              </Badge>
            )}
            {sermon.created_at && (
              <Badge variant="outline" className="bg-muted/50 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Processed:{' '}
                {format(new Date(sermon.created_at), 'MMM d, yyyy')}
              </Badge>
            )}
            {sermon.audio_url && (
              <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                <FileAudio className="h-3 w-3 mr-1" /> Audio
              </Badge>
            )}
            {sermon.video_url && (
              <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800">
                <FileVideo className="h-3 w-3 mr-1" /> Video
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {(processing || isAnalyzing) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 dark:bg-blue-950/30 dark:border-blue-900">
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 text-blue-500 animate-spin mr-2" />
                <p className="text-blue-700 dark:text-blue-300">
                  {processingStatus ?? 'Processing sermon...'}
                </p>
              </div>
            </div>
          )}

          {analysisError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 dark:bg-red-950/30 dark:border-red-900">
              <p className="text-red-700 dark:text-red-300">Analysis Error: {analysisError}</p>
            </div>
          )}

          {(aiAnalysisResult?.summary || sermon.summary_text) && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-primary" /> AI-Generated Summary
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleCopyToClipboard(aiAnalysisResult?.summary ?? sermon.summary_text!, 'Summary')
                  }
                >
                  <Copy className="h-4 w-4 mr-2" /> Copy
                </Button>
              </div>
              <div className="prose dark:prose-invert max-w-none text-foreground/80">
                <p>{aiAnalysisResult?.summary ?? sermon.summary_text}</p>
              </div>
            </div>
          )}

          {points.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium flex items-center">
                  <ListChecks className="h-5 w-5 mr-2 text-primary" /> Key Points
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyToClipboard(points.join('\n- '), 'Key Points')}
                >
                  <Copy className="h-4 w-4 mr-2" /> Copy
                </Button>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <ul className="space-y-2">
                  {points.map((point: string, index: number) => (
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

          {questions.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2 text-primary" /> Discussion Questions
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyToClipboard(questions.join('\n- '), 'Questions')}
                >
                  <Copy className="h-4 w-4 mr-2" /> Copy
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {questions.map((question: string, index: number) => (
                  <div key={index} className="bg-secondary/10 rounded-lg p-3 text-sm">
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

          {sermon.transcription_text && (
            <Collapsible
              open={isTranscriptExpanded}
              onOpenChange={setIsTranscriptExpanded}
              className="border rounded-lg p-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-primary" /> Full Transcription
                </h3>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyToClipboard(sermon.transcription_text, 'Transcription')}
                  >
                    <Copy className="h-4 w-4 mr-2" /> Copy
                  </Button>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      {isTranscriptExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
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
          {(sermon.audio_url || sermon.video_url) && (
            <Button variant="outline" asChild>
              <a href={sermon.audio_url || sermon.video_url} target="_blank" rel="noopener noreferrer">
                <Download className="mr-2 h-4 w-4" /> Download {sermon.audio_url ? 'Audio' : 'Video'}
              </a>
            </Button>
          )}
          {sermon.transcription_text && (
            <Button
              variant="outline"
              onClick={() => handleCopyToClipboard(sermon.transcription_text, 'Transcription')}
            >
              <Copy className="mr-2 h-4 w-4" /> Copy Full Transcription
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
