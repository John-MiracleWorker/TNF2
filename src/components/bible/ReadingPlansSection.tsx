import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Search, 
  Filter, 
  Calendar, 
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@/components/ui/tabs';
import { BibleReadingPlanCard } from '@/components/bible/BibleReadingPlanCard';
import { DailyReadingView } from '@/components/bible/DailyReadingView';
import { CustomReadingPlanGenerator } from '@/components/bible/CustomReadingPlanGenerator';
import { useToast } from '@/hooks/use-toast';
import { 
  getReadingPlans, 
  getAllUserReadingProgress, 
  getReadingPlanById,
  getUserReadingProgress,
  getDailyReading,
  type ReadingPlan,
  type ReadingProgress,
  type DailyReading
} from '@/lib/reading-plans';

// Define view modes
type ViewMode = 'browse' | 'reading' | 'create';

const ReadingPlansSection = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('browse');
  const [plans, setPlans] = useState<ReadingPlan[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<ReadingPlan[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [themeFilter, setThemeFilter] = useState<string>('all');
  const [durationFilter, setDurationFilter] = useState<string>('any');
  const [isLoading, setIsLoading] = useState(true);
  const [userProgress, setUserProgress] = useState<ReadingProgress[]>([]);
  
  // For the reading view
  const [selectedPlan, setSelectedPlan] = useState<ReadingPlan | null>(null);
  const [selectedProgress, setSelectedProgress] = useState<ReadingProgress | null>(null);
  const [currentReading, setCurrentReading] = useState<DailyReading | null>(null);
  const [isLoadingReading, setIsLoadingReading] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    loadReadingPlans();
  }, []);

  useEffect(() => {
    filterPlans();
  }, [plans, userProgress, searchQuery, themeFilter, durationFilter, activeTab]);

  const loadReadingPlans = async () => {
    setIsLoading(true);
    try {
      // Load all plans and user progress in parallel
      const [allPlans, progress] = await Promise.all([
        getReadingPlans(true),
        getAllUserReadingProgress()
      ]);
      
      setPlans(allPlans);
      setUserProgress(progress);
    } catch (error) {
      console.error('Error loading reading plans:', error);
      toast({
        title: 'Error',
        description: 'Failed to load reading plans',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterPlans = () => {
    let filtered = [...plans];
    
    // Filter by tab
    if (activeTab === 'active') {
      const activePlanIds = userProgress
        .filter(p => !p.is_completed)
        .map(p => p.plan_id);
      
      filtered = filtered.filter(plan => activePlanIds.includes(plan.id));
    } else if (activeTab === 'completed') {
      const completedPlanIds = userProgress
        .filter(p => p.is_completed)
        .map(p => p.plan_id);
      
      filtered = filtered.filter(plan => completedPlanIds.includes(plan.id));
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        plan => 
          plan.title.toLowerCase().includes(query) ||
          plan.description.toLowerCase().includes(query) ||
          plan.theme?.toLowerCase().includes(query)
      );
    }
    
    // Filter by theme
    if (themeFilter && themeFilter !== 'all') {
      filtered = filtered.filter(plan => plan.theme === themeFilter);
    }
    
    // Filter by duration
    if (durationFilter && durationFilter !== 'any') {
      switch (durationFilter) {
        case 'short':
          filtered = filtered.filter(plan => plan.duration_days <= 7);
          break;
        case 'medium':
          filtered = filtered.filter(plan => plan.duration_days > 7 && plan.duration_days <= 14);
          break;
        case 'long':
          filtered = filtered.filter(plan => plan.duration_days > 14);
          break;
      }
    }
    
    setFilteredPlans(filtered);
  };
  
  const getProgressForPlan = (planId: string): ReadingProgress | undefined => {
    return userProgress.find(p => p.plan_id === planId);
  };
  
  const handleStartPlan = (plan: ReadingPlan) => {
    loadReadingView(plan);
  };
  
  const handleContinuePlan = (plan: ReadingPlan, progress: ReadingProgress) => {
    loadReadingView(plan, progress);
  };
  
  const loadReadingView = async (plan: ReadingPlan, progress?: ReadingProgress) => {
    setIsLoadingReading(true);
    try {
      // Get the plan details with all readings
      const fullPlan = await getReadingPlanById(plan.id);
      
      if (!fullPlan) {
        throw new Error('Reading plan not found');
      }
      
      // Get or refresh user's progress
      const userReadingProgress = progress || await getUserReadingProgress(plan.id);
      
      if (!userReadingProgress) {
        throw new Error('Reading progress not found');
      }
      
      // Get the current day's reading
      const dayNumber = userReadingProgress.current_day <= fullPlan.duration_days
        ? userReadingProgress.current_day
        : fullPlan.duration_days;
      
      const reading = await getDailyReading(plan.id, dayNumber);
      
      if (!reading) {
        throw new Error('Reading not found');
      }
      
      // Set the selected plan, progress, and reading
      setSelectedPlan(fullPlan);
      setSelectedProgress(userReadingProgress);
      setCurrentReading(reading);
      
      // Switch to reading view
      setViewMode('reading');
    } catch (error) {
      console.error('Error loading reading view:', error);
      toast({
        title: 'Error',
        description: 'Failed to load the reading plan. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingReading(false);
    }
  };
  
  const handleBackToBrowse = () => {
    setViewMode('browse');
    setSelectedPlan(null);
    setSelectedProgress(null);
    setCurrentReading(null);
    
    // Refresh plans and progress
    loadReadingPlans();
  };
  
  const handleReadingComplete = () => {
    // Refresh the progress data after a reading is completed
    loadReadingView(selectedPlan!, { ...selectedProgress!, current_day: selectedProgress!.current_day + 1 });
  };
  
  const handlePrevDay = async () => {
    if (!selectedPlan || !currentReading || currentReading.day_number <= 1) return;
    
    setIsLoadingReading(true);
    try {
      const reading = await getDailyReading(selectedPlan.id, currentReading.day_number - 1);
      
      if (reading) {
        setCurrentReading(reading);
      }
    } catch (error) {
      console.error('Error loading previous day:', error);
      toast({
        title: 'Error',
        description: 'Failed to load the previous day. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingReading(false);
    }
  };
  
  const handleNextDay = async () => {
    if (!selectedPlan || !currentReading || currentReading.day_number >= selectedPlan.duration_days) return;
    
    setIsLoadingReading(true);
    try {
      const reading = await getDailyReading(selectedPlan.id, currentReading.day_number + 1);
      
      if (reading) {
        setCurrentReading(reading);
      }
    } catch (error) {
      console.error('Error loading next day:', error);
      toast({
        title: 'Error',
        description: 'Failed to load the next day. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingReading(false);
    }
  };
  
  const handleCustomPlanGenerated = (plan: ReadingPlan, progress: ReadingProgress) => {
    // Add the new plan to the list of plans
    setPlans(prev => [plan, ...prev]);
    
    // Add the progress to the user's progress
    setUserProgress(prev => [progress, ...prev]);
    
    // Load the reading view for the new plan
    loadReadingView(plan, progress);
  };
  
  // Get unique themes from plans
  const themes = [...new Set(plans.filter(p => p.theme).map(p => p.theme!))];

  // Determine if we're still loading the reading view
  const isLoadingReadingView = viewMode === 'reading' && (isLoadingReading || !selectedPlan || !currentReading);

  return (
    <div className="space-y-6">
      {viewMode === 'browse' && (
        <div className="flex justify-between items-center">
          <Button 
            variant="secondary" 
            className="text-secondary-foreground"
            onClick={() => setViewMode('create')}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Create Custom Plan
          </Button>
        </div>
      )}
      
      {viewMode === 'browse' ? (
        <>
          {/* Filters and Search */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search reading plans..."
                className="pl-9"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={themeFilter} onValueChange={setThemeFilter}>
                <SelectTrigger className="w-36">
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Theme" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Themes</SelectItem>
                  {themes.map(theme => (
                    <SelectItem key={theme} value={theme}>{theme}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={durationFilter} onValueChange={setDurationFilter}>
                <SelectTrigger className="w-36">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Duration" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Length</SelectItem>
                  <SelectItem value="short">Short (≤ 7 days)</SelectItem>
                  <SelectItem value="medium">Medium (8-14 days)</SelectItem>
                  <SelectItem value="long">Long (15+ days)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All Plans</TabsTrigger>
              <TabsTrigger value="active">In Progress</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-6">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredPlans.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPlans.map(plan => (
                    <BibleReadingPlanCard
                      key={plan.id}
                      plan={plan}
                      progress={getProgressForPlan(plan.id)}
                      onStartPlan={handleStartPlan}
                      onContinuePlan={handleContinuePlan}
                    />
                  ))}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No Reading Plans Found</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchQuery || (themeFilter && themeFilter !== 'all') || (durationFilter && durationFilter !== 'any')
                        ? "No plans match your search criteria. Try adjusting your filters."
                        : "No reading plans are available yet. Check back soon!"}
                    </p>
                    {(searchQuery || (themeFilter && themeFilter !== 'all') || (durationFilter && durationFilter !== 'any')) && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchQuery('');
                          setThemeFilter('all');
                          setDurationFilter('any');
                        }}
                      >
                        Clear Filters
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="active" className="mt-6">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredPlans.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPlans.map(plan => (
                    <BibleReadingPlanCard
                      key={plan.id}
                      plan={plan}
                      progress={getProgressForPlan(plan.id)}
                      onStartPlan={handleStartPlan}
                      onContinuePlan={handleContinuePlan}
                    />
                  ))}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No Active Reading Plans</h3>
                    <p className="text-muted-foreground mb-4">
                      You don't have any reading plans in progress. Start a new plan today!
                    </p>
                    <Button onClick={() => setActiveTab('all')}>
                      Browse Reading Plans
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="completed" className="mt-6">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredPlans.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPlans.map(plan => (
                    <BibleReadingPlanCard
                      key={plan.id}
                      plan={plan}
                      progress={getProgressForPlan(plan.id)}
                      onStartPlan={handleStartPlan}
                      onContinuePlan={handleContinuePlan}
                    />
                  ))}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No Completed Reading Plans</h3>
                    <p className="text-muted-foreground mb-4">
                      You haven't completed any reading plans yet. Start a plan to begin your journey!
                    </p>
                    <Button onClick={() => setActiveTab('all')}>
                      Browse Reading Plans
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </>
      ) : viewMode === 'create' ? (
        <div className="space-y-6">
          <div className="flex items-center">
            <Button variant="ghost" onClick={handleBackToBrowse} className="mr-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Plans
            </Button>
          </div>
          
          <CustomReadingPlanGenerator onPlanGenerated={handleCustomPlanGenerated} />
        </div>
      ) : isLoadingReadingView ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : selectedPlan && selectedProgress && currentReading ? (
        <div className="space-y-6">
          <div className="flex items-center">
            <Button variant="ghost" onClick={handleBackToBrowse} className="mr-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Plans
            </Button>
          </div>
          
          <DailyReadingView
            plan={selectedPlan}
            progress={selectedProgress}
            dailyReading={currentReading}
            onComplete={handleReadingComplete}
            onPrevDay={handlePrevDay}
            onNextDay={handleNextDay}
          />
        </div>
      ) : (
        <Card className="border-dashed border-destructive">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Error Loading Reading</h3>
            <p className="text-muted-foreground mb-4">
              There was a problem loading the reading plan. Please try again.
            </p>
            <Button onClick={handleBackToBrowse}>
              Return to Plans
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReadingPlansSection;