import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Settings, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { generateAIDevotional, DevotionalPreferences } from '@/lib/ai-devotionals';

interface AIDevotionalGeneratorProps {
  onDevotionalGenerated?: () => void;
}

export function AIDevotionalGenerator({ onDevotionalGenerated }: AIDevotionalGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<DevotionalPreferences>({
    tone: 'encouraging',
    length: 'medium',
    focus: 'reflection'
  });
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorDetails(null);
    
    try {
      await generateAIDevotional(preferences);
      onDevotionalGenerated?.();
      toast({
        title: 'Devotional Generated!',
        description: 'Your personalized devotional is ready for you.',
      });
    } catch (error) {
      console.error('Error generating devotional:', error);
      
      let errorMessage = 'Unable to create your devotional. Please try again.';
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
    <Card className="w-full devotional-generator">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-gold" />
          <span>AI Personalized Devotional</span>
        </CardTitle>
        <CardDescription>
          Generate a devotional tailored specifically to your current spiritual journey, recent prayers, and personal growth areas.
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
                Creating Your Devotional...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate My Devotional
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
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tone">Tone</Label>
                <Select 
                  value={preferences.tone} 
                  onValueChange={(value: any) => setPreferences(prev => ({ ...prev, tone: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="encouraging">Encouraging</SelectItem>
                    <SelectItem value="challenging">Challenging</SelectItem>
                    <SelectItem value="comforting">Comforting</SelectItem>
                    <SelectItem value="inspiring">Inspiring</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="length">Length</Label>
                <Select 
                  value={preferences.length} 
                  onValueChange={(value: any) => setPreferences(prev => ({ ...prev, length: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select length" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short (2-3 min)</SelectItem>
                    <SelectItem value="medium">Medium (5-7 min)</SelectItem>
                    <SelectItem value="long">Long (10-12 min)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="focus">Focus</Label>
                <Select 
                  value={preferences.focus} 
                  onValueChange={(value: any) => setPreferences(prev => ({ ...prev, focus: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select focus" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prayer">Prayer</SelectItem>
                    <SelectItem value="scripture">Scripture Study</SelectItem>
                    <SelectItem value="application">Practical Application</SelectItem>
                    <SelectItem value="reflection">Personal Reflection</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="text-sm text-navy/60 bg-blue-50 rounded-lg p-3">
              <p className="font-medium mb-1">How personalization works:</p>
              <ul className="space-y-1 text-xs">
                <li>• Analyzes your recent mood and spiritual wellbeing</li>
                <li>• Considers your active prayer requests and answered prayers</li>
                <li>• Reviews your journal entries for current themes</li>
                <li>• Incorporates your spiritual habits and growth areas</li>
                <li>• Creates content that speaks directly to your journey</li>
              </ul>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}