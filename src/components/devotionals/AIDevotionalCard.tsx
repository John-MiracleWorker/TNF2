// Update the import section to add TextToSpeechButton
import { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { 
  Save, 
  Book, 
  ChevronDown, 
  ChevronUp, 
  Edit,
  Sparkles,
  Loader2,
  MessageSquare,
  User,
  Heart,
  X,
  Send,
  Volume2
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScriptureAudioPlayer } from '@/components/ui/ScriptureAudioPlayer';
import { useToast } from '@/hooks/use-toast';
import { AIDevotional, DevotionalInteraction, submitDevotionalInteraction, getDevotionalInteractions } from '@/lib/ai-devotionals';

interface AIDevotionalCardProps {
  devotional: AIDevotional;
  onInteraction?: () => void;
}

export function AIDevotionalCard({ devotional, onInteraction }: AIDevotionalCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [interactions, setInteractions] = useState<DevotionalInteraction[]>([]);
  const [activeQuestion, setActiveQuestion] = useState<number | null>(null);
  const [responses, setResponses] = useState<{ [key: number]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadedInteractions, setLoadedInteractions] = useState(false);
  const { toast } = useToast();

  const loadInteractions = async () => {
    if (loadedInteractions) return;
    
    try {
      const data = await getDevotionalInteractions(devotional.id);
      setInteractions(data);
      setLoadedInteractions(true);
    } catch (error) {
      console.error('Error loading interactions:', error);
    }
  };

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded && !loadedInteractions) {
      loadInteractions();
    }
  };

  const handleQuestionResponse = async (questionIndex: number, question: string) => {
    const response = responses[questionIndex];
    if (!response?.trim()) {
      toast({
        title: 'Response Required',
        description: 'Please write a response before submitting.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitDevotionalInteraction(
        devotional.id,
        'reflection',
        question,
        response
      );

      setInteractions(prev => [...prev, result.interaction]);
      setResponses(prev => ({ ...prev, [questionIndex]: '' }));
      setActiveQuestion(null);
      
      onInteraction?.();
      
      toast({
        title: 'Response Submitted',
        description: 'Thank you for sharing your reflection!',
      });
    } catch (error) {
      console.error('Error submitting response:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit response. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPersonalizationBadges = () => {
    const context = devotional.personalization_context;
    if (!context) return [];
    
    const badges = [];
    
    if (context.spiritualWellbeing === 'growing') badges.push({ text: 'Growing', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' });
    else if (context.spiritualWellbeing === 'struggling') badges.push({ text: 'Supportive', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' });
    
    if (context.emotionalState === 'flourishing') badges.push({ text: 'Celebrating', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' });
    else if (context.emotionalState === 'struggling') badges.push({ text: 'Encouraging', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' });
    
    if (context.celebrations?.includes('answered_prayers')) badges.push({ text: 'Gratitude', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300' });
    
    return badges.slice(0, 2); // Show max 2 badges
  };

  const getInteractionForQuestion = (questionIndex: number) => {
    return interactions.find(i => 
      i.prompt === devotional.reflection_questions[questionIndex] && 
      i.interaction_type === 'reflection'
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Sparkles className="h-5 w-5 text-secondary" />
              <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20">
                AI Personalized
              </Badge>
              {getPersonalizationBadges().map((badge, i) => (
                <Badge key={i} variant="outline" className={badge.color}>
                  {badge.text}
                </Badge>
              ))}
            </div>
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl text-foreground">{devotional.title}</CardTitle>
              <ScriptureAudioPlayer 
                title={devotional.title}
                scripture={devotional.scripture_text}
                reflection={devotional.content}
                showSettings={true}
                size="sm"
                variant="outline"
              />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {devotional.created_at && format(new Date(devotional.created_at), 'MMMM d, yyyy')}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Scripture */}
          <div className="bg-muted rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Book className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">{devotional.scripture_reference}</span>
            </div>
            <blockquote className="text-foreground italic border-l-4 border-secondary pl-4">
              "{devotional.scripture_text}"
            </blockquote>
          </div>

          {/* Content preview */}
          <div className="prose dark:prose-invert prose-sm max-w-none text-foreground">
            <p className={isExpanded ? '' : 'line-clamp-3'}>
              {devotional.content}
            </p>
          </div>

          {/* Expandable content */}
          <Collapsible open={isExpanded} onOpenChange={handleExpand}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-center">
                {isExpanded ? (
                  <>
                    Show Less <ChevronUp className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  <>
                    Read Full Devotional & Reflect <ChevronDown className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="space-y-6 mt-4">
              {/* Reflection Questions */}
              {devotional.reflection_questions.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium text-foreground flex items-center">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Reflection Questions
                  </h3>
                  
                  {devotional.reflection_questions.map((question, index) => {
                    const interaction = getInteractionForQuestion(index);
                    const isActive = activeQuestion === index;
                    
                    return (
                      <div key={index} className="space-y-3">
                        <div className="bg-muted/50 rounded-lg p-4">
                          <p className="font-medium text-foreground mb-3">{question}</p>
                          
                          {interaction ? (
                            // Show previous response and AI feedback
                            <div className="space-y-3">
                              <div className="bg-blue-100 dark:bg-blue-950/60 rounded p-3 border-l-4 border-blue-500 dark:border-blue-600">
                                <div className="flex items-center space-x-2 mb-2">
                                  <User className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Your Response:</span>
                                </div>
                                <p className="text-foreground/80">{interaction.user_response}</p>
                              </div>
                              
                              {interaction.ai_feedback && (
                                <div className="bg-secondary/10 dark:bg-secondary/20 rounded p-3 border-l-4 border-secondary">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <Heart className="h-4 w-4 text-secondary" />
                                    <span className="text-sm font-medium text-secondary dark:text-secondary/90">Spiritual Guidance:</span>
                                  </div>
                                  <p className="text-foreground/80">{interaction.ai_feedback}</p>
                                </div>
                              )}
                            </div>
                          ) : isActive ? (
                            // Show input for new response
                            <div className="space-y-3">
                              <Textarea
                                placeholder="Share your thoughts and reflections..."
                                value={responses[index] || ''}
                                onChange={e => setResponses(prev => ({ ...prev, [index]: e.target.value }))}
                                rows={4}
                                className="resize-none"
                              />
                              <div className="flex space-x-2">
                                <Button
                                  onClick={() => handleQuestionResponse(index, question)}
                                  disabled={isSubmitting || !responses[index]?.trim()}
                                  size="sm"
                                >
                                  {isSubmitting ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Submitting...
                                    </>
                                  ) : (
                                    <>
                                      <Send className="mr-2 h-4 w-4" />
                                      Submit Reflection
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setActiveQuestion(null)}
                                  size="sm"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            // Show button to start responding
                            <Button
                              variant="outline"
                              onClick={() => setActiveQuestion(index)}
                              size="sm"
                              className="w-full"
                            >
                              <MessageSquare className="mr-2 h-4 w-4" />
                              Share Your Reflection
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </CardContent>
    </Card>
  );
}