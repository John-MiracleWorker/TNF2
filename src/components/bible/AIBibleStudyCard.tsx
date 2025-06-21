// Update the import section to add TextToSpeechButton
import { useState, useEffect } from 'react';
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
import { AIBibleStudy, updateAIBibleStudyNotes } from '@/lib/ai-bible-study';
import { 
  getBibleStudyInteractions, 
  submitBibleStudyInteraction, 
  type BibleStudyInteraction 
} from '@/lib/bible-study-interactions';

interface AIBibleStudyCardProps {
  study: AIBibleStudy;
  onUpdate?: () => void;
}

export function AIBibleStudyCard({ study, onUpdate }: AIBibleStudyCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(study.user_notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [interactions, setInteractions] = useState<BibleStudyInteraction[]>([]);
  const [activeQuestion, setActiveQuestion] = useState<number | null>(null);
  const [responses, setResponses] = useState<{ [key: number]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadedInteractions, setLoadedInteractions] = useState(false);
  const { toast } = useToast();

  const loadInteractions = async () => {
    if (loadedInteractions) return;
    
    try {
      const data = await getBibleStudyInteractions(study.id);
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

  const handleSaveNotes = async () => {
    if (!study.id) return;
    
    setIsSaving(true);
    try {
      await updateAIBibleStudyNotes(study.id, notes);
      setIsEditing(false);
      onUpdate?.();
      toast({
        title: 'Notes Saved',
        description: 'Your Bible study notes have been saved.',
      });
    } catch (error) {
      console.error('Error saving notes:', error);
      toast({
        title: 'Error',
        description: 'Failed to save notes. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
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
      const result = await submitBibleStudyInteraction(
        study.id,
        'reflection',
        question,
        response
      );

      setInteractions(prev => [...prev, result.interaction]);
      setResponses(prev => ({ ...prev, [questionIndex]: '' }));
      setActiveQuestion(null);
      
      onUpdate?.();
      
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
    const context = study.personalization_context;
    if (!context) return [];
    
    const badges = [];
    
    if (context.spiritualState === 'thriving') badges.push({ text: 'Growth-Focused', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' });
    else if (context.spiritualState === 'seeking') badges.push({ text: 'Guidance-Focused', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' });
    
    if (context.emotionalState === 'positive') badges.push({ text: 'Encouraging', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' });
    else if (context.emotionalState === 'challenged') badges.push({ text: 'Comforting', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' });
    
    if (context.currentChallenges?.length > 0) {
      const challenge = context.currentChallenges[0];
      badges.push({ text: `${challenge.charAt(0).toUpperCase() + challenge.slice(1)}-Related`, color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300' });
    }
    
    return badges.slice(0, 2); // Show max 2 badges
  };

  const getInteractionForQuestion = (questionIndex: number) => {
    return interactions.find(i => 
      i.prompt === study.reflection_questions[questionIndex] && 
      i.interaction_type === 'reflection'
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Sparkles className="h-5 w-5 text-gold dark:text-secondary" />
              <Badge variant="outline" className="bg-gold/10 text-gold border-gold/20 dark:bg-secondary/20 dark:text-secondary dark:border-secondary/30">
                AI Personalized
              </Badge>
              {getPersonalizationBadges().map((badge, i) => (
                <Badge key={i} variant="outline" className={badge.color}>
                  {badge.text}
                </Badge>
              ))}
            </div>
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl text-foreground">{study.title}</CardTitle>
              <ScriptureAudioPlayer
                title={study.title}
                scripture={study.scripture_text}
                reflection={study.content}
                showSettings={true}
                size="sm"
                variant="outline"
              />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {study.created_at && format(new Date(study.created_at), 'MMMM d, yyyy')}
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
              <span className="text-sm font-medium text-muted-foreground">{study.scripture_reference}</span>
            </div>
            <blockquote className="text-foreground italic border-l-4 border-secondary pl-4">
              "{study.scripture_text}"
            </blockquote>
          </div>

          {/* Content preview */}
          <div className="prose dark:prose-invert prose-sm max-w-none text-muted-foreground">
            <p className={isExpanded ? '' : 'line-clamp-3'}>
              {study.content}
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
                    Read Full Study & Questions <ChevronDown className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="space-y-6 mt-4">
              {/* Reflection Questions */}
              {study.reflection_questions?.length > 0 && (
                <div className="space-y-4 bg-muted/50 rounded-lg p-4">
                  <h3 className="font-medium text-foreground flex items-center">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Reflection Questions
                  </h3>
                  
                  {study.reflection_questions.map((question, index) => {
                    const interaction = getInteractionForQuestion(index);
                    const isActive = activeQuestion === index;
                    
                    return (
                      <div key={index} className="space-y-3">
                        <div className="bg-card rounded-lg p-4 border border-border">
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
                                    <Heart className="h-4 w-4 text-secondary dark:text-secondary/90" />
                                    <span className="text-sm font-medium text-secondary dark:text-secondary/90">Spiritual Insight:</span>
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
                                  variant="default"
                                >
                                  {isSubmitting ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Submitting...
                                    </>
                                  ) : (
                                    <>
                                      <Send className="mr-2 h-4 w-4" />
                                      Submit Response
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
              
              {/* Notes Section */}
              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-foreground">Your Notes</h3>
                  {!isEditing && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      {study.user_notes ? 'Edit Notes' : 'Add Notes'}
                    </Button>
                  )}
                </div>
                
                {isEditing ? (
                  <div className="space-y-3">
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Write your thoughts, insights, and application ideas here..."
                      rows={6}
                      className="resize-none"
                    />
                    <div className="flex space-x-2">
                      <Button
                        onClick={handleSaveNotes}
                        disabled={isSaving}
                        size="sm"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Notes
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          setNotes(study.user_notes || '');
                        }}
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-card rounded-lg p-4 border border-border">
                    {study.user_notes ? (
                      <div className="prose dark:prose-invert prose-sm max-w-none text-foreground/80 whitespace-pre-line">
                        {study.user_notes}
                      </div>
                    ) : (
                      <p className="text-muted-foreground italic">
                        No notes yet. Click "Add Notes" to write your thoughts about this study.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </CardContent>
    </Card>
  );
}