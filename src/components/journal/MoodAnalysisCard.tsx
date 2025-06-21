import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Brain, DivideIcon as LucideIcon, Book, Calendar, BookOpen, Heart, ArrowRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { generateContentRecommendations } from '@/lib/content-recommendations';

interface MoodAnalysisCardProps {
  onAnalysisComplete?: () => void;
  className?: string;
}

export function MoodAnalysisCard({ onAnalysisComplete, className }: MoodAnalysisCardProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const success = await generateContentRecommendations('month');
      
      if (success) {
        toast({
          title: 'Analysis Complete',
          description: 'Your journal has been analyzed and new content recommendations are ready.',
        });
        
        if (onAnalysisComplete) {
          onAnalysisComplete();
        }
      } else {
        toast({
          title: 'Analysis Incomplete',
          description: 'Unable to fully analyze your journal. Try adding more entries.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error analyzing journal:', error);
      toast({
        title: 'Analysis Failed',
        description: 'Something went wrong during analysis. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Sample recommended content types with icons
  const recommendedTypes = [
    { name: 'Scripture Meditation', icon: BookOpen, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' },
    { name: 'Prayer Exercise', icon: Heart, color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/20 dark:text-rose-300' },
    { name: 'Reflective Reading', icon: Book, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300' }
  ];

  return (
    <Card className={`border-secondary/20 ${className || ''}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center">
          <Sparkles className="h-5 w-5 text-secondary mr-2" />
          <span>Journal Analysis</span>
        </CardTitle>
        <CardDescription>
          Get personalized content based on your journal entries and emotional patterns
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Our AI can analyze your journal entries to understand your current emotional and spiritual state, 
            then recommend content specifically tailored to your needs.
          </p>
          
          <div className="space-y-2 bg-muted/30 p-3 rounded-lg">
            <h3 className="text-sm font-medium flex items-center">
              <Brain className="h-4 w-4 text-muted-foreground mr-2" />
              Recommended Content Types:
            </h3>
            <div className="flex flex-wrap gap-2">
              {recommendedTypes.map((type, i) => {
                const Icon = type.icon;
                return (
                  <Badge key={i} variant="outline" className={`${type.color}`}>
                    <Icon className="h-3 w-3 mr-1" />
                    {type.name}
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={handleAnalyze}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Analyze Journal
            </>
          )}
        </Button>
        
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard">
            View Recommendations
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}