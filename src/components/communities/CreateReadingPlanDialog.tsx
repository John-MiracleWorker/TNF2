import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { BookOpen, Loader2, X, Calendar, ArrowRight, Sparkles, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { generateCustomReadingPlan } from '@/lib/reading-plans';

interface CreateReadingPlanDialogProps {
  communityId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onPlanCreated?: () => void;
}

export function CreateReadingPlanDialog({
  communityId,
  open,
  onOpenChange,
  onPlanCreated
}: CreateReadingPlanDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [planMode, setPlanMode] = useState<'existing' | 'ai'>('existing');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [readingPlanId, setReadingPlanId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [readingPlans, setReadingPlans] = useState<{id: string, title: string, description: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // AI reading plan preferences
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiGeneratedPlan, setAiGeneratedPlan] = useState<any>(null);
  const [aiPreferences, setAiPreferences] = useState({
    topic: '',
    duration: 7,
    focus: 'reflection',
    difficulty: 'intermediate',
    specificBook: ''
  });
  
  const { toast } = useToast();

  useEffect(() => {
    // Set default start date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setStartDate(tomorrow.toISOString().split('T')[0]);
    
    loadReadingPlans();
  }, []);

  const loadReadingPlans = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('bible_reading_plans')
        .select('id, title, description')
        .eq('is_active', true);

      if (error) throw error;
      setReadingPlans(data || []);
    } catch (error) {
      console.error('Error loading reading plans:', error);
      toast({
        title: 'Error',
        description: 'Failed to load available reading plans',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a name for the reading plan',
        variant: 'destructive'
      });
      return;
    }

    if (planMode === 'existing' && !readingPlanId) {
      toast({
        title: 'Error',
        description: 'Please select a reading plan',
        variant: 'destructive'
      });
      return;
    }

    if (!startDate) {
      toast({
        title: 'Error',
        description: 'Please select a start date',
        variant: 'destructive'
      });
      return;
    }

    if (planMode === 'ai' && !aiGeneratedPlan) {
      toast({
        title: 'Error',
        description: 'Please generate an AI reading plan first',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be signed in to create a reading plan');
      }

      // For existing plan: Get duration to calculate end date
      let selectedPlanId = readingPlanId;
      let duration_days = 7; // Default
      
      if (planMode === 'existing') {
        // Get the selected reading plan details to calculate end date
        const { data: planData, error: planError } = await supabase
          .from('bible_reading_plans')
          .select('duration_days')
          .eq('id', readingPlanId)
          .single();

        if (planError) throw planError;
        duration_days = planData?.duration_days || 7;
      } else {
        // For AI plan - use the generated plan's duration and ID
        duration_days = aiGeneratedPlan.plan.duration_days;
        selectedPlanId = aiGeneratedPlan.plan.id;
      }

      // Calculate end date
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(startDateObj);
      endDateObj.setDate(startDateObj.getDate() + duration_days - 1);
      const endDate = endDateObj.toISOString().split('T')[0];

      // Create the community reading plan
      const { error } = await supabase
        .from('community_reading_plans')
        .insert({
          community_id: communityId,
          reading_plan_id: selectedPlanId,
          name: name.trim(),
          description: description.trim() || null,
          start_date: startDate,
          end_date: endDate,
          created_by: user.id
        });

      if (error) {
        console.error('Error creating reading plan:', error);
        throw new Error(`Failed to create reading plan: ${error.message}`);
      }

      toast({
        title: 'Reading Plan Created',
        description: 'Your reading plan has been shared with the community',
      });

      // Reset form
      setName('');
      setDescription('');
      setReadingPlanId('');
      setStartDate('');
      setAiGeneratedPlan(null);
      setPlanMode('existing');
      
      // Close dialog and trigger refresh
      if (onOpenChange) onOpenChange(false);
      if (onPlanCreated) onPlanCreated();
      
    } catch (error) {
      console.error('Error creating reading plan:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create reading plan',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateAiPlan = async () => {
    setIsGenerating(true);
    
    try {
      const result = await generateCustomReadingPlan(aiPreferences);
      
      if (result && result.plan) {
        setAiGeneratedPlan(result);
        
        // Pre-fill the name and description with the AI-generated content
        setName(result.plan.title);
        setDescription(result.plan.description);
        
        toast({
          title: 'Reading Plan Generated',
          description: 'Your AI reading plan is ready to share with the community',
        });
      }
    } catch (error) {
      console.error('Error generating reading plan:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate reading plan',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <BookOpen className="mr-2 h-4 w-4" />
          Create Reading Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Community Reading Plan</DialogTitle>
          <DialogDescription>
            Start a shared reading plan for your community
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Tabs value={planMode} onValueChange={(value) => setPlanMode(value as 'existing' | 'ai')} className="w-full mb-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="existing" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                <span>Existing Plan</span>
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span>AI-Generated Plan</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Plan Name</Label>
              <Input
                id="name"
                placeholder="Name your community reading plan"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Add details about this reading journey..."
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            
            {planMode === 'existing' ? (
              <div className="space-y-2">
                <Label htmlFor="reading-plan">Select Reading Plan</Label>
                {isLoading ? (
                  <div className="flex items-center space-x-2 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Loading plans...</span>
                  </div>
                ) : (
                  <Select value={readingPlanId} onValueChange={setReadingPlanId}>
                    <SelectTrigger id="reading-plan">
                      <SelectValue placeholder="Select a reading plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {readingPlans.map(plan => (
                        <SelectItem key={plan.id} value={plan.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{plan.title}</span>
                            <span className="text-xs text-muted-foreground line-clamp-1">{plan.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {aiGeneratedPlan ? (
                  <Card className="border-secondary/20">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold flex items-center">
                          <Sparkles className="h-4 w-4 text-secondary mr-2" />
                          Generated Reading Plan
                        </h3>
                        <Badge>{aiGeneratedPlan.plan.duration_days} days</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <p className="text-sm text-muted-foreground">{aiGeneratedPlan.plan.description}</p>
                      
                      <div className="mt-4 pt-2 border-t border-border">
                        <h4 className="text-sm font-medium mb-2">Sample Readings:</h4>
                        <div className="space-y-2">
                          {aiGeneratedPlan.plan.days.slice(0, 3).map((day: any, index: number) => (
                            <div key={index} className="flex items-center space-x-2">
                              <Badge variant="outline" className="shrink-0">Day {day.day_number}</Badge>
                              <span className="text-sm truncate">{day.scripture_reference} - {day.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-2 border-t">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          setAiGeneratedPlan(null);
                        }}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Generate Different Plan
                      </Button>
                    </CardFooter>
                  </Card>
                ) : (
                  <div className="space-y-4 border rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Topic (Optional)</Label>
                        <Input 
                          placeholder="E.g., Prayer, Faith, etc."
                          value={aiPreferences.topic}
                          onChange={(e) => setAiPreferences(prev => ({...prev, topic: e.target.value}))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Specific Book (Optional)</Label>
                        <Input 
                          placeholder="E.g., Psalms, John"
                          value={aiPreferences.specificBook}
                          onChange={(e) => setAiPreferences(prev => ({...prev, specificBook: e.target.value}))}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label>Duration (Days)</Label>
                        <Select 
                          value={aiPreferences.duration.toString()} 
                          onValueChange={(value) => setAiPreferences(prev => ({...prev, duration: parseInt(value)}))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3">3 days</SelectItem>
                            <SelectItem value="7">7 days</SelectItem>
                            <SelectItem value="14">14 days</SelectItem>
                            <SelectItem value="21">21 days</SelectItem>
                            <SelectItem value="30">30 days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Focus</Label>
                        <Select 
                          value={aiPreferences.focus} 
                          onValueChange={(value) => setAiPreferences(prev => ({...prev, focus: value}))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select focus" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="reflection">Personal Reflection</SelectItem>
                            <SelectItem value="study">In-depth Study</SelectItem>
                            <SelectItem value="prayer">Prayer-Focused</SelectItem>
                            <SelectItem value="application">Practical Application</SelectItem>
                            <SelectItem value="devotional">Devotional</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Difficulty</Label>
                        <Select 
                          value={aiPreferences.difficulty} 
                          onValueChange={(value) => setAiPreferences(prev => ({...prev, difficulty: value as any}))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select difficulty" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full" 
                      onClick={handleGenerateAiPlan}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating Plan...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate AI Reading Plan
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <BookOpen className="mr-2 h-4 w-4" />
                Create Plan
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}