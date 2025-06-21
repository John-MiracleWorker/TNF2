import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, BookOpen, Heart, MessageSquare, RefreshCw, ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { getContentRecommendations, markRecommendationViewed, generateContentRecommendations } from '@/lib/content-recommendations';
import { ContentRecommendation } from '@/lib/types';

interface MoodBasedRecommendationsProps {
  className?: string;
  timeRange?: 'week' | 'month' | 'quarter';
}

export function MoodBasedRecommendations({ className, timeRange = 'month' }: MoodBasedRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<ContentRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    setIsLoading(true);
    try {
      const data = await getContentRecommendations();
      setRecommendations(data);
    } catch (error) {
      console.error('Error loading recommendations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load personalized recommendations',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateRecommendations = async () => {
    setIsGenerating(true);
    try {
      const success = await generateContentRecommendations(timeRange);
      if (success) {
        await loadRecommendations();
        toast({
          title: 'Success',
          description: 'New recommendations generated based on your journal entries',
        });
      } else {
        toast({
          title: 'No New Recommendations',
          description: 'Unable to generate new recommendations. Try adding more journal entries.',
        });
      }
    } catch (error) {
      console.error('Error generating recommendations:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate recommendations',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleView = async (recommendation: ContentRecommendation) => {
    try {
      // Mark as viewed
      await markRecommendationViewed(recommendation.id!);
      
      // Remove from UI
      setRecommendations(prev => prev.filter(r => r.id !== recommendation.id));
    } catch (error) {
      console.error('Error marking recommendation as viewed:', error);
    }
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'devotional':
      case 'ai_devotional':
        return <Heart className="h-5 w-5 text-rose-500" />;
      case 'bible_study':
        return <BookOpen className="h-5 w-5 text-blue-500" />;
      case 'scripture':
        return <BookOpen className="h-5 w-5 text-green-500" />;
      default:
        return <MessageSquare className="h-5 w-5 text-primary" />;
    }
  };

  const getContentPath = (recommendation: ContentRecommendation) => {
    switch (recommendation.content_type) {
      case 'devotional':
        return `/devotionals?id=${recommendation.content_id}`;
      case 'ai_devotional':
        return `/devotionals?id=${recommendation.content_id}`;
      case 'bible_study':
        return `/bible-study?id=${recommendation.content_id}`;
      case 'scripture':
        return `/scripture-memory?id=${recommendation.content_id}`;
      default:
        return '/dashboard';
    }
  };

  const getContentTypeBadge = (type: string) => {
    switch (type) {
      case 'devotional':
        return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800">Devotional</Badge>;
      case 'ai_devotional':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800">AI Devotional</Badge>;
      case 'bible_study':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">Bible Study</Badge>;
      case 'scripture':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800">Scripture</Badge>;
      default:
        return <Badge variant="outline">Content</Badge>;
    }
  };

  return (
    <Card className={`border-secondary/20 ${className || ''}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-secondary" />
            <span>Personalized For You</span>
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleGenerateRecommendations}
            disabled={isGenerating}
            className="h-8"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Refresh
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : recommendations.length > 0 ? (
          <div className="space-y-3">
            {recommendations.map((recommendation) => (
              <motion.div
                key={recommendation.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Link 
                  to={getContentPath(recommendation)} 
                  className="block"
                  onClick={() => handleView(recommendation)}
                >
                  <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/5 transition-colors">
                    <div className="mt-1 bg-secondary/10 p-2 rounded-full flex-shrink-0">
                      {getContentIcon(recommendation.content_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-foreground truncate">{recommendation.title}</h3>
                        {getContentTypeBadge(recommendation.content_type)}
                      </div>
                      <p className="text-muted-foreground text-sm line-clamp-2 mt-1">{recommendation.description}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">
              No personalized recommendations available yet. 
              Add more journal entries to get content tailored to your mood and spiritual state.
            </p>
            <Button onClick={handleGenerateRecommendations} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Recommendations
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
      
      {recommendations.length > 0 && (
        <CardFooter className="pt-0">
          <p className="text-xs text-muted-foreground italic">
            Recommendations based on your journal entries and mood trends
          </p>
        </CardFooter>
      )}
    </Card>
  );
}