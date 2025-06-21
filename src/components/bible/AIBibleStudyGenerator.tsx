import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Settings, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { generateAIBibleStudy, BibleStudyPreferences } from '@/lib/ai-bible-study';

interface AIBibleStudyGeneratorProps {
  onStudyGenerated?: () => void;
}

export function AIBibleStudyGenerator({ onStudyGenerated }: AIBibleStudyGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<BibleStudyPreferences>({
    topic: '',
    difficulty: 'intermediate',
    focus: 'application'
  });
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorDetails(null);
    
    try {
      await generateAIBibleStudy(preferences);
      onStudyGenerated?.();
      toast({
        title: 'Bible Study Generated!',
        description: 'Your personalized Bible study is ready.',
      });
    } catch (error) {
      console.error('Error generating Bible study:', error);
      
      let errorMessage = 'Unable to create your Bible study. Please try again.';
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

  return (
    <Card className="w-full bible-study-generator">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-gold" />
          <span>AI Personalized Bible Study</span>
        </CardTitle>
        <CardDescription>
          Generate a Bible study tailored specifically to your current spiritual journey, recent prayer life, and areas of interest.
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
            className="bg-gold text-navy hover:bg-gold/90"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Your Bible Study...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Bible Study
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
            className="space-y-4 pt-4 border-t border-gray-200"
          >
            <h4 className="font-medium text-navy">Customization Preferences</h4>
            
            <div className="space-y-2">
              <Label htmlFor="topic">Topic (Optional)</Label>
              <Input
                id="topic"
                placeholder="E.g., Prayer, Faith, Forgiveness, etc."
                value={preferences.topic}
                onChange={(e) => setPreferences(prev => ({ ...prev, topic: e.target.value }))}
              />
              <p className="text-xs text-navy/60">Leave blank for a personalized recommendation</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="focus">Study Focus</Label>
                <Select 
                  value={preferences.focus} 
                  onValueChange={(value: any) => setPreferences(prev => ({ ...prev, focus: value }))}
                >
                  <SelectTrigger id="focus">
                    <SelectValue placeholder="Select focus" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="interpretation">Scripture Interpretation</SelectItem>
                    <SelectItem value="application">Practical Application</SelectItem>
                    <SelectItem value="theology">Theological Understanding</SelectItem>
                    <SelectItem value="historical">Historical Context</SelectItem>
                    <SelectItem value="character">Character Study</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="text-sm text-navy/60 bg-blue-50 rounded-lg p-3">
              <p className="font-medium mb-1">How personalization works:</p>
              <ul className="space-y-1 text-xs">
                <li>• Analyzes your Bible study interests based on previous notes</li>
                <li>• Considers your current prayer requests and spiritual challenges</li>
                <li>• Reviews your mood and spiritual wellbeing trends</li>
                <li>• Incorporates scriptures you're currently memorizing</li>
                <li>• Creates study content that speaks directly to your journey</li>
              </ul>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}