import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Target, 
  Search, 
  Plus, 
  Filter, 
  Calendar, 
  CheckCircle, 
  Loader2, 
  Sparkles,
  PenLine
} from 'lucide-react';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { GoalCard } from '@/components/goals/GoalCard';
import { GoalForm } from '@/components/goals/GoalForm';
import { GoalGenerator } from '@/components/goals/GoalGenerator';
import { GoalReflectionDialog } from '@/components/goals/GoalReflectionDialog';
import { 
  getSpiritualGoals, 
  saveSpiritualGoal, 
  updateSpiritualGoal, 
  deleteSpiritualGoal 
} from '@/lib/spiritual-goals';
import { SpiritualGoal } from '@/lib/types';

const GoalsPage = () => {
  const [goals, setGoals] = useState<SpiritualGoal[]>([]);
  const [filteredGoals, setFilteredGoals] = useState<SpiritualGoal[]>([]);
  const [activeTab, setActiveTab] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isGeneratorDialogOpen, setIsGeneratorDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SpiritualGoal | null>(null);
  const [goalForReflection, setGoalForReflection] = useState<SpiritualGoal | null>(null);
  const [isReflectionDialogOpen, setIsReflectionDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadGoals();
  }, []);

  useEffect(() => {
    filterGoals();
  }, [goals, searchQuery, activeTab, categoryFilter]);

  const loadGoals = async () => {
    setIsLoading(true);
    try {
      const data = await getSpiritualGoals();
      setGoals(data);
      setFilteredGoals(data);
    } catch (error) {
      console.error('Error loading spiritual goals:', error);
      toast({
        title: 'Error',
        description: 'Failed to load spiritual goals',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterGoals = () => {
    let filtered = [...goals];
    
    // Filter by tab
    if (activeTab === 'active') {
      filtered = filtered.filter(goal => goal.status !== 'completed' && goal.status !== 'abandoned');
    } else if (activeTab === 'completed') {
      filtered = filtered.filter(goal => goal.status === 'completed');
    } else if (activeTab === 'abandoned') {
      filtered = filtered.filter(goal => goal.status === 'abandoned');
    }
    
    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(goal => goal.category === categoryFilter);
    }
    
    // Filter by search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        goal => 
          goal.title.toLowerCase().includes(query) ||
          (goal.description && goal.description.toLowerCase().includes(query))
      );
    }
    
    setFilteredGoals(filtered);
  };

  const handleCreateGoal = async (goal: SpiritualGoal) => {
    try {
      const savedGoal = await saveSpiritualGoal(goal);
      setGoals(prev => [savedGoal, ...prev]);
      
      setIsFormDialogOpen(false);
      
      toast({
        title: 'Success',
        description: 'Spiritual goal created successfully',
      });
    } catch (error) {
      console.error('Error creating spiritual goal:', error);
      toast({
        title: 'Error',
        description: 'Failed to create spiritual goal',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateGoal = async (goal: SpiritualGoal) => {
    try {
      const updatedGoal = await updateSpiritualGoal(goal);
      setGoals(prev => 
        prev.map(g => 
          g.id === updatedGoal.id ? updatedGoal : g
        )
      );
      
      setIsFormDialogOpen(false);
      setSelectedGoal(null);
      
      toast({
        title: 'Success',
        description: 'Spiritual goal updated successfully',
      });
    } catch (error) {
      console.error('Error updating spiritual goal:', error);
      toast({
        title: 'Error',
        description: 'Failed to update spiritual goal',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteGoal = async (goal: SpiritualGoal) => {
    try {
      if (!goal.id) return;
      
      await deleteSpiritualGoal(goal.id);
      setGoals(prev => prev.filter(g => g.id !== goal.id));
      
      toast({
        title: 'Success',
        description: 'Spiritual goal deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting spiritual goal:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete spiritual goal',
        variant: 'destructive',
      });
    }
  };

  const handleEditGoal = (goal: SpiritualGoal) => {
    setSelectedGoal(goal);
    setIsFormDialogOpen(true);
  };

  const handleAddReflection = (goal: SpiritualGoal) => {
    setGoalForReflection(goal);
    setIsReflectionDialogOpen(true);
  };

  const handleGoalGenerated = (goal: SpiritualGoal) => {
    setGoals(prev => [goal, ...prev]);
    setIsGeneratorDialogOpen(false);
    
    toast({
      title: 'Goal Generated',
      description: 'Your AI-generated spiritual goal is ready',
    });
  };

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'prayer', label: 'Prayer' },
    { value: 'bible_study', label: 'Bible Study' },
    { value: 'worship', label: 'Worship' },
    { value: 'service', label: 'Service' },
    { value: 'discipleship', label: 'Discipleship' },
    { value: 'relationships', label: 'Relationships' },
    { value: 'evangelism', label: 'Evangelism' },
    { value: 'stewardship', label: 'Stewardship' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Spiritual Goals</h1>
            <p className="text-muted-foreground">
              Set and track meaningful goals for your spiritual growth
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsGeneratorDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">AI Generate</span>
              <span className="sm:hidden">AI</span>
            </Button>
            
            <Button 
              variant="secondary" 
              onClick={() => {
                setSelectedGoal(null);
                setIsFormDialogOpen(true);
              }}
              className="text-secondary-foreground"
            >
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">New Goal</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-2/3 space-y-4">
            {/* Search and filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search goals..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Filter by category" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Tabs */}
            <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="all">All Goals</TabsTrigger>
              </TabsList>
            </Tabs>
            
            {/* Goals list */}
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredGoals.length > 0 ? (
                filteredGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={handleEditGoal}
                    onDelete={handleDeleteGoal}
                    onAddReflection={handleAddReflection}
                  />
                ))
              ) : (
                <div className="text-center py-12">
                  <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No goals found</h3>
                  <p className="text-muted-foreground mb-6">
                    {searchQuery.trim() !== '' || categoryFilter !== 'all'
                      ? "No goals match your search criteria. Try adjusting your filters."
                      : activeTab === 'completed'
                        ? "You haven't completed any goals yet. Keep working toward your active goals!"
                        : activeTab === 'active'
                          ? "You don't have any active goals. Create a new goal to get started."
                          : "You don't have any goals yet. Create your first spiritual goal to begin tracking your growth."
                    }
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button 
                      onClick={() => {
                        setSelectedGoal(null);
                        setIsFormDialogOpen(true);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Goal
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsGeneratorDialogOpen(true)}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      AI Generate
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Goal Generator */}
          <div className="w-full md:w-1/3">
            <GoalGenerator onGoalGenerated={handleGoalGenerated} />
            
            {/* Quick Stats Card */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Target className="h-5 w-5 mr-2 text-primary" />
                  Goal Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/30 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-foreground">
                      {goals.filter(g => g.status !== 'completed' && g.status !== 'abandoned').length}
                    </p>
                    <p className="text-sm text-muted-foreground">Active Goals</p>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-foreground">
                      {goals.filter(g => g.status === 'completed').length}
                    </p>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">Categories</h4>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(goals.map(g => g.category))).map(category => (
                      <Button
                        key={category}
                        variant="outline"
                        size="sm"
                        onClick={() => setCategoryFilter(category)}
                        className={categoryFilter === category ? 'bg-primary/10' : ''}
                      >
                        {category.replace('_', ' ')}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="pt-2 border-t border-border">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      setSearchQuery('');
                      setCategoryFilter('all');
                      setActiveTab('all');
                    }}
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Goal Form Dialog */}
        <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{selectedGoal ? 'Edit Goal' : 'Create New Goal'}</DialogTitle>
              <DialogDescription>
                {selectedGoal 
                  ? 'Update your spiritual goal details and milestones' 
                  : 'Set a new goal for your spiritual growth journey'
                }
              </DialogDescription>
            </DialogHeader>
            
            <GoalForm 
              goal={selectedGoal || undefined}
              onSubmit={selectedGoal ? handleUpdateGoal : handleCreateGoal}
              onCancel={() => {
                setIsFormDialogOpen(false);
                setSelectedGoal(null);
              }}
            />
          </DialogContent>
        </Dialog>
        
        {/* Goal Generator Dialog */}
        <Dialog open={isGeneratorDialogOpen} onOpenChange={setIsGeneratorDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Generate Spiritual Goal</DialogTitle>
              <DialogDescription>
                Let AI create a personalized spiritual growth goal based on your journey
              </DialogDescription>
            </DialogHeader>
            
            <GoalGenerator 
              onGoalGenerated={(goal) => {
                handleGoalGenerated(goal);
                setIsGeneratorDialogOpen(false);
              }} 
            />
          </DialogContent>
        </Dialog>
        
        {/* Goal Reflection Dialog */}
        {goalForReflection && (
          <GoalReflectionDialog
            goal={goalForReflection}
            open={isReflectionDialogOpen}
            onOpenChange={setIsReflectionDialogOpen}
            onReflectionSaved={() => {
              setGoalForReflection(null);
              loadGoals();
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default GoalsPage;