import { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { 
  BookOpen, 
  Calendar, 
  ChevronRight, 
  Clock, 
  CheckCircle,
  Bookmark,
  BookText
} from 'lucide-react';
import { ReadingPlan, ReadingProgress, startReadingPlan } from '@/lib/reading-plans';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

interface BibleReadingPlanCardProps {
  plan: ReadingPlan;
  progress?: ReadingProgress | null;
  onStartPlan?: (plan: ReadingPlan) => void;
  onContinuePlan?: (plan: ReadingPlan, progress: ReadingProgress) => void;
}

export function BibleReadingPlanCard({ 
  plan, 
  progress, 
  onStartPlan, 
  onContinuePlan 
}: BibleReadingPlanCardProps) {
  const [isStarting, setIsStarting] = useState(false);
  const { toast } = useToast();
  
  // Determine progress percentage
  const progressPercent = progress 
    ? Math.round((progress.current_day - 1) / plan.duration_days * 100) 
    : 0;
  
  // Get theme icon and color
  const getThemeStyles = () => {
    switch (plan.theme?.toLowerCase()) {
      case 'prayer':
        return { icon: Bookmark, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' };
      case 'worship':
        return { icon: BookOpen, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' };
      case 'wisdom':
        return { icon: BookText, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' };
      case 'renewal':
        return { icon: BookOpen, color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' };
      case 'new-testament':
        return { icon: BookOpen, color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300' };
      default:
        return { icon: BookOpen, color: 'bg-secondary/10 text-secondary' };
    }
  };
  
  const { icon: ThemeIcon, color: themeColor } = getThemeStyles();
  
  const handleStartPlan = async () => {
    if (progress) {
      onContinuePlan?.(plan, progress);
      return;
    }
    
    setIsStarting(true);
    try {
      const newProgress = await startReadingPlan(plan.id);
      
      if (newProgress) {
        toast({
          title: 'Reading Plan Started',
          description: `You've started the "${plan.title}" reading plan!`,
        });
        
        onStartPlan?.(plan);
      }
    } catch (error) {
      console.error('Error starting reading plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to start the reading plan. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsStarting(false);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="h-full flex flex-col overflow-hidden hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <Badge variant="outline" className={`capitalize ${themeColor}`}>
                  <ThemeIcon className="h-3 w-3 mr-1" />
                  {plan.theme || 'Bible Study'}
                </Badge>
                {plan.is_premium && (
                  <Badge className="bg-secondary text-secondary-foreground">
                    Premium
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg text-foreground">{plan.title}</CardTitle>
            </div>
            <Badge variant="outline" className="flex items-center bg-muted/40">
              <Clock className="h-3 w-3 mr-1" />
              {plan.duration_days} days
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="pb-2 flex-grow">
          <p className="text-muted-foreground text-sm line-clamp-3 mb-3">
            {plan.description}
          </p>
          
          {progress && (
            <div className="space-y-1 mt-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">
                  Day {progress.current_day - 1} of {plan.duration_days}
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
              
              <div className="flex justify-between items-center text-xs mt-1">
                {progress.last_completed_date ? (
                  <span className="text-muted-foreground">
                    Last read: {format(new Date(progress.last_completed_date), 'MMM d')}
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Started: {format(new Date(progress.start_date!), 'MMM d')}
                  </span>
                )}
                
                {progress.is_completed && (
                  <span className="flex items-center text-green-600 dark:text-green-400">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Completed
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="pt-2">
          <Button 
            onClick={handleStartPlan} 
            disabled={isStarting}
            className={progress ? "w-full" : "w-full"}
            variant={progress ? "default" : "secondary"}
          >
            {isStarting ? (
              'Starting...'
            ) : progress ? (
              <>
                {progress.is_completed ? 'Review Plan' : 'Continue Reading'}
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                Start Plan
                <Calendar className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}