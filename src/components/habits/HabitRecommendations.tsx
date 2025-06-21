import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Check, 
  X, 
  Clock, 
  Repeat, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  AlertCircle,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from '@/hooks/use-toast';
import { getHabitRecommendations, HabitRecommendation, saveSpiritualHabit } from '@/lib/habit-recommendations';

interface HabitRecommendationsProps {
  onHabitCreated?: () => void;
}

export function HabitRecommendations({ onHabitCreated }: HabitRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<HabitRecommendation[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [customFrequency, setCustomFrequency] = useState('daily');
  const [customAmount, setCustomAmount] = useState(1);
  const { toast } = useToast();
  
  const currentRecommendation = recommendations[currentIndex];
  const hasRecommendations = recommendations.length > 0;

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getHabitRecommendations();
      setRecommendations(data);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Error loading habit recommendations:', error);
      setError('Failed to load recommendations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (frequency?: string, amount?: number) => {
    if (!currentRecommendation) return;
    
    setIsAccepting(true);
    try {
      const habit = {
        habit_name: currentRecommendation.habit_name,
        goal_frequency: frequency || currentRecommendation.recommended_frequency,
        goal_amount: amount || currentRecommendation.recommended_amount,
        is_active: true
      };
      
      await saveSpiritualHabit(habit);
      
      toast({
        title: 'Habit Added',
        description: `"${habit.habit_name}" has been added to your habits.`,
      });
      
      // Notify parent component
      onHabitCreated?.();
      
      // Move to next recommendation or remove if last
      handleNext();
    } catch (error) {
      console.error('Error accepting habit recommendation:', error);
      toast({
        title: 'Error',
        description: 'Failed to add habit. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAccepting(false);
      setIsDialogOpen(false);
    }
  };

  const handleReject = () => {
    setIsRejecting(true);
    
    // Simply remove this recommendation from the list
    setTimeout(() => {
      handleNext();
      setIsRejecting(false);
    }, 300);
  };
  
  const handleNext = () => {
    // Remove current recommendation
    const updatedRecommendations = [...recommendations];
    updatedRecommendations.splice(currentIndex, 1);
    
    // Update state
    setRecommendations(updatedRecommendations);
    
    // Adjust currentIndex if needed
    if (currentIndex >= updatedRecommendations.length && updatedRecommendations.length > 0) {
      setCurrentIndex(updatedRecommendations.length - 1);
    }
  };
  
  const handleCustomize = () => {
    if (!currentRecommendation) return;
    
    setCustomFrequency(currentRecommendation.recommended_frequency);
    setCustomAmount(currentRecommendation.recommended_amount);
    setIsDialogOpen(true);
  };
  
  const handleSwipeLeft = () => {
    if (currentIndex < recommendations.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };
  
  const handleSwipeRight = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Analyzing your spiritual journey and generating recommendations...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full border-red-200 dark:border-red-900">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <AlertCircle className="h-8 w-8 text-red-500 dark:text-red-400 mb-4" />
          <p className="text-red-600 dark:text-red-400 font-medium mb-2">Error Loading Recommendations</p>
          <p className="text-red-600/70 dark:text-red-400/70 text-center mb-4">{error}</p>
          <Button onClick={loadRecommendations} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!hasRecommendations) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Sparkles className="h-8 w-8 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            No habit recommendations available right now. Check back after you've used the app more!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full">
      <Card className="border-secondary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-lg">
            <Sparkles className="h-5 w-5 text-secondary mr-2" />
            AI Habit Recommendations
            <Badge className="ml-2 bg-secondary/10 text-secondary border-secondary/20">
              {recommendations.length} Available
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="pt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentRecommendation?.id || 'empty'}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              {currentRecommendation && (
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-xl mb-1">{currentRecommendation.habit_name}</h3>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {currentRecommendation.recommended_frequency}
                        </Badge>
                        <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800 flex items-center">
                          <Repeat className="h-3 w-3 mr-1" />
                          {currentRecommendation.recommended_amount} time{currentRecommendation.recommended_amount !== 1 && 's'}
                        </Badge>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800 flex items-center cursor-help">
                                <Info className="h-3 w-3 mr-1" />
                                {currentRecommendation.match_score}% Match
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-sm">How well this habit matches your spiritual profile</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    
                    <div className="flex gap-1">
                      {currentIndex > 0 && (
                        <Button variant="outline" size="icon" onClick={handleSwipeRight} className="h-8 w-8">
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                      )}
                      {currentIndex < recommendations.length - 1 && (
                        <Button variant="outline" size="icon" onClick={handleSwipeLeft} className="h-8 w-8">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground">
                    {currentRecommendation.reason}
                  </p>
                  
                  <div className="bg-secondary/5 p-4 rounded-lg border border-secondary/10">
                    <h4 className="font-medium mb-2">Why This Matters</h4>
                    <p className="text-foreground/80 text-sm">
                      {currentRecommendation.benefit}
                    </p>
                    
                    {currentRecommendation.scripture_reference && (
                      <div className="mt-3 pt-3 border-t border-secondary/10">
                        <p className="text-sm italic">
                          "{currentRecommendation.scripture_text}" — {currentRecommendation.scripture_reference}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Button 
                      variant="default"
                      onClick={() => handleAccept()}
                      className="flex-1"
                      disabled={isAccepting || isRejecting}
                    >
                      {isAccepting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Add Habit
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={handleCustomize}
                      className="flex-1"
                      disabled={isAccepting || isRejecting}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Customize
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={handleReject}
                      className="flex-1"
                      disabled={isAccepting || isRejecting}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Not for Me
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customize This Habit</DialogTitle>
            <DialogDescription>
              Adjust the frequency and amount to fit your schedule and goals
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="habit-name">Habit Name</Label>
              <Input
                id="habit-name"
                value={currentRecommendation?.habit_name}
                disabled
                className="bg-muted"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Select
                value={customFrequency}
                onValueChange={setCustomFrequency}
              >
                <SelectTrigger id="frequency">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount">
                Times {customFrequency === 'daily' ? 'per day' : 
                      customFrequency === 'weekly' ? 'per week' : 'per month'}
              </Label>
              <Input
                id="amount"
                type="number"
                min="1"
                value={customAmount}
                onChange={(e) => setCustomAmount(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => handleAccept(customFrequency, customAmount)}
              disabled={isAccepting}
            >
              {isAccepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Habit'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}