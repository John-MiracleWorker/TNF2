import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Settings, Loader2, Target, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { generateAIGoal } from '@/lib/spiritual-goals';
import { GoalPreferences, SpiritualGoal } from '@/lib/types';

interface GoalGeneratorProps {
  onGoalGenerated?: (goal: SpiritualGoal) => void;
}

export function GoalGenerator({ onGoalGenerated }: GoalGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<GoalPreferences>({
    category: '',
    timeframe: 'medium',
    focus: '',
    difficulty: 'intermediate'
  });
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorDetails(null);
    
    try {
      const goal = await generateAIGoal(preferences);
      
      if (goal) {
        onGoalGenerated?.(goal);
        toast({
          title: 'Goal Generated!',
          description: 'Your personalized spiritual goal is ready.',
        });
      } else {
        throw new Error('No goal was returned');
      }
    } catch (error) {
      console.error('Error generating goal:', error);
      
      let errorMessage = 'Unable to create your goal. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
        setErrorDetails(errorMessage);
      }
      
      toast({
        title: 'Generation Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const categories = [
    { value: 'prayer', label: 'Prayer' },
    { value: 'bible_study', label: 'Bible Study' },
    { value: 'worship', label: 'Worship' },
    { value: 'service', label: 'Service' },
    { value: 'discipleship', label: 'Discipleship' },
    { value: 'relationships', label: 'Relationships' },
    { value: '', label: 'Any Category' }
  ];

  const timeframes = [
    { value: 'short', label: 'Short-term (2 weeks)' },
    { value: 'medium', label: 'Medium-term (1 month)' },
    { value: 'long', label: 'Long-term (3 months)' }
  ];

  const focusAreas = [
    { value: 'personal_growth', label: 'Personal Growth' },
    { value: 'spiritual_disciplines', label: 'Spiritual Disciplines' },
    { value: 'community_impact', label: 'Community Impact' },
    { value: 'family', label: 'Family' },
    { value: 'ministry', label: 'Ministry' },
    { value: '', label: 'Any Focus' }
  ];

  const difficulties = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' }
  ];

  return (
    <Card className="w-full goal-generator">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-secondary" />
          <span>AI Goal Generator</span>
        </CardTitle>
        <CardDescription>
          Create a personalized spiritual growth goal tailored to your journey
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {errorDetails && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
            <p className="font-medium mb-1">Error Details:</p>
            <p>{errorDetails}</p>
            <p className="mt-2 text-xs">
              Please check that your Supabase environment is properly configured and the edge functions are deployed.
            </p>
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Your Goal...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Spiritual Goal
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowPreferences(!showPreferences)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {showPreferences && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 pt-4 border-t border-border"
          >
            <h4 className="font-medium text-foreground">Customization Preferences</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Goal Category</Label>
                <Select 
                  value={preferences.category} 
                  onValueChange={(value) => setPreferences(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeframe">Timeframe</Label>
                <Select 
                  value={preferences.timeframe} 
                  onValueChange={(value: any) => setPreferences(prev => ({ ...prev, timeframe: value }))}
                >
                  <SelectTrigger id="timeframe">
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeframes.map(timeframe => (
                      <SelectItem key={timeframe.value} value={timeframe.value}>
                        {timeframe.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="focus">Focus Area</Label>
                <Select 
                  value={preferences.focus} 
                  onValueChange={(value: any) => setPreferences(prev => ({ ...prev, focus: value }))}
                >
                  <SelectTrigger id="focus">
                    <SelectValue placeholder="Select focus" />
                  </SelectTrigger>
                  <SelectContent>
                    {focusAreas.map(focus => (
                      <SelectItem key={focus.value} value={focus.value}>
                        {focus.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select 
                  value={preferences.difficulty} 
                  onValueChange={(value: any) => setPreferences(prev => ({ ...prev, difficulty: value }))}
                >
                  <SelectTrigger id="difficulty">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    {difficulties.map(difficulty => (
                      <SelectItem key={difficulty.value} value={difficulty.value}>
                        {difficulty.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
              <p className="font-medium mb-1">How personalization works:</p>
              <ul className="space-y-1 text-xs">
                <li>• Analyzes your journal entries and prayer requests</li>
                <li>• Considers your spiritual wellbeing trends</li>
                <li>• Reviews your scripture interests and habits</li>
                <li>• Takes into account your existing goals and progress</li>
                <li>• Creates goals that align with your spiritual journey</li>
              </ul>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}