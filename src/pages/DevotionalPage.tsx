import { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Sparkles, Plus } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { AIDevotionalCard } from '@/components/devotionals/AIDevotionalCard';
import { AIDevotionalGenerator } from '@/components/devotionals/AIDevotionalGenerator';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AuthContext } from '@/App';
import { useToast } from '@/hooks/use-toast';
import { getAIDevotionals, AIDevotional } from '@/lib/ai-devotionals';

const DevotionalPage = () => {
  const { session } = useContext(AuthContext);
  const [aiDevotionals, setAIDevotionals] = useState<AIDevotional[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadDevotionals();
  }, [session]);

  const loadDevotionals = async () => {
    setIsLoading(true);
    try {
      const data = await getAIDevotionals();
      setAIDevotionals(data);
    } catch (error) {
      console.error('Error loading AI devotionals:', error);
      toast({
        title: 'Error',
        description: 'Failed to load devotionals',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">AI Personalized Devotionals</h1>
          <p className="text-muted-foreground">
            Receive spiritual guidance tailored to your unique journey
          </p>
        </div>
        
        <AIDevotionalGenerator onDevotionalGenerated={loadDevotionals} />
        
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading devotionals...</p>
            </div>
          ) : aiDevotionals.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">Your Personalized Devotionals</h2>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadDevotionals}
                  className="flex items-center gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Refresh</span>
                </Button>
              </div>
              
              <div className="space-y-6">
                {aiDevotionals.map((devotional) => (
                  <AIDevotionalCard
                    key={devotional.id}
                    devotional={devotional}
                    onInteraction={loadDevotionals}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <Sparkles className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No personalized devotionals yet</h3>
              <p className="text-muted-foreground mb-6">
                Generate your first AI-powered devotional tailored to your spiritual journey
              </p>
              <Button 
                onClick={() => {
                  const generator = document.querySelector('.devotional-generator');
                  generator?.scrollIntoView({ behavior: 'smooth' });
                }}
                variant="secondary"
                className="text-secondary-foreground"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create My First Devotional
              </Button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DevotionalPage;