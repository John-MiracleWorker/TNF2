import { useState } from 'react';
import { PenLine, Loader2 } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { SpiritualGoal, GoalReflection } from '@/lib/types';
import { saveGoalReflection, getAIFeedbackOnReflection } from '@/lib/spiritual-goals';

interface GoalReflectionDialogProps {
  goal: SpiritualGoal;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onReflectionSaved?: () => void;
}

export function GoalReflectionDialog({ 
  goal, 
  open, 
  onOpenChange,
  onReflectionSaved 
}: GoalReflectionDialogProps) {
  const [reflectionContent, setReflectionContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiFeedback, setAIFeedback] = useState<string | null>(null);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!reflectionContent.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your reflection',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Save the reflection
      const reflection: GoalReflection = {
        goal_id: goal.id,
        content: reflectionContent,
      };
      
      await saveGoalReflection(reflection);
      
      toast({
        title: 'Reflection Saved',
        description: 'Your reflection has been saved successfully',
      });
      
      // Reset form
      setReflectionContent('');
      setAIFeedback(null);
      
      // Close dialog
      if (onOpenChange) {
        onOpenChange(false);
      }
      
      // Notify parent
      if (onReflectionSaved) {
        onReflectionSaved();
      }
    } catch (error) {
      console.error('Error saving reflection:', error);
      toast({
        title: 'Error',
        description: 'Failed to save your reflection',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGetAIFeedback = async () => {
    if (!reflectionContent.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your reflection first',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingFeedback(true);
    try {
      const feedback = await getAIFeedbackOnReflection(goal.id!, reflectionContent);
      
      if (feedback) {
        setAIFeedback(feedback);
      } else {
        toast({
          title: 'No Feedback Available',
          description: 'Unable to generate AI feedback at this time',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error getting AI feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to get AI feedback',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingFeedback(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <PenLine className="mr-2 h-4 w-4" />
          Add Reflection
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Reflect on Your Goal</DialogTitle>
          <DialogDescription>
            Share your thoughts, progress, and insights about your spiritual goal
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="bg-muted/30 p-4 rounded-lg">
            <h3 className="font-medium text-foreground mb-1">{goal.title}</h3>
            <p className="text-sm text-muted-foreground">{goal.description}</p>
          </div>
          
          <div className="space-y-2">
            <Textarea
              placeholder="Share your reflections on this goal. How are you progressing? What have you learned? What challenges are you facing?"
              value={reflectionContent}
              onChange={(e) => setReflectionContent(e.target.value)}
              rows={6}
              className="resize-none"
            />
          </div>
          
          {aiFeedback && (
            <div className="bg-secondary/10 p-4 rounded-lg border border-secondary/20">
              <h4 className="font-medium text-secondary mb-2">Spiritual Insight</h4>
              <p className="text-foreground/80">{aiFeedback}</p>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleGetAIFeedback}
            disabled={isGeneratingFeedback || !reflectionContent.trim()}
            className="sm:mr-auto"
          >
            {isGeneratingFeedback ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Getting Feedback...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Get AI Feedback
              </>
            )}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange?.(false)}
          >
            Cancel
          </Button>
          
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !reflectionContent.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Reflection'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}