import { useState } from 'react';
import { motion } from 'framer-motion';
import { Smile, Frown, Heart, BookOpen, Church, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { saveMoodEntry } from '@/lib/supabase';
import { MoodEntry } from '@/lib/types';
import { supabase } from '@/lib/supabase';

interface MoodEntryFormProps {
  onEntrySubmitted?: () => void;
}

export function MoodEntryForm({ onEntrySubmitted }: MoodEntryFormProps) {
  const [moodScore, setMoodScore] = useState<number>(7);
  const [spiritualScore, setSpiritualScore] = useState<number>(7);
  const [prayerTime, setPrayerTime] = useState<boolean>(false);
  const [bibleReading, setBibleReading] = useState<boolean>(false);
  const [churchAttendance, setChurchAttendance] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const { toast } = useToast();

  const getMoodEmoji = (score: number) => {
    if (score <= 3) return '😔';
    if (score <= 5) return '😐';
    if (score <= 8) return '🙂';
    return '😊';
  };

  const getSpiritualEmoji = (score: number) => {
    if (score <= 3) return '🙏';
    if (score <= 5) return '✝️';
    if (score <= 8) return '💫';
    return '✨';
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Get the current user to ensure user_id is set
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const entry: MoodEntry = {
        user_id: user.id, // Explicitly set the user_id
        mood_score: moodScore,
        spiritual_score: spiritualScore,
        prayer_time: prayerTime,
        bible_reading: bibleReading,
        church_attendance: churchAttendance,
        notes: notes,
        entry_date: new Date().toISOString().split('T')[0]
      };
      
      await saveMoodEntry(entry);
      
      toast({
        title: 'Entry Saved',
        description: 'Your mood and spiritual wellbeing entry has been saved.',
      });
      
      // Reset form
      setMoodScore(7);
      setSpiritualScore(7);
      setPrayerTime(false);
      setBibleReading(false);
      setChurchAttendance(false);
      setNotes('');
      
      // Notify parent component
      onEntrySubmitted?.();
    } catch (error) {
      console.error('Error saving mood entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to save your entry. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Daily Spiritual Check-in</CardTitle>
        <CardDescription>
          Track your emotional and spiritual wellbeing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mood Score */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label htmlFor="mood-score">Emotional Wellbeing</Label>
            <div className="text-2xl">{getMoodEmoji(moodScore)}</div>
          </div>
          <Slider
            id="mood-score"
            min={1}
            max={10}
            step={1}
            value={[moodScore]}
            onValueChange={(value) => setMoodScore(value[0])}
            className="py-4"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Struggling</span>
            <span>Neutral</span>
            <span>Flourishing</span>
          </div>
        </div>
        
        {/* Spiritual Score */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label htmlFor="spiritual-score">Spiritual Wellbeing</Label>
            <div className="text-2xl">{getSpiritualEmoji(spiritualScore)}</div>
          </div>
          <Slider
            id="spiritual-score"
            min={1}
            max={10}
            step={1}
            value={[spiritualScore]}
            onValueChange={(value) => setSpiritualScore(value[0])}
            className="py-4"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Distant</span>
            <span>Connected</span>
            <span>Thriving</span>
          </div>
        </div>
        
        {/* Spiritual Practices */}
        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-medium">Today's Spiritual Practices</h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Heart className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="prayer-time" className="text-foreground">Prayer Time</Label>
            </div>
            <Switch
              id="prayer-time"
              checked={prayerTime}
              onCheckedChange={setPrayerTime}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="bible-reading" className="text-foreground">Bible Reading</Label>
            </div>
            <Switch
              id="bible-reading"
              checked={bibleReading}
              onCheckedChange={setBibleReading}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Church className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="church-attendance" className="text-foreground">Church Attendance</Label>
            </div>
            <Switch
              id="church-attendance"
              checked={churchAttendance}
              onCheckedChange={setChurchAttendance}
            />
          </div>
        </div>
        
        {/* Notes */}
        <div className="space-y-2 pt-2">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Add any thoughts or reflections about your day..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting}
          className="w-full"
          variant="navy"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Entry
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}