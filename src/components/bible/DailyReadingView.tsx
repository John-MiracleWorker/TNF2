// Update the import section to add missing AlertDialogFooter
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  MessageSquare,
  Heart,
  Send,
  Loader2,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Calendar,
  BookmarkPlus,
  BookmarkCheck,
  AlertCircle,
  Volume2
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  ReadingPlan, 
  ReadingProgress, 
  DailyReading, 
  ReadingReflection,
  completeReadingDay,
  getReflection,
  saveReflection
} from '@/lib/reading-plans';
import { getVerse, getChapter, BibleVerse, BibleChapter } from '@/lib/bible-api';
import { savePrayerRequest, PrayerRequest } from '@/lib/supabase';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
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
} from "@/components/ui/alert-dialog";
import { ScriptureAudioPlayer } from '@/components/ui/ScriptureAudioPlayer';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface DailyReadingViewProps {
  plan: ReadingPlan;
  progress: ReadingProgress;
  dailyReading: DailyReading;
  onComplete?: () => void;
  onPrevDay?: () => void;
  onNextDay?: () => void;
}

export function DailyReadingView({ 
  plan, 
  progress, 
  dailyReading, 
  onComplete,
  onPrevDay,
  onNextDay
}: DailyReadingViewProps) {
  // State for single verse reference
  const [scripture, setScripture] = useState<BibleVerse | null>(null);
  // State for full chapter
  const [chapterScripture, setChapterScripture] = useState<BibleChapter | null>(null);
  const [isLoadingScripture, setIsLoadingScripture] = useState(true);
  const [reflection, setReflection] = useState<ReadingReflection | null>(null);
  const [reflectionText, setReflectionText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isSavingPrayer, setIsSavingPrayer] = useState(false);
  const [prayerSaved, setPrayerSaved] = useState(false);
  const { toast } = useToast();

  // Check if reference is a full chapter (no colon)
  const isFullChapter = !dailyReading.scripture_reference.includes(':');

  // Load the Bible scripture for this day
  useEffect(() => {
    const loadScripture = async () => {
      setIsLoadingScripture(true);
      try {
        if (isFullChapter) {
          // Parse the full chapter reference (e.g., "Matthew 6")
          const parts = dailyReading.scripture_reference.split(' ');
          const book = parts.slice(0, parts.length - 1).join(' ');
          const chapter = parseInt(parts[parts.length - 1]);
          
          const chapterData = await getChapter(book, chapter);
          setChapterScripture(chapterData);
          setScripture(null);
        } else {
          // Handle specific verse reference
          const verse = await getVerse(dailyReading.scripture_reference);
          setScripture(verse);
          setChapterScripture(null);
        }
      } catch (error) {
        console.error('Error loading scripture:', error);
      } finally {
        setIsLoadingScripture(false);
      }
    };
    
    loadScripture();
  }, [dailyReading.scripture_reference, isFullChapter]);

  // Load any existing reflection
  useEffect(() => {
    const loadReflection = async () => {
      try {
        const data = await getReflection(plan.id, dailyReading.day_number);
        
        if (data) {
          setReflection(data);
          setReflectionText(data.reflection_text || '');
        } else {
          setReflection(null);
          setReflectionText('');
        }
      } catch (error) {
        console.error('Error loading reflection:', error);
      }
    };
    
    loadReflection();
  }, [plan.id, dailyReading.day_number]);

  // Calculate progress percentage
  const progressPercent = Math.round((progress.current_day - 1) / plan.duration_days * 100);
  
  // Check if this day is already completed
  const isDayCompleted = progress.current_day > dailyReading.day_number;

  // Check if we're on the current day
  const isCurrentDay = progress.current_day === dailyReading.day_number;
  
  // Handle submitting a reflection
  const handleSubmitReflection = async () => {
    if (!reflectionText.trim()) {
      toast({
        title: 'Reflection Required',
        description: 'Please enter your reflection before submitting.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // First, save the reflection locally
      await saveReflection(plan.id, dailyReading.day_number, reflectionText);
      
      // Then, send to the edge function for AI feedback
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No authenticated session');
      }
      
      const response = await fetch(`${supabaseUrl}/functions/v1/reading-reflection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          planId: plan.id,
          dayNumber: dailyReading.day_number,
          reflectionText: reflectionText,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to submit reflection: ${response.status}`);
      }
      
      const data = await response.json();
      
      setReflection(data.reflection);
      
      toast({
        title: 'Reflection Submitted',
        description: 'Your reflection has been saved and spiritual insights added.',
      });
      
      // If this is the current day, mark it as complete
      if (isCurrentDay) {
        handleMarkComplete();
      }
    } catch (error) {
      console.error('Error submitting reflection:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit your reflection. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle marking a day as complete
  const handleMarkComplete = async () => {
    setIsCompleting(true);
    try {
      await completeReadingDay(plan.id, dailyReading.day_number);
      
      toast({
        title: 'Day Completed',
        description: 'Great job! Your progress has been updated.',
      });
      
      // Notify the parent component
      onComplete?.();
    } catch (error) {
      console.error('Error completing day:', error);
      toast({
        title: 'Error',
        description: 'Failed to update your progress. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCompleting(false);
    }
  };

  // Handle saving prayer to prayer journal
  const handleSavePrayer = async () => {
    if (!dailyReading.prayer_prompt) return;
    
    setIsSavingPrayer(true);
    try {
      // Create a new prayer request
      const prayer: PrayerRequest = {
        title: `${plan.title} - Day ${dailyReading.day_number}`,
        description: dailyReading.prayer_prompt,
        is_answered: false,
        shared: false,
        tags: [plan.theme || 'reading-plan', 'prayer-focus']
      };
      
      await savePrayerRequest(prayer);
      
      setPrayerSaved(true);
      toast({
        title: 'Prayer Saved',
        description: 'Prayer focus saved to your prayer journal.',
      });
    } catch (error) {
      console.error('Error saving prayer request:', error);
      toast({
        title: 'Error',
        description: 'Failed to save prayer to your journal. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingPrayer(false);
    }
  };

  // Function to render the scripture content
  const renderScriptureContent = () => {
    if (isLoadingScripture) {
      return (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }
    
    if (chapterScripture) {
      // Render full chapter
      return (
        <div className="bg-muted/30 rounded-lg p-4 border border-muted max-h-[400px] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-medium">Chapter {chapterScripture.chapter} of {chapterScripture.book}</h4>
            <ScriptureAudioPlayer
              title={`${chapterScripture.book} ${chapterScripture.chapter}`}
              scripture={chapterScripture.verses.map(v => v.text).join(' ')}
              size="sm"
              variant="outline"
            />
          </div>
          <div className="space-y-2">
            {chapterScripture.verses.map(verse => (
              <p key={verse.reference} className="text-foreground">
                <span className="font-medium text-sm text-muted-foreground mr-2">{verse.reference.split(':')[1]}</span>
                {verse.text}
              </p>
            ))}
          </div>
          <div className="text-sm text-muted-foreground mt-4">
            {chapterScripture.book} {chapterScripture.chapter} ({chapterScripture.verses[0]?.translation_id || 'KJV'})
          </div>
        </div>
      );
    } else if (scripture) {
      // Render specific verses
      return (
        <div className="bg-muted/30 rounded-lg p-4 border border-muted">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-medium">{scripture.reference}</h4>
            <ScriptureAudioPlayer
              title={scripture.reference}
              scripture={scripture.text}
              size="sm"
              variant="outline"
            />
          </div>
          <blockquote className="text-foreground italic border-l-4 border-secondary pl-4">
            "{scripture.text}"
          </blockquote>
          <cite className="block text-sm text-muted-foreground mt-2">
            — {scripture.reference} ({scripture.translation_id})
          </cite>
        </div>
      );
    } else {
      // Error or no scripture loaded
      return (
        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
          <p className="text-amber-800 dark:text-amber-300">
            Scripture not available. Please check the reference: {dailyReading.scripture_reference}
          </p>
        </div>
      );
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div>
            <CardTitle className="text-xl text-foreground">{dailyReading.title}</CardTitle>
            <div className="flex items-center text-sm text-muted-foreground space-x-2 mt-1">
              <Calendar className="h-4 w-4" />
              <span>Day {dailyReading.day_number} of {plan.duration_days}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onPrevDay}
              disabled={dailyReading.day_number <= 1}
              className="h-8 px-2 sm:px-4"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Previous</span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onNextDay}
              disabled={dailyReading.day_number >= plan.duration_days}
              className="h-8 px-2 sm:px-4"
            >
              <span className="hidden sm:inline mr-1">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="mt-2">
          <Progress value={progressPercent} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {progressPercent}% complete - {isDayCompleted ? 'Completed' : isCurrentDay ? 'Current Day' : 'Future Reading'}
          </p>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Description */}
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-foreground">{dailyReading.description}</p>
        </div>
        
        {/* Scripture */}
        <div className="space-y-2">
          <h3 className="flex items-center font-medium text-foreground">
            <BookOpen className="h-4 w-4 mr-2 text-muted-foreground" />
            Today's Scripture: {dailyReading.scripture_reference}
            {isFullChapter && <Badge variant="outline" className="ml-2 bg-primary/10 text-primary">Full Chapter</Badge>}
          </h3>
          
          {renderScriptureContent()}
        </div>
        
        {/* Reflection Questions */}
        {dailyReading.reflection_questions.length > 0 && (
          <div className="space-y-2">
            <h3 className="flex items-center font-medium text-foreground">
              <MessageSquare className="h-4 w-4 mr-2 text-muted-foreground" />
              Reflection Questions
            </h3>
            
            <ul className="space-y-2 list-disc list-inside text-muted-foreground ml-4">
              {dailyReading.reflection_questions.map((question, index) => (
                <li key={index}>{question}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Prayer Prompt */}
        {dailyReading.prayer_prompt && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center font-medium text-foreground">
                <Heart className="h-4 w-4 mr-2 text-muted-foreground" />
                Prayer Focus
              </h3>
              {!prayerSaved ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center text-xs h-7"
                  onClick={handleSavePrayer}
                  disabled={isSavingPrayer}
                >
                  {isSavingPrayer ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <BookmarkPlus className="h-3 w-3 mr-1" />
                  )}
                  Save to Prayer Journal
                </Button>
              ) : (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 flex items-center">
                  <BookmarkCheck className="h-3 w-3 mr-1" />
                  Saved to Journal
                </Badge>
              )}
            </div>
            
            <div className="bg-secondary/10 rounded-lg p-4">
              <p className="text-foreground/90 italic">{dailyReading.prayer_prompt}</p>
            </div>
          </div>
        )}
        
        <Separator />
        
        {/* User Reflection */}
        <div className="space-y-3">
          <h3 className="font-medium text-foreground">Your Reflection</h3>
          
          {reflection?.ai_feedback ? (
            <>
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Your Reflection:</p>
                <p className="text-foreground">{reflection.reflection_text}</p>
              </div>
              
              <div className="bg-secondary/10 rounded-lg p-4 border border-secondary/20">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium text-secondary dark:text-secondary/90">Spiritual Insight:</p>
                  <ScriptureAudioPlayer
                    title="Spiritual Insight"
                    scripture={reflection.ai_feedback || ""}
                    size="sm"
                    variant="ghost"
                  />
                </div>
                <p className="text-foreground">{reflection.ai_feedback}</p>
              </div>
              
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setReflectionText(reflection.reflection_text)}>
                  Edit Reflection
                </Button>
              </div>
            </>
          ) : (
            <>
              <Textarea
                placeholder="Share your thoughts, insights, and questions based on today's reading..."
                value={reflectionText}
                onChange={(e) => setReflectionText(e.target.value)}
                rows={6}
                className="resize-none"
              />
              
              <Button
                variant="secondary"
                onClick={handleSubmitReflection}
                disabled={isSubmitting || !reflectionText.trim()}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting Reflection...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Reflection
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        {isDayCompleted ? (
          <Badge className="flex items-center bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        ) : isCurrentDay ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                disabled={isCompleting || !reflection}
                variant="default"
                className="ml-auto"
              >
                {isCompleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Mark as Complete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Complete This Reading?</AlertDialogTitle>
                <AlertDialogDescription>
                  {!dailyReading.prayer_prompt ? (
                    "Are you sure you want to mark this day's reading as complete?"
                  ) : !prayerSaved ? (
                    <>
                      <p className="mb-4">Would you like to save today's prayer focus to your prayer journal before completing?</p>
                      <div className="flex items-center p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-100 dark:border-amber-800">
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-2 flex-shrink-0" />
                        <p className="text-amber-800 dark:text-amber-300 text-sm">
                          You haven't saved the prayer focus yet. Saving it will help you remember to pray for this throughout the week.
                        </p>
                      </div>
                    </>
                  ) : (
                    "Are you sure you want to mark this day's reading as complete?"
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                {!prayerSaved && dailyReading.prayer_prompt && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleSavePrayer();
                      handleMarkComplete();
                    }}
                    disabled={isSavingPrayer || isCompleting}
                  >
                    <BookmarkPlus className="mr-2 h-4 w-4" />
                    Save Prayer & Complete
                  </Button>
                )}
                <AlertDialogAction onClick={handleMarkComplete} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Complete Reading
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <div className="ml-auto text-sm text-muted-foreground italic">
            Complete previous days first
          </div>
        )}
      </CardFooter>
    </Card>
  );
}