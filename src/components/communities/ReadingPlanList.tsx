import { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Loader2,
  Calendar,
  User,
  ChevronRight,
  UsersRound
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { format, addDays } from 'date-fns';
import { CreateReadingPlanDialog } from './CreateReadingPlanDialog';

interface ReadingPlan {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  created_by: string;
  reading_plan: {
    id: string;
    title: string;
    description: string;
    duration_days: number;
  };
  participant_count?: number;
  created_at: string;
}

export function ReadingPlanList({ communityId }: { communityId: string }) {
  const [plans, setPlans] = useState<ReadingPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadReadingPlans();
  }, [communityId]);

  const loadReadingPlans = async () => {
    setIsLoading(true);
    
    try {
      // Load community reading plans with reading plan details
      const { data, error } = await supabase
        .from('community_reading_plans')
        .select(`
          *,
          reading_plan:reading_plan_id(id, title, description, duration_days)
        `)
        .eq('community_id', communityId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Get participant counts (can be expanded in future)
      const plansWithParticipants = data?.map(plan => ({
        ...plan,
        participant_count: Math.floor(Math.random() * 10) + 2 // Mock data for now
      })) || [];
      
      setPlans(plansWithParticipants);
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

  // Calculate progress percentage for a reading plan
  const calculateProgress = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    
    if (today < start) return 0;
    if (today > end) return 100;
    
    const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const daysElapsed = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    return Math.min(100, Math.round((daysElapsed / totalDays) * 100));
  };

  const handleCreatePlan = () => {
    loadReadingPlans();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CreateReadingPlanDialog
          communityId={communityId}
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onPlanCreated={handleCreatePlan}
        />
      </div>
      
      {plans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <Card key={plan.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <div className="text-sm text-muted-foreground line-clamp-2">
                  {plan.description || plan.reading_plan.description}
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium flex items-center">
                      <BookOpen className="h-4 w-4 mr-1" />
                      {plan.reading_plan.title}
                    </span>
                    <span className="text-muted-foreground">
                      {plan.reading_plan.duration_days} days
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span>{calculateProgress(plan.start_date, plan.end_date)}%</span>
                    </div>
                    <Progress value={calculateProgress(plan.start_date, plan.end_date)} className="h-2" />
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {format(new Date(plan.start_date), 'MMM d')} - {format(new Date(plan.end_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                    
                    <Badge variant="outline" className="flex items-center">
                      <UsersRound className="h-3 w-3 mr-1" />
                      {plan.participant_count} participants
                    </Badge>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <Button variant="ghost" className="ml-auto" size="sm">
                  View Details
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No reading plans yet</h3>
          <p className="text-muted-foreground mb-6">
            Start a synchronized reading plan for your community
          </p>
          <CreateReadingPlanDialog
            communityId={communityId}
            onPlanCreated={handleCreatePlan}
          />
        </div>
      )}
    </div>
  );
}