import { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Search, Plus, Tag, Calendar, Edit, Trash2, CheckCircle, XCircle, X, Sparkles } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO, addDays } from 'date-fns';
import DashboardLayout from '@/components/layout/DashboardLayout';
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
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { HabitRecommendations } from '@/components/habits/HabitRecommendations';
import { getSpiritualHabits, saveSpiritualHabit, updateSpiritualHabit, logHabitCompletion, getHabitLogs } from '@/lib/supabase';
import { SpiritualHabit, HabitLog } from '@/lib/types';
import { AuthContext } from '@/App';

const frequencyOptions = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const HabitsPage = () => {
  const { session } = useContext(AuthContext);
  const [habits, setHabits] = useState<SpiritualHabit[]>([]);
  const [filteredHabits, setFilteredHabits] = useState<SpiritualHabit[]>([]);
  const [activeTab, setActiveTab] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedHabit, setSelectedHabit] = useState<SpiritualHabit | null>(null);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [isLogLoading, setIsLogLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [newHabit, setNewHabit] = useState<SpiritualHabit>({
    habit_name: '',
    goal_frequency: 'daily',
    goal_amount: 1,
    streak_current: 0,
    streak_longest: 0,
    is_active: true
  });
  const [showRecommendations, setShowRecommendations] = useState(true);
  const { toast } = useToast();

  // For habit tracking
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [amount, setAmount] = useState(1);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadSpiritualHabits();
  }, []);

  useEffect(() => {
    filterHabits();
  }, [habits, searchQuery, activeTab]);

  useEffect(() => {
    if (selectedHabit?.id) {
      loadHabitLogs(selectedHabit.id);
    }
  }, [selectedHabit]);

  const loadSpiritualHabits = async () => {
    setIsLoading(true);
    try {
      const data = await getSpiritualHabits();
      setHabits(data);
      setFilteredHabits(data);
    } catch (error) {
      console.error('Error loading spiritual habits:', error);
      toast({
        title: 'Error',
        description: 'Failed to load spiritual habits',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadHabitLogs = async (habitId: string) => {
    setIsLogLoading(true);
    try {
      // Get logs for the last 30 days
      const today = new Date();
      const thirtyDaysAgo = addDays(today, -30);
      
      const logs = await getHabitLogs(
        habitId, 
        format(thirtyDaysAgo, 'yyyy-MM-dd'), 
        format(today, 'yyyy-MM-dd')
      );
      
      setHabitLogs(logs);
    } catch (error) {
      console.error('Error loading habit logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load habit logs',
        variant: 'destructive',
      });
    } finally {
      setIsLogLoading(false);
    }
  };

  const filterHabits = () => {
    let filtered = [...habits];
    
    // Filter by tab
    if (activeTab === 'active') {
      filtered = filtered.filter(habit => habit.is_active);
    } else if (activeTab === 'archived') {
      filtered = filtered.filter(habit => !habit.is_active);
    }
    
    // Filter by search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        habit => habit.habit_name.toLowerCase().includes(query)
      );
    }
    
    setFilteredHabits(filtered);
  };

  const handleCreateHabit = async () => {
    if (!newHabit.habit_name.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a habit name',
        variant: 'destructive',
      });
      return;
    }

    if (!session || !session.user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create a habit',
        variant: 'destructive',
      });
      return;
    }

    try {
      const habit: SpiritualHabit = {
        ...newHabit,
        user_id: session.user.id,
        streak_current: 0,
        streak_longest: 0,
        is_active: true
      };
      
      const savedHabit = await saveSpiritualHabit(habit);
      setHabits(prev => [savedHabit, ...prev]);
      
      setNewHabit({
        habit_name: '',
        goal_frequency: 'daily',
        goal_amount: 1,
        streak_current: 0,
        streak_longest: 0,
        is_active: true
      });
      
      toast({
        title: 'Success',
        description: 'Spiritual habit created successfully',
      });
    } catch (error) {
      console.error('Error creating spiritual habit:', error);
      toast({
        title: 'Error',
        description: 'Failed to create spiritual habit',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateHabit = async () => {
    if (!selectedHabit) return;
    
    try {
      const updatedHabit = await updateSpiritualHabit(selectedHabit);
      setHabits(prev => 
        prev.map(habit => 
          habit.id === updatedHabit.id ? updatedHabit : habit
        )
      );
      
      setEditMode(false);
      toast({
        title: 'Success',
        description: 'Spiritual habit updated successfully',
      });
    } catch (error) {
      console.error('Error updating spiritual habit:', error);
      toast({
        title: 'Error',
        description: 'Failed to update spiritual habit',
        variant: 'destructive',
      });
    }
  };

  const toggleHabitActive = async (habit: SpiritualHabit) => {
    try {
      const updatedHabit: SpiritualHabit = {
        ...habit,
        is_active: !habit.is_active
      };
      
      await updateSpiritualHabit(updatedHabit);
      setHabits(prev => 
        prev.map(h => 
          h.id === updatedHabit.id ? updatedHabit : h
        )
      );
      
      if (selectedHabit && selectedHabit.id === habit.id) {
        setSelectedHabit(updatedHabit);
      }
      
      toast({
        title: 'Success',
        description: updatedHabit.is_active
          ? 'Habit activated'
          : 'Habit archived',
      });
    } catch (error) {
      console.error('Error updating habit status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update habit status',
        variant: 'destructive',
      });
    }
  };

  const handleLogHabit = async () => {
    if (!selectedHabit?.id) return;
    
    try {
      const log: HabitLog = {
        habit_id: selectedHabit.id,
        completed_date: format(selectedDate, 'yyyy-MM-dd'),
        amount: amount,
        notes: notes
      };
      
      await logHabitCompletion(log);
      
      // Update the habit's streak if needed
      const today = new Date();
      if (isSameDay(selectedDate, today)) {
        const updatedHabit: SpiritualHabit = {
          ...selectedHabit,
          streak_current: selectedHabit.streak_current + 1,
          streak_longest: Math.max(selectedHabit.streak_longest, selectedHabit.streak_current + 1)
        };
        
        await updateSpiritualHabit(updatedHabit);
        setHabits(prev => 
          prev.map(h => 
            h.id === updatedHabit.id ? updatedHabit : h
          )
        );
        setSelectedHabit(updatedHabit);
      }
      
      // Reload habit logs
      await loadHabitLogs(selectedHabit.id);
      
      setAmount(1);
      setNotes('');
      
      toast({
        title: 'Success',
        description: 'Habit logged successfully',
      });
    } catch (error) {
      console.error('Error logging habit:', error);
      toast({
        title: 'Error',
        description: 'Failed to log habit',
        variant: 'destructive',
      });
    }
  };

  const getCompletedDays = (logs: HabitLog[]): string[] => {
    return logs.map(log => log.completed_date);
  };

  const isDateCompleted = (date: Date, completedDates: string[]): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return completedDates.includes(dateStr);
  };

  const calculateCompletionRate = (habit: SpiritualHabit): number => {
    if (!habit.id || habitLogs.length === 0) return 0;
    
    // For now, just use the last 7 days
    const today = new Date();
    const sevenDaysAgo = addDays(today, -7);
    const dateRange = eachDayOfInterval({ start: sevenDaysAgo, end: today });
    
    const completedDates = getCompletedDays(habitLogs);
    const daysCompleted = dateRange.filter(date => isDateCompleted(date, completedDates)).length;
    
    if (habit.goal_frequency === 'daily') {
      return Math.round((daysCompleted / 7) * 100);
    } else if (habit.goal_frequency === 'weekly') {
      return daysCompleted > 0 ? 100 : 0;
    }
    
    return 0;
  };
  
  // Handler for when a habit is created from recommendations
  const handleRecommendedHabitCreated = () => {
    loadSpiritualHabits();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Spiritual Habits</h1>
            <p className="text-muted-foreground">
              Track and develop your spiritual disciplines
            </p>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary" className="text-secondary-foreground">
                <Plus className="mr-2 h-4 w-4" />
                New Habit
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Spiritual Habit</DialogTitle>
                <DialogDescription>
                  Add a new spiritual habit to track
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="habit_name">Habit Name</Label>
                  <Input
                    id="habit_name"
                    placeholder="e.g., Daily Prayer"
                    value={newHabit.habit_name}
                    onChange={e => setNewHabit(prev => ({ ...prev, habit_name: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="goal_frequency">Frequency</Label>
                  <Select
                    value={newHabit.goal_frequency}
                    onValueChange={value => setNewHabit(prev => ({ ...prev, goal_frequency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      {frequencyOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="goal_amount">Goal Amount</Label>
                  <Input
                    id="goal_amount"
                    type="number"
                    min="1"
                    value={newHabit.goal_amount}
                    onChange={e => setNewHabit(prev => ({ ...prev, goal_amount: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button onClick={handleCreateHabit}>Create Habit</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* AI Habit Recommendations */}
        {showRecommendations && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-2"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-foreground flex items-center">
                <Sparkles className="h-5 w-5 text-secondary mr-2" />
                Recommended for You
              </h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowRecommendations(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <HabitRecommendations onHabitCreated={handleRecommendedHabitCreated} />
          </motion.div>
        )}
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-2/3 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search habits..."
                className="pl-9"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Tabs */}
            <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="archived">Archived</TabsTrigger>
              </TabsList>
            </Tabs>
            
            {/* Habits list */}
            <div className="space-y-4">
              {isLoading ? (
                <div className="py-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground mt-2">Loading spiritual habits...</p>
                </div>
              ) : filteredHabits.length > 0 ? (
                filteredHabits.map((habit) => (
                  <motion.div
                    key={habit.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card 
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        setSelectedHabit(habit);
                        setEditMode(false);
                        setSelectedDate(new Date());
                        setAmount(habit.goal_amount);
                        setNotes('');
                      }}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-foreground text-xl">{habit.habit_name}</CardTitle>
                          <div className="flex items-center space-x-2">
                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                              {habit.goal_frequency}
                            </Badge>
                            {!habit.is_active && (
                              <Badge variant="outline" className="bg-muted text-muted-foreground">
                                Archived
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium text-foreground">{calculateCompletionRate(habit)}%</span>
                          </div>
                          <Progress value={calculateCompletionRate(habit)} className="h-2" />
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between">
                        <div className="flex space-x-4">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Current streak:</span>
                            <span className="ml-1 font-semibold text-foreground">{habit.streak_current} days</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Longest streak:</span>
                            <span className="ml-1 font-semibold text-foreground">{habit.streak_longest} days</span>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="bg-primary text-primary-foreground hover:bg-primary/90"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedHabit(habit);
                            setSelectedDate(new Date());
                            setAmount(habit.goal_amount);
                            setNotes('');
                          }}
                        >
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Log
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))
              ) : (
                <div className="py-12 text-center">
                  <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No spiritual habits found</h3>
                  <p className="text-muted-foreground mb-6">
                    {searchQuery.trim() !== '' 
                      ? "No habits match your search criteria"
                      : activeTab === 'archived'
                        ? "You don't have any archived habits"
                        : activeTab === 'active'
                          ? "You don't have any active habits"
                          : "Start by adding your first spiritual habit"
                    }
                  </p>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Spiritual Habit
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Create Spiritual Habit</DialogTitle>
                        <DialogDescription>
                          Add a new spiritual habit to track
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="habit_name_empty">Habit Name</Label>
                          <Input
                            id="habit_name_empty"
                            placeholder="e.g., Daily Prayer"
                            value={newHabit.habit_name}
                            onChange={e => setNewHabit(prev => ({ ...prev, habit_name: e.target.value }))}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="goal_frequency_empty">Frequency</Label>
                          <Select
                            value={newHabit.goal_frequency}
                            onValueChange={value => setNewHabit(prev => ({ ...prev, goal_frequency: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                            <SelectContent>
                              {frequencyOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="goal_amount_empty">Goal Amount</Label>
                          <Input
                            id="goal_amount_empty"
                            type="number"
                            min="1"
                            value={newHabit.goal_amount}
                            onChange={e => setNewHabit(prev => ({ ...prev, goal_amount: parseInt(e.target.value) || 1 }))}
                          />
                        </div>
                      </div>
                      
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <DialogClose asChild>
                          <Button onClick={handleCreateHabit}>Create Habit</Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          </div>
          
          {/* Habit detail view */}
          <div className="w-full md:w-1/3">
            {selectedHabit ? (
              <Card className="sticky top-4">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-foreground text-xl">
                      {editMode ? (
                        <Input
                          value={selectedHabit.habit_name}
                          onChange={e => setSelectedHabit(prev => ({ ...prev!, habit_name: e.target.value }))}
                          className="mt-1"
                        />
                      ) : (
                        selectedHabit.habit_name
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
                            onClick={handleUpdateHabit}
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
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className={selectedHabit.is_active 
                              ? "text-amber-500 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30" 
                              : "text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-950/30"
                            }
                            onClick={() => toggleHabitActive(selectedHabit)}
                          >
                            {selectedHabit.is_active ? (
                              <XCircle className="h-4 w-4" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <div className="flex space-x-2">
                      {editMode ? (
                        <Select
                          value={selectedHabit.goal_frequency}
                          onValueChange={value => setSelectedHabit(prev => ({ ...prev!, goal_frequency: value }))}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            {frequencyOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-800">
                          {selectedHabit.goal_frequency}
                        </Badge>
                      )}
                      
                      {!selectedHabit.is_active && (
                        <Badge variant="outline" className="bg-muted text-muted-foreground">
                          Archived
                        </Badge>
                      )}
                    </div>
                    
                    {editMode && (
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="goal_amount" className="text-sm">Goal:</Label>
                        <Input
                          id="goal_amount"
                          type="number"
                          min="1"
                          className="w-16 h-8 text-sm"
                          value={selectedHabit.goal_amount}
                          onChange={e => setSelectedHabit(prev => ({ ...prev!, goal_amount: parseInt(e.target.value) || 1 }))}
                        />
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Progress */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">Progress</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Completion rate</span>
                          <span className="font-medium text-foreground">{calculateCompletionRate(selectedHabit)}%</span>
                        </div>
                        <Progress value={calculateCompletionRate(selectedHabit)} className="h-2" />
                      </div>
                      
                      <div className="flex space-x-4 mt-3">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Current streak:</span>
                          <span className="block font-semibold text-lg text-foreground">{selectedHabit.streak_current} days</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Longest streak:</span>
                          <span className="block font-semibold text-lg text-foreground">{selectedHabit.streak_longest} days</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Log habit section */}
                    {selectedHabit.is_active && (
                      <div className="space-y-4 border-t border-border pt-4">
                        <h3 className="font-medium text-foreground">Log Your Progress</h3>
                        
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor="log_date">Date</Label>
                            <Input 
                              id="log_date" 
                              type="date" 
                              value={format(selectedDate, 'yyyy-MM-dd')}
                              onChange={e => setSelectedDate(e.target.value ? new Date(e.target.value) : new Date())}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="log_amount">Amount</Label>
                            <Input 
                              id="log_amount" 
                              type="number" 
                              min="1"
                              value={amount}
                              onChange={e => setAmount(parseInt(e.target.value) || 1)}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="log_notes">Notes (optional)</Label>
                            <Textarea 
                              id="log_notes" 
                              placeholder="Add any notes about today's practice..." 
                              value={notes}
                              onChange={e => setNotes(e.target.value)}
                              rows={3}
                            />
                          </div>
                          
                          <Button 
                            className="w-full"
                            onClick={handleLogHabit}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Log Habit
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Recent activity */}
                    <div className="space-y-3 border-t border-border pt-4">
                      <h3 className="font-medium text-foreground">Recent Activity</h3>
                      
                      {isLogLoading ? (
                        <div className="py-4 text-center text-muted-foreground">Loading activity...</div>
                      ) : habitLogs.length > 0 ? (
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                          {habitLogs.slice(0, 10).map((log, index) => (
                            <div key={index} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                              <div>
                                <div className="font-medium text-foreground">
                                  {format(new Date(log.completed_date), 'MMM d, yyyy')}
                                </div>
                                {log.notes && (
                                  <div className="text-sm text-muted-foreground mt-1">
                                    {log.notes}
                                  </div>
                                )}
                              </div>
                              <Badge>
                                {log.amount} {log.amount === 1 ? 'time' : 'times'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-4 text-center text-muted-foreground">
                          No activity logged yet
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No habit selected</h3>
                  <p className="text-muted-foreground">
                    Select a spiritual habit to view details and log your progress
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default HabitsPage;