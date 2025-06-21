import { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Book, Calendar, MessageSquare, Search, Plus, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { JournalEntry as JournalEntryType } from '@/lib/types';
import { JournalEntry } from '@/components/journal/JournalEntry';
import { JournalEntryDetail } from '@/components/journal/JournalEntryDetail';
import { MoodAnalysisCard } from '@/components/journal/MoodAnalysisCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { AuthContext } from '@/App';
import { getJournalEntries } from '@/lib/journal';
import { useToast } from '@/hooks/use-toast';

const JournalPage = () => {
  const { session } = useContext(AuthContext);
  const [entries, setEntries] = useState<JournalEntryType[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<JournalEntryType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<JournalEntryType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (session) {
      loadEntries();
    } else {
      setIsLoading(false);
    }
  }, [session]);

  async function loadEntries() {
    setIsLoading(true);
    try {
      const data = await getJournalEntries();
      console.log("Loaded journal entries:", data.length);
      setEntries(data);
      setFilteredEntries(data);
    } catch (error) {
      console.error('Failed to load journal entries:', error);
      toast({
        title: 'Error',
        description: 'Failed to load journal entries. Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredEntries(entries);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = entries.filter(entry => {
      return (
        entry.title?.toLowerCase().includes(query) ||
        entry.content?.toLowerCase().includes(query) ||
        entry.summary?.toLowerCase().includes(query) ||
        (entry.tags && entry.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    });

    setFilteredEntries(filtered);
  }, [searchQuery, entries]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleViewEntry = (entry: JournalEntryType) => {
    console.log("Viewing entry:", entry.title);
    setSelectedEntry(entry);
  };

  const handleCloseDetail = () => {
    console.log("Closing entry detail");
    setSelectedEntry(null);
  };

  const handleAnalysisComplete = () => {
    toast({
      title: 'Journal Analysis Complete',
      description: 'Your journal entries have been analyzed for patterns, emotions, and spiritual themes.',
    });
  };

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        
        <main className="flex-grow pt-24 pb-16">
          <div className="container-custom mx-auto max-w-4xl">
            <div className="bg-card rounded-lg shadow-md p-6 text-center">
              <Book className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Sign in to access your journal</h3>
              <p className="text-muted-foreground mb-6">
                Please sign in or create an account to view your journal entries.
              </p>
              <Button 
                onClick={() => window.location.href = '/login?redirect=/journal'}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Sign In
              </Button>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="container-custom mx-auto max-w-4xl">
          <motion.div 
            className="mb-6 text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-bold text-foreground mb-2">Your Faith Journal</h1>
            <p className="text-muted-foreground">Reflections and insights from your spiritual journey</p>
          </motion.div>
          
          {/* Tab Navigation */}
          <div className="mb-4">
            <Tabs value="journal" className="w-full">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger 
                  value="chat" 
                  className="flex items-center space-x-2"
                  asChild
                >
                  <Link to="/chat">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat
                  </Link>
                </TabsTrigger>
                <TabsTrigger value="journal" className="bg-secondary text-secondary-foreground">
                  <Book className="h-4 w-4 mr-2" />
                  Journal
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="md:col-span-2 bg-card rounded-lg shadow-md p-6">
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    className="pl-9"
                    placeholder="Search your journal entries..."
                    value={searchQuery}
                    onChange={handleSearch}
                  />
                </div>
                <Button 
                  variant="outline" 
                  className="border-primary text-foreground hover:bg-muted"
                  onClick={() => loadEntries()}
                >
                  Refresh
                </Button>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              ) : filteredEntries.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {filteredEntries.map((entry) => (
                    <JournalEntry
                      key={entry.id}
                      entry={entry}
                      onView={handleViewEntry}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Book className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No journal entries yet</h3>
                  <p className="text-muted-foreground mb-6">
                    As you chat with TrueNorth, insights and reflections will be automatically added to your journal.
                  </p>
                  <Button 
                    onClick={() => window.location.href = '/chat'}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Start a Chat
                  </Button>
                </div>
              )}
            </div>
            
            <div className="md:col-span-1">
              <MoodAnalysisCard 
                onAnalysisComplete={handleAnalysisComplete}
                className="sticky top-4"
              />
            </div>
          </div>
        </div>
      </main>
      
      {/* Journal entry detail view */}
      <JournalEntryDetail 
        entry={selectedEntry} 
        onClose={handleCloseDetail}
      />
      
      <Footer />
    </div>
  );
};

export default JournalPage;