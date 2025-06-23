import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, Video, Sparkles, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button'; // Assuming Button is in ui
import { Badge } from '@/components/ui/badge'; // Assuming Badge is in ui
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

import { SermonSummary } from '@/lib/types'; // Assuming SermonSummary is in types

// Assuming PastStream is defined in LiveStreamPage.tsx or a shared types file
// If defined elsewhere, adjust the import path accordingly.
import { PastStream } from '@/pages/LiveStreamPage';

interface PastStreamItemProps {
  stream: PastStream;
}

const PastStreamItem: React.FC<PastStreamItemProps> = ({ stream }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<SermonSummary | null>(null); // Use SermonSummary type

  useEffect(() => {
    // Initialize AI analysis results if the stream/sermon already has them
    // Assuming PastStream can have summary_text and follow_up_questions fields like SermonSummary
    if (stream.summary_text || stream.follow_up_questions || (stream.ai_context?.key_points && stream.ai_context.key_points.length > 0)) {
      setAiAnalysisResult(stream as any); // Cast assuming schema similarity
    }
  }, [stream]);

  const handleAnalyzeWithAI = async () => {
    console.log(`Analyzing sermon with ID: ${stream.id}`);

    if (!stream.id) {
      toast({
        title: 'Error',
        description: 'Cannot analyze stream without an ID.',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);

    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      toast({ title: 'Error', description: 'You must be logged in to analyze sermons.', variant: 'destructive' });
      setIsAnalyzing(false);
      return;
    }

    try {
      const response = await fetch('/.netlify/functions/process-sermon', { // Use your actual endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`, // Include auth token
        },
        body: JSON.stringify({ sermon_id: stream.id }), // Send stream ID as sermon_id
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze stream with AI');
      }

      // Since the function updates the DB, we might need to refetch the stream or rely on real-time updates
      // For simplicity now, we'll just show a success toast.
      // A more robust solution would update the stream state or use Supabase Realtime.
      toast({
        title: 'Analysis Triggered',
        description: 'AI analysis has started. You can view results on the Bible Study page once complete.',
      });

    } catch (error: any) {
      console.error('Error analyzing stream with AI:', error);
      const errorMessage = error.message || 'Failed to trigger AI analysis.';
      toast({
        title: 'Analysis Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div key={stream.id} className="flex gap-4 border-b pb-4 last:border-0 last:pb-0">
      {stream.thumbnail && (
        <div className="w-32 h-20 rounded-md overflow-hidden shrink-0 hidden sm:block">
          <img
            src={stream.thumbnail}
            alt={stream.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="flex-grow">
        <h3 className="font-medium text-foreground">{stream.title}</h3>
        <p className="text-muted-foreground text-sm line-clamp-2 mt-1">{stream.description}</p>
        <div className="flex items-center mt-2">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground mr-1" />
          <span className="text-xs text-muted-foreground">
            {format(stream.publishedAt, 'MMM d, yyyy')}
          </span>
        </div>
      </div>
      <div className="shrink-0 flex flex-col space-y-2">
        <Button variant="outline" size="sm" onClick={() => window.open(`https://www.youtube.com/watch?v=${stream.id}`, '_blank')}>
          <Video className="h-4 w-4 mr-2" />
          Watch Again
        </Button>
         <Button
            variant="secondary"
            size="sm"
            onClick={handleAnalyzeWithAI}
            disabled={isAnalyzing} // Disable while analyzing
          >
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
          </Button>
      </div>
    </div>
  );
};

export default PastStreamItem;