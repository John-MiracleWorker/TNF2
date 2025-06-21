import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Settings, Loader2, BookOpen, ListPlus, CalendarClock, GraduationCap, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { generateCustomReadingPlan, ReadingPlanPreferences, ReadingPlan, ReadingProgress } from '@/lib/reading-plans';

interface CustomReadingPlanGeneratorProps {
  onPlanGenerated?: (plan: ReadingPlan, progress: ReadingProgress) => void;
}

export function CustomReadingPlanGenerator({ onPlanGenerated }: CustomReadingPlanGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<ReadingPlanPreferences>({
    duration: 7,
    focus: 'reflection',
    difficulty: 'intermediate'
  });
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorDetails(null);
    
    try {
      const result = await generateCustomReadingPlan(preferences);
      
      if (result && result.plan) {
        toast({
          title: 'Reading Plan Created!',
          description: `Your personalized "${result.plan.title}" plan is ready to start.`,
        });
        
        onPlanGenerated?.(result.plan, result.progress);
      } else {
        throw new Error('No reading plan was returned');
      }
    } catch (error) {
      console.error('Error generating reading plan:', error);
      
      let errorMessage = 'Unable to create your reading plan. Please try again.';
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
  
  const focusOptions = [
    { value: 'study', label: 'In-depth Study', description: 'Focus on understanding scripture context and meaning' },
    { value: 'reflection', label: 'Personal Reflection', description: 'Emphasize application to your life' },
    { value: 'prayer', label: 'Prayer-Focused', description: 'Center on developing your prayer life' },
    { value: 'application', label: 'Practical Application', description: 'Concentrate on living out the Word' },
    { value: 'devotional', label: 'Devotional', description: 'Balanced approach to scripture and reflection' }
  ];
  
  const difficultyLabels = {
    beginner: 'Beginner: Accessible for new believers',
    intermediate: 'Intermediate: Some Biblical knowledge helpful',
    advanced: 'Advanced: Deeper theological concepts'
  };
  
  return (
    <Card className="w-full reading-plan-generator">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-gold" />
          <span>AI-Generated Reading Plan</span>
        </CardTitle>
        <CardDescription>
          Create a personalized Bible reading plan tailored to your interests, spiritual journey, and goals
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
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topic">Topic or Theme (Optional)</Label>
              <Input
                id="topic"
                placeholder="E.g., Forgiveness, Faith, Prayer, God's Love..."
                value={preferences.topic || ''}
                onChange={e => setPreferences(prev => ({ ...prev, topic: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank for a personalized recommendation based on your spiritual journey
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="specific-book">Specific Book (Optional)</Label>
              <Input
                id="specific-book"
                placeholder="E.g., Psalms, John, Romans..."
                value={preferences.specificBook || ''}
                onChange={e => setPreferences(prev => ({ ...prev, specificBook: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="w-full md:w-auto flex flex-row md:flex-col space-x-2 md:space-x-0 md:space-y-2">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex-grow md:flex-grow-0 bg-gold text-navy hover:bg-gold/90"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <ListPlus className="mr-2 h-4 w-4" />
                  Create Plan
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
              className={showSettings ? "bg-muted" : ""}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6 pt-4 border-t border-border"
          >
            <h4 className="font-medium text-foreground">Plan Settings</h4>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Plan Duration</Label>
                  <span className="text-sm text-muted-foreground">{preferences.duration} days</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
                  <Slider 
                    value={[preferences.duration || 7]} 
                    min={3} 
                    max={30} 
                    step={1}
                    onValueChange={(value) => setPreferences(prev => ({ ...prev, duration: value[0] }))}
                    className="flex-grow"
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground pt-1">
                  <span>Shorter</span>
                  <span>Medium</span>
                  <span>Longer</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="focus">Reading Focus</Label>
                <Select
                  value={preferences.focus}
                  onValueChange={(value: any) => setPreferences(prev => ({ ...prev, focus: value }))}
                >
                  <SelectTrigger id="focus" className="w-full">
                    <div className="flex items-center">
                      <Lightbulb className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Select focus" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {focusOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col">
                          <span className="font-medium">{option.label}</span>
                          <span className="text-xs text-muted-foreground">{option.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Difficulty Level</Label>
                  <span className="text-sm text-muted-foreground capitalize">{preferences.difficulty}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <Slider 
                    value={[preferences.difficulty === 'beginner' ? 1 : preferences.difficulty === 'intermediate' ? 2 : 3]} 
                    min={1} 
                    max={3} 
                    step={1}
                    onValueChange={(value) => {
                      const difficultyMap = {1: 'beginner', 2: 'intermediate', 3: 'advanced'};
                      setPreferences(prev => ({ 
                        ...prev, 
                        difficulty: difficultyMap[value[0] as keyof typeof difficultyMap] as any
                      }));
                    }}
                    className="flex-grow"
                  />
                </div>
                <div className="text-xs text-muted-foreground pt-1">
                  {difficultyLabels[preferences.difficulty as keyof typeof difficultyLabels]}
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-950 rounded-lg p-4">
              <h5 className="flex items-center text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                <BookOpen className="h-4 w-4 mr-2" />
                How Personalization Works
              </h5>
              <ul className="space-y-1 text-sm text-blue-700 dark:text-blue-400">
                <li className="flex items-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-700 dark:bg-blue-400 mr-2"></div>
                  <span>Analyzes your journal entries and prayer requests</span>
                </li>
                <li className="flex items-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-700 dark:bg-blue-400 mr-2"></div>
                  <span>Considers scriptures you've been memorizing</span>
                </li>
                <li className="flex items-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-700 dark:bg-blue-400 mr-2"></div>
                  <span>Adapts to your current spiritual and emotional state</span>
                </li>
                <li className="flex items-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-700 dark:bg-blue-400 mr-2"></div>
                  <span>Creates a progressive journey that builds day by day</span>
                </li>
              </ul>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}