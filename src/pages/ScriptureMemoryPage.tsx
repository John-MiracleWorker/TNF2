import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Book, Search, Plus, Tag, Check, X, Edit, Trash2, Calendar, Sparkles, Trophy, Gamepad2, Star } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GamificationDashboard } from '@/components/scripture/GameificationDashboard';
import { PracticeGame } from '@/components/scripture/PracticeGame';
import { BibleBrowser } from '@/components/bible/BibleBrowser';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { getScriptureMemories, saveScriptureMemory, updateScriptureMemory, getCurrentUser } from '@/lib/supabase';
import { getUserStats, savePracticeSession, updateUserStats } from '@/lib/supabase-gamification';
import { ScriptureMemory } from '@/lib/types';
import { BibleVerse } from '@/lib/bible-api';
import { UserStats, PracticeSession, PRACTICE_GAMES, POINTS } from '@/lib/gamification';
import { format, addDays } from 'date-fns';

const memoryLevels = [
  { value: '1', label: 'Just Started' },
  { value: '2', label: 'Somewhat Familiar' },
  { value: '3', label: 'Nearly Memorized' },
  { value: '4', label: 'Fully Memorized' },
  { value: '5', label: 'Long-term Memory' },
];

const bibleTranslations = [
  { value: 'NIV', label: 'New International Version' },
  { value: 'ESV', label: 'English Standard Version' },
  { value: 'KJV', label: 'King James Version' },
  { value: 'NASB', label: 'New American Standard Bible' },
  { value: 'NLT', label: 'New Living Translation' },
];

const ScriptureMemoryPage = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [memories, setMemories] = useState<ScriptureMemory[]>([]);
  const [filteredMemories, setFilteredMemories] = useState<ScriptureMemory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMemory, setSelectedMemory] = useState<ScriptureMemory | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showBibleBrowser, setShowBibleBrowser] = useState(false);
  const [showPracticeGame, setShowPracticeGame] = useState(false);
  const [selectedGameType, setSelectedGameType] = useState<string>('');
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [newMemory, setNewMemory] = useState<ScriptureMemory>({
    verse_reference: '',
    verse_text: '',
    translation: 'NIV',
    memorized_level: 1,
    tags: [],
    notes: '',
    mastery_score: 0.0,
    practice_count: 0,
    favorite: false,
  });
  const [newTag, setNewTag] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadScriptureMemories();
    loadUserStats();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredMemories(memories);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = memories.filter(
        memory => 
          memory.verse_reference.toLowerCase().includes(query) ||
          memory.verse_text.toLowerCase().includes(query) ||
          (memory.tags && memory.tags.some(tag => tag.toLowerCase().includes(query)))
      );
      setFilteredMemories(filtered);
    }
  }, [searchQuery, memories]);

  const loadScriptureMemories = async () => {
    setIsLoading(true);
    try {
      const data = await getScriptureMemories();
      setMemories(data);
      setFilteredMemories(data);
    } catch (error) {
      console.error('Error loading scripture memories:', error);
      toast({
        title: 'Error',
        description: 'Failed to load scripture memories',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserStats = async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        const stats = await getUserStats(user.id);
        setUserStats(stats);
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const handleVerseFromBible = (verse: BibleVerse) => {
    setNewMemory(prev => ({
      ...prev,
      verse_reference: verse.reference,
      verse_text: verse.text,
      translation: verse.translation_id,
    }));
    setShowBibleBrowser(false);
    toast({
      title: 'Verse Selected',
      description: `${verse.reference} has been added to your new memory`,
    });
  };

  const handleCreateMemory = async () => {
    if (!newMemory.verse_reference.trim() || !newMemory.verse_text.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const user = await getCurrentUser();
      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'You must be logged in to add verses to memory.',
          variant: 'destructive',
        });
        return;
      }

      const daysToAdd = newMemory.memorized_level === 1 ? 1 :
                         newMemory.memorized_level === 2 ? 3 :
                         newMemory.memorized_level === 3 ? 7 :
                         newMemory.memorized_level === 4 ? 14 : 30;
      
      const nextReview = format(addDays(new Date(), daysToAdd), 'yyyy-MM-dd');
      
      const memory: ScriptureMemory = {
        ...newMemory,
        user_id: user.id,
        next_review: nextReview,
        last_practiced: format(new Date(), 'yyyy-MM-dd'),
      };
      
      const savedMemory = await saveScriptureMemory(memory);
      setMemories(prev => [savedMemory, ...prev]);

      // Award points for adding a verse
      await updateUserStats(user.id, POINTS.VERSE_ADDED, false, false);
      await loadUserStats();
      
      setNewMemory({
        verse_reference: '',
        verse_text: '',
        translation: 'NIV',
        memorized_level: 1,
        tags: [],
        notes: '',
        mastery_score: 0.0,
        practice_count: 0,
        favorite: false,
      });
      
      toast({
        title: 'Success',
        description: `Scripture verse added! You earned ${POINTS.VERSE_ADDED} points.`,
      });
    } catch (error) {
      console.error('Error saving scripture memory:', error);
      toast({
        title: 'Error',
        description: 'Failed to save scripture verse',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateMemory = async () => {
    if (!selectedMemory) return;
    
    try {
      const daysToAdd = selectedMemory.memorized_level === 1 ? 1 :
                         selectedMemory.memorized_level === 2 ? 3 :
                         selectedMemory.memorized_level === 3 ? 7 :
                         selectedMemory.memorized_level === 4 ? 14 : 30;
      
      const nextReview = format(addDays(new Date(), daysToAdd), 'yyyy-MM-dd');
      
      const updatedMemory = {
        ...selectedMemory,
        next_review: nextReview,
        last_practiced: format(new Date(), 'yyyy-MM-dd'),
        practice_count: (selectedMemory.practice_count || 0) + 1,
      };

      // Check if verse was newly memorized (level 4+)
      const wasMemorized = selectedMemory.memorized_level >= 4;
      const isNowMemorized = updatedMemory.memorized_level >= 4;
      
      const result = await updateScriptureMemory(updatedMemory);
      setMemories(prev => 
        prev.map(memory => 
          memory.id === result.id ? result : memory
        )
      );

      // Update user stats if verse was newly memorized
      if (!wasMemorized && isNowMemorized) {
        const user = await getCurrentUser();
        if (user) {
          await updateUserStats(user.id, POINTS.VERSE_MEMORIZED, true, true);
          await loadUserStats();
          toast({
            title: 'Verse Memorized!',
            description: `Congratulations! You earned ${POINTS.VERSE_MEMORIZED} points for memorizing this verse.`,
          });
        }
      }
      
      setEditMode(false);
      toast({
        title: 'Success',
        description: 'Scripture memory updated successfully',
      });
    } catch (error) {
      console.error('Error updating scripture memory:', error);
      toast({
        title: 'Error',
        description: 'Failed to update scripture memory',
        variant: 'destructive',
      });
    }
  };

  const startPracticeGame = (memory: ScriptureMemory, gameType: string) => {
    setSelectedMemory(memory);
    setSelectedGameType(gameType);
    setShowPracticeGame(true);
  };

  const handlePracticeComplete = async (session: PracticeSession) => {
    try {
      // Get current user and add user_id to session
      const user = await getCurrentUser();
      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'You must be logged in to save practice sessions.',
          variant: 'destructive',
        });
        return;
      }

      // Add user_id to session before saving
      const sessionWithUserId = {
        ...session,
        user_id: user.id,
      };

      // Save practice session
      await savePracticeSession(sessionWithUserId);

      // Update user stats
      await updateUserStats(user.id, session.points_earned || 0, true, false);
      await loadUserStats();

      // Update scripture memory practice count and mastery score
      if (selectedMemory) {
        const updatedMemory = {
          ...selectedMemory,
          practice_count: (selectedMemory.practice_count || 0) + 1,
          mastery_score: session.accuracy_score || 0,
          last_practiced: format(new Date(), 'yyyy-MM-dd'),
        };
        
        await updateScriptureMemory(updatedMemory);
        setMemories(prev => 
          prev.map(memory => 
            memory.id === updatedMemory.id ? updatedMemory : memory
          )
        );
      }

      setShowPracticeGame(false);
      setSelectedMemory(null);
      
      toast({
        title: 'Practice Complete!',
        description: `You earned ${session.points_earned} points! Accuracy: ${Math.round((session.accuracy_score || 0) * 100)}%`,
      });
    } catch (error) {
      console.error('Error saving practice session:', error);
      toast({
        title: 'Error',
        description: 'Failed to save practice session',
        variant: 'destructive',
      });
    }
  };

  const addTag = (memoryState: 'new' | 'edit') => {
    if (!newTag.trim()) return;
    
    if (memoryState === 'new') {
      setNewMemory(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()]
      }));
    } else if (selectedMemory) {
      setSelectedMemory(prev => ({
        ...prev!,
        tags: [...(prev!.tags || []), newTag.trim()]
      }));
    }
    
    setNewTag('');
  };

  const removeTag = (tag: string, memoryState: 'new' | 'edit') => {
    if (memoryState === 'new') {
      setNewMemory(prev => ({
        ...prev,
        tags: prev.tags?.filter(t => t !== tag)
      }));
    } else if (selectedMemory) {
      setSelectedMemory(prev => ({
        ...prev!,
        tags: prev!.tags?.filter(t => t !== tag)
      }));
    }
  };

  const getMemoryLevelLabel = (level: number) => {
    const found = memoryLevels.find(l => parseInt(l.value) === level);
    return found ? found.label : 'Unknown';
  };

  const getMasteryColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600';
    if (score >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Show practice game if active
  if (showPracticeGame && selectedMemory) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto py-8">
          <PracticeGame
            scripture={selectedMemory}
            gameType={selectedGameType}
            onComplete={handlePracticeComplete}
            onCancel={() => {
              setShowPracticeGame(false);
              setSelectedMemory(null);
            }}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-navy mb-2">Scripture Memory</h1>
            <p className="text-navy/70">
              Memorize scripture with gamified practice and track your progress
            </p>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setShowBibleBrowser(true)}
              className="border-gold text-gold hover:bg-gold/10"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Browse Bible
            </Button>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-gold text-navy hover:bg-gold/90">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Verse
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Add Scripture Verse</DialogTitle>
                  <DialogDescription>
                    Add a new verse to memorize or browse the Bible to find one
                  </DialogDescription>
                </DialogHeader>
                
                <Tabs defaultValue="manual" className="w-full">
                  <TabsList className="grid grid-cols-2 mb-4">
                    <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                    <TabsTrigger value="browse">Browse Bible</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="manual" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="verse_reference">Reference</Label>
                      <Input
                        id="verse_reference"
                        placeholder="e.g., John 3:16"
                        value={newMemory.verse_reference}
                        onChange={e => setNewMemory(prev => ({ ...prev, verse_reference: e.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="translation">Translation</Label>
                      <Select
                        value={newMemory.translation}
                        onValueChange={value => setNewMemory(prev => ({ ...prev, translation: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select translation" />
                        </SelectTrigger>
                        <SelectContent>
                          {bibleTranslations.map(translation => (
                            <SelectItem key={translation.value} value={translation.value}>
                              {translation.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="verse_text">Verse Text</Label>
                      <Textarea
                        id="verse_text"
                        placeholder="Enter the scripture text here..."
                        rows={4}
                        value={newMemory.verse_text}
                        onChange={e => setNewMemory(prev => ({ ...prev, verse_text: e.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="memorized_level">Memory Level</Label>
                      <Select
                        value={newMemory.memorized_level.toString()}
                        onValueChange={value => setNewMemory(prev => ({ ...prev, memorized_level: parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select memory level" />
                        </SelectTrigger>
                        <SelectContent>
                          {memoryLevels.map(level => (
                            <SelectItem key={level.value} value={level.value}>
                              {level.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Tags</Label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {newMemory.tags?.map((tag, index) => (
                          <Badge key={index} variant="outline" className="bg-navy/5">
                            {tag}
                            <button
                              onClick={() => removeTag(tag, 'new')}
                              className="ml-1 text-navy/60 hover:text-navy"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a tag"
                          value={newTag}
                          onChange={e => setNewTag(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addTag('new')}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => addTag('new')}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        placeholder="Add any personal notes about this verse..."
                        rows={3}
                        value={newMemory.notes}
                        onChange={e => setNewMemory(prev => ({ ...prev, notes: e.target.value }))}
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="browse" className="space-y-4">
                    <BibleBrowser
                      onAddToMemory={handleVerseFromBible}
                      showActions={true}
                    />
                  </TabsContent>
                </Tabs>
                
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button onClick={handleCreateMemory}>Add Verse</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Bible Browser Modal */}
        <Dialog open={showBibleBrowser} onOpenChange={setShowBibleBrowser}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Browse Bible</DialogTitle>
              <DialogDescription>
                Search and browse scripture to add to your memory collection
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[60vh]">
              <BibleBrowser
                onAddToMemory={async (verse) => {
                  try {
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
                      mastery_score: 0.0,
                      practice_count: 0,
                      favorite: false,
                    };
                    
                    const savedMemory = await saveScriptureMemory(memory);
                    setMemories(prev => [savedMemory, ...prev]);
                    
                    // Award points
                    await updateUserStats(user.id, POINTS.VERSE_ADDED, false, false);
                    await loadUserStats();
                    
                    setShowBibleBrowser(false);
                    toast({
                      title: 'Success',
                      description: `${verse.reference} added to scripture memory! You earned ${POINTS.VERSE_ADDED} points.`,
                    });
                  } catch (error) {
                    console.error('Error adding verse to memory:', error);
                    toast({
                      title: 'Error',
                      description: 'Failed to add verse to memory',
                      variant: 'destructive',
                    });
                  }
                }}
                showActions={true}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBibleBrowser(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <Trophy className="h-4 w-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="practice" className="flex items-center space-x-2">
              <Gamepad2 className="h-4 w-4" />
              <span>Practice</span>
            </TabsTrigger>
            <TabsTrigger value="library" className="flex items-center space-x-2">
              <Book className="h-4 w-4" />
              <span>My Library</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <GamificationDashboard
              onPractice={() => setActiveTab('practice')}
              onViewAchievements={() => setActiveTab('dashboard')}
              onViewChallenges={() => setActiveTab('dashboard')}
            />
          </TabsContent>

          <TabsContent value="practice" className="space-y-6">
            {memories.length > 0 ? (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-navy mb-2">Practice Your Verses</h2>
                  <p className="text-navy/70">Choose a game mode to practice your scripture memory</p>
                </div>

                {/* Practice Games Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {PRACTICE_GAMES.map((game) => (
                    <Card key={game.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <div className="bg-gold/20 p-2 rounded-lg mr-3">
                            <Gamepad2 className="h-5 w-5 text-gold" />
                          </div>
                          {game.name}
                        </CardTitle>
                        <p className="text-navy/70">{game.description}</p>
                        <Badge variant="outline" className={`w-fit ${
                          game.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                          game.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {game.difficulty}
                        </Badge>
                      </CardHeader>
                      <CardContent>
                        <Select onValueChange={(verseId) => {
                          const memory = memories.find(m => m.id === verseId);
                          if (memory) startPracticeGame(memory, game.id);
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a verse to practice" />
                          </SelectTrigger>
                          <SelectContent>
                            {memories.map(memory => (
                              <SelectItem key={memory.id} value={memory.id!}>
                                <div className="flex justify-between items-center w-full">
                                  <span>{memory.verse_reference}</span>
                                  <div className="flex items-center space-x-2 ml-4">
                                    <Badge variant="outline" className="text-xs">
                                      {getMemoryLevelLabel(memory.memorized_level)}
                                    </Badge>
                                    {memory.mastery_score !== undefined && memory.mastery_score > 0 && (
                                      <span className={`text-xs ${getMasteryColor(memory.mastery_score)}`}>
                                        {Math.round(memory.mastery_score * 100)}%
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Book className="h-16 w-16 text-navy/20 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-navy mb-2">No verses to practice</h3>
                  <p className="text-navy/60 mb-6">Add some verses to your memory collection to start practicing</p>
                  <Button onClick={() => setActiveTab('library')} className="bg-gold text-navy hover:bg-gold/90">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Verse
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="library" className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-2/3 space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-navy/40 h-4 w-4" />
                  <Input
                    placeholder="Search verses..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                
                {/* Memory list */}
                <div className="space-y-4">
                  {isLoading ? (
                    <div className="py-20 text-center text-navy/50">Loading scripture verses...</div>
                  ) : filteredMemories.length > 0 ? (
                    filteredMemories.map((memory) => (
                      <motion.div
                        key={memory.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card 
                          className="hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => {
                            setSelectedMemory(memory);
                            setEditMode(false);
                          }}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-navy text-xl flex items-center">
                                {memory.verse_reference}
                                {memory.favorite && (
                                  <Star className="h-4 w-4 ml-2 text-gold fill-gold" />
                                )}
                              </CardTitle>
                              <div className="flex items-center space-x-2">
                                <Badge className={`
                                  ${memory.memorized_level >= 4 ? 'bg-green-100 text-green-800 border-green-200' : 
                                    memory.memorized_level === 3 ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                    'bg-blue-100 text-blue-800 border-blue-200'}
                                `}>
                                  {getMemoryLevelLabel(memory.memorized_level)}
                                </Badge>
                                {memory.mastery_score !== undefined && memory.mastery_score > 0 && (
                                  <Badge variant="outline" className={getMasteryColor(memory.mastery_score)}>
                                    {Math.round(memory.mastery_score * 100)}%
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-xs text-navy/50 mt-1 flex items-center space-x-4">
                              <span>{memory.translation}</span>
                              {memory.practice_count !== undefined && (
                                <span>Practiced: {memory.practice_count} times</span>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="pb-2">
                            <p className="text-navy/80 italic line-clamp-2">"{memory.verse_text}"</p>
                          </CardContent>
                          <CardFooter className="flex justify-between">
                            <div className="flex flex-wrap gap-1">
                              {memory.tags && memory.tags.map((tag, i) => (
                                <Badge key={i} variant="outline" className="bg-navy/5 text-navy/70">
                                  <Tag className="h-3 w-3 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            {memory.next_review && (
                              <div className="text-xs text-navy/50 flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                Review: {format(new Date(memory.next_review), 'MMM d, yyyy')}
                              </div>
                            )}
                          </CardFooter>
                        </Card>
                      </motion.div>
                    ))
                  ) : (
                    <div className="py-20 text-center">
                      <Book className="h-16 w-16 text-navy/20 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-navy mb-2">No scripture verses found</h3>
                      <p className="text-navy/60 mb-6">
                        {searchQuery.trim() !== '' 
                          ? "No verses match your search criteria"
                          : "Start by adding your first verse to memorize or browse the Bible"
                        }
                      </p>
                      <div className="flex gap-2 justify-center">
                        <Button onClick={() => setShowBibleBrowser(true)} variant="outline">
                          <Sparkles className="mr-2 h-4 w-4" />
                          Browse Bible
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button>
                              <Plus className="mr-2 h-4 w-4" />
                              Add Scripture Verse
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                              <DialogTitle>Add Scripture Verse</DialogTitle>
                              <DialogDescription>
                                Add a new verse to memorize or browse the Bible to find one
                              </DialogDescription>
                            </DialogHeader>
                            
                            <Tabs defaultValue="manual" className="w-full">
                              <TabsList className="grid grid-cols-2 mb-4">
                                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                                <TabsTrigger value="browse">Browse Bible</TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="manual" className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="verse_reference_empty">Reference</Label>
                                  <Input
                                    id="verse_reference_empty"
                                    placeholder="e.g., John 3:16"
                                    value={newMemory.verse_reference}
                                    onChange={e => setNewMemory(prev => ({ ...prev, verse_reference: e.target.value }))}
                                  />
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="translation_empty">Translation</Label>
                                  <Select
                                    value={newMemory.translation}
                                    onValueChange={value => setNewMemory(prev => ({ ...prev, translation: value }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select translation" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {bibleTranslations.map(translation => (
                                        <SelectItem key={translation.value} value={translation.value}>
                                          {translation.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="verse_text_empty">Verse Text</Label>
                                  <Textarea
                                    id="verse_text_empty"
                                    placeholder="Enter the scripture text here..."
                                    rows={4}
                                    value={newMemory.verse_text}
                                    onChange={e => setNewMemory(prev => ({ ...prev, verse_text: e.target.value }))}
                                  />
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="memorized_level_empty">Memory Level</Label>
                                  <Select
                                    value={newMemory.memorized_level.toString()}
                                    onValueChange={value => setNewMemory(prev => ({ ...prev, memorized_level: parseInt(value) }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select memory level" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {memoryLevels.map(level => (
                                        <SelectItem key={level.value} value={level.value}>
                                          {level.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label>Tags</Label>
                                  <div className="flex flex-wrap gap-2 mb-2">
                                    {newMemory.tags?.map((tag, index) => (
                                      <Badge key={index} variant="outline" className="bg-navy/5">
                                        {tag}
                                        <button
                                          onClick={() => removeTag(tag, 'new')}
                                          className="ml-1 text-navy/60 hover:text-navy"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </Badge>
                                    ))}
                                  </div>
                                  <div className="flex gap-2">
                                    <Input
                                      placeholder="Add a tag"
                                      value={newTag}
                                      onChange={e => setNewTag(e.target.value)}
                                      onKeyDown={e => e.key === 'Enter' && addTag('new')}
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => addTag('new')}
                                    >
                                      Add
                                    </Button>
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="notes_empty">Notes</Label>
                                  <Textarea
                                    id="notes_empty"
                                    placeholder="Add any personal notes about this verse..."
                                    rows={3}
                                    value={newMemory.notes}
                                    onChange={e => setNewMemory(prev => ({ ...prev, notes: e.target.value }))}
                                  />
                                </div>
                              </TabsContent>
                              
                              <TabsContent value="browse" className="space-y-4">
                                <BibleBrowser
                                  onAddToMemory={handleVerseFromBible}
                                  showActions={true}
                                />
                              </TabsContent>
                            </Tabs>
                            
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                              </DialogClose>
                              <DialogClose asChild>
                                <Button onClick={handleCreateMemory}>Add Verse</Button>
                              </DialogClose>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Scripture detail view */}
              <div className="w-full md:w-1/3">
                {selectedMemory ? (
                  <Card className="sticky top-4">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-navy text-xl">
                          {editMode ? (
                            <Input
                              value={selectedMemory.verse_reference}
                              onChange={e => setSelectedMemory(prev => ({ ...prev!, verse_reference: e.target.value }))}
                              className="mt-1"
                            />
                          ) : (
                            selectedMemory.verse_reference
                          )}
                        </CardTitle>
                        <div className="flex space-x-2">
                          {editMode ? (
                            <>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => setEditMode(false)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm"
                                onClick={handleUpdateMemory}
                              >
                                Save
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => setEditMode(true)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <div className="text-sm text-navy/70">
                          {editMode ? (
                            <Select
                              value={selectedMemory.translation}
                              onValueChange={value => setSelectedMemory(prev => ({ ...prev!, translation: value }))}
                            >
                              <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Select translation" />
                              </SelectTrigger>
                              <SelectContent>
                                {bibleTranslations.map(translation => (
                                  <SelectItem key={translation.value} value={translation.value}>
                                    {translation.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <>
                              <span className="font-medium">{selectedMemory.translation}</span>
                            </>
                          )}
                        </div>
                        <Badge className={`
                          ${selectedMemory.memorized_level >= 4 ? 'bg-green-100 text-green-800 border-green-200' : 
                            selectedMemory.memorized_level === 3 ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                            'bg-blue-100 text-blue-800 border-blue-200'}
                        `}>
                          {getMemoryLevelLabel(selectedMemory.memorized_level)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-sm font-medium text-navy/70 mb-2">Verse</h3>
                          {editMode ? (
                            <Textarea
                              value={selectedMemory.verse_text}
                              onChange={e => setSelectedMemory(prev => ({ ...prev!, verse_text: e.target.value }))}
                              rows={4}
                            />
                          ) : (
                            <blockquote className="italic border-l-4 border-gold pl-4 py-2 text-navy/80">
                              "{selectedMemory.verse_text}"
                            </blockquote>
                          )}
                        </div>
                        
                        {/* Practice Stats */}
                        <div className="grid grid-cols-2 gap-4 p-3 bg-navy/5 rounded-lg">
                          <div className="text-center">
                            <div className="text-lg font-bold text-navy">{selectedMemory.practice_count || 0}</div>
                            <div className="text-xs text-navy/60">Practice Sessions</div>
                          </div>
                          <div className="text-center">
                            <div className={`text-lg font-bold ${getMasteryColor(selectedMemory.mastery_score || 0)}`}>
                              {Math.round((selectedMemory.mastery_score || 0) * 100)}%
                            </div>
                            <div className="text-xs text-navy/60">Best Accuracy</div>
                          </div>
                        </div>
                        
                        {editMode ? (
                          <div className="space-y-2">
                            <h3 className="text-sm font-medium text-navy/70">Memory Level</h3>
                            <Select
                              value={selectedMemory.memorized_level.toString()}
                              onValueChange={value => setSelectedMemory(prev => ({ ...prev!, memorized_level: parseInt(value) }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select memory level" />
                              </SelectTrigger>
                              <SelectContent>
                                {memoryLevels.map(level => (
                                  <SelectItem key={level.value} value={level.value}>
                                    {level.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <div>
                            <h3 className="text-sm font-medium text-navy/70 mb-2">Review Schedule</h3>
                            <div className="flex space-x-4">
                              {selectedMemory.last_practiced && (
                                <div className="text-sm">
                                  <span className="text-navy/60">Last practiced:</span>
                                  <br />
                                  <span className="font-medium">
                                    {format(new Date(selectedMemory.last_practiced), 'MMM d, yyyy')}
                                  </span>
                                </div>
                              )}
                              {selectedMemory.next_review && (
                                <div className="text-sm">
                                  <span className="text-navy/60">Next review:</span>
                                  <br />
                                  <span className="font-medium">
                                    {format(new Date(selectedMemory.next_review), 'MMM d, yyyy')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {editMode ? (
                          <div className="space-y-2">
                            <h3 className="text-sm font-medium text-navy/70">Tags</h3>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {selectedMemory.tags?.map((tag, index) => (
                                <Badge key={index} variant="outline" className="bg-navy/5">
                                  {tag}
                                  <button
                                    onClick={() => removeTag(tag, 'edit')}
                                    className="ml-1 text-navy/60 hover:text-navy"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Add a tag"
                                value={newTag}
                                onChange={e => setNewTag(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addTag('edit')}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => addTag('edit')}
                                size="sm"
                              >
                                Add
                              </Button>
                            </div>
                          </div>
                        ) : selectedMemory.tags && selectedMemory.tags.length > 0 && (
                          <div>
                            <h3 className="text-sm font-medium text-navy/70 mb-2">Tags</h3>
                            <div className="flex flex-wrap gap-2">
                              {selectedMemory.tags.map((tag, i) => (
                                <Badge key={i} variant="outline" className="bg-navy/5 text-navy/70">
                                  <Tag className="h-3 w-3 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div>
                          <h3 className="text-sm font-medium text-navy/70 mb-2">Notes</h3>
                          {editMode ? (
                            <Textarea
                              value={selectedMemory.notes || ''}
                              onChange={e => setSelectedMemory(prev => ({ ...prev!, notes: e.target.value }))}
                              placeholder="Add notes about this verse..."
                              rows={3}
                            />
                          ) : (
                            <p className="text-navy/80 whitespace-pre-line">
                              {selectedMemory.notes || 'No notes added yet.'}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-2">
                      {!editMode && (
                        <>
                          <Button 
                            className="bg-navy text-cream hover:bg-navy/90 w-full"
                            onClick={() => setEditMode(true)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Practice & Update
                          </Button>
                          <Button 
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                              setActiveTab('practice');
                              // Auto-select this verse for practice
                            }}
                          >
                            <Gamepad2 className="mr-2 h-4 w-4" />
                            Practice Games
                          </Button>
                        </>
                      )}
                    </CardFooter>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Book className="h-12 w-12 text-navy/20 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-navy mb-2">No verse selected</h3>
                      <p className="text-navy/60">
                        Select a verse to view details or browse the Bible to find new verses
                      </p>
                      <Button 
                        onClick={() => setShowBibleBrowser(true)} 
                        className="mt-4"
                        variant="outline"
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Browse Bible
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ScriptureMemoryPage;