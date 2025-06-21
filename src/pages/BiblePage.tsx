import { useState } from 'react';
import { motion } from 'framer-motion';
import { Book, BookOpen, Heart, Search, Calendar, BookMarked } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { BibleBrowser } from '@/components/bible/BibleBrowser';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ReadingPlansSection from '@/components/bible/ReadingPlansSection';
import { useToast } from '@/hooks/use-toast';
import { BibleVerse } from '@/lib/bible-api';
import { saveScriptureMemory, getCurrentUser } from '@/lib/supabase';
import { ScriptureMemory } from '@/lib/types';
import { format, addDays } from 'date-fns';

const BiblePage = () => {
  const [activeTab, setActiveTab] = useState('bible-browser');
  const { toast } = useToast();

  const handleAddToMemory = async (verse: BibleVerse) => {
    try {
      // Get the current authenticated user
      const user = await getCurrentUser();
      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'You must be logged in to add verses to memory.',
          variant: 'destructive',
        });
        return;
      }

      const memory: ScriptureMemory = {
        user_id: user.id,
        verse_reference: verse.reference,
        verse_text: verse.text,
        translation: verse.translation_id,
        memorized_level: 1,
        tags: [],
        notes: '',
        next_review: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
        last_practiced: format(new Date(), 'yyyy-MM-dd'),
      };
      
      await saveScriptureMemory(memory);
      toast({
        title: 'Added to Scripture Memory',
        description: `${verse.reference} has been added to your scripture memory collection.`,
      });
    } catch (error) {
      console.error('Error adding to memory:', error);
      toast({
        title: 'Error',
        description: 'Failed to add verse to memory.',
        variant: 'destructive',
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="bg-secondary/20 p-3 rounded-full">
                <BookOpen className="h-8 w-8 text-secondary" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Bible & Scripture</h1>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Explore Scripture, follow reading plans, and deepen your understanding of God's Word
              through guided study and reflection.
            </p>
          </motion.div>
        </div>

        {/* Main Tabs for Bible Page */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="bible-browser" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <span>Bible Browser</span>
            </TabsTrigger>
            <TabsTrigger value="reading-plans" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Reading Plans</span>
            </TabsTrigger>
          </TabsList>

          {/* Bible Browser Tab Content */}
          <TabsContent value="bible-browser">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-card rounded-lg shadow-sm border border-border p-6"
            >
              <BibleBrowser
                onAddToMemory={handleAddToMemory}
                showActions={true}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6"
            >
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 rounded-lg p-6 text-center">
                <Search className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Search Verses</h3>
                <p className="text-blue-700 dark:text-blue-400 text-sm">
                  Search for specific words or phrases across the entire Bible
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 rounded-lg p-6 text-center">
                <Book className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-3" />
                <h3 className="font-semibold text-green-900 dark:text-green-300 mb-2">Browse Books</h3>
                <p className="text-green-700 dark:text-green-400 text-sm">
                  Navigate through Old and New Testament books chapter by chapter
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 rounded-lg p-6 text-center">
                <Heart className="h-8 w-8 text-red-600 dark:text-red-400 mx-auto mb-3" />
                <h3 className="font-semibold text-red-900 dark:text-red-300 mb-2">Save Favorites</h3>
                <p className="text-red-700 dark:text-red-400 text-sm">
                  Add meaningful verses to your scripture memory collection
                </p>
              </div>
            </motion.div>
          </TabsContent>

          {/* Reading Plans Tab Content */}
          <TabsContent value="reading-plans">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <ReadingPlansSection />
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default BiblePage;