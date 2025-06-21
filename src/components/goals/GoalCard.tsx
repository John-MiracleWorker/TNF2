import { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { 
  Target, 
  Calendar, 
  CheckCircle, 
  Circle, 
  ChevronDown, 
  ChevronUp, 
  Edit, 
  Trash2,
  PenLine,
  MoreHorizontal
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import { SpiritualGoal, GoalMilestone } from '@/lib/types';
import { updateGoalMilestone } from '@/lib/spiritual-goals';
import { useToast } from '@/hooks/use-toast';

interface GoalCardProps {
  goal: SpiritualGoal;
  onEdit?: (goal: SpiritualGoal) => void;
  onDelete?: (goal: SpiritualGoal) => void;
  onAddReflection?: (goal: SpiritualGoal) => void;
}

export function GoalCard({ goal, onEdit, onDelete, onAddReflection }: GoalCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'prayer':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'bible_study':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'worship':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'service':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      case 'discipleship':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
      case 'relationships':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'abandoned':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const handleToggleMilestone = async (milestone: GoalMilestone) => {
    try {
      setIsUpdating(milestone.id);
      
      const updatedMilestone = {
        ...milestone,
        is_completed: !milestone.is_completed,
        completed_at: !milestone.is_completed ? new Date().toISOString() : null
      };
      
      await updateGoalMilestone(updatedMilestone);
      
      // Update the milestone in the UI
      goal.milestones = goal.milestones?.map(m => 
        m.id === milestone.id ? updatedMilestone : m
      );
      
      toast({
        title: updatedMilestone.is_completed ? 'Milestone completed!' : 'Milestone reopened',
        description: updatedMilestone.is_completed 
          ? 'Great job on your progress!' 
          : 'You can complete this milestone again when ready.',
      });
    } catch (error) {
      console.error('Error toggling milestone:', error);
      toast({
        title: 'Error',
        description: 'Failed to update milestone status',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`w-full ${goal.status === 'completed' ? 'border-green-500 dark:border-green-700' : ''}`}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <Badge variant="outline" className={getCategoryColor(goal.category)}>
                  {goal.category.replace('_', ' ')}
                </Badge>
                <Badge variant="outline" className={getStatusColor(goal.status)}>
                  {goal.status.replace('_', ' ')}
                </Badge>
                {goal.is_ai_generated && (
                  <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20">
                    AI Generated
                  </Badge>
                )}
              </div>
              <CardTitle className="text-xl text-foreground">{goal.title}</CardTitle>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(goal)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Goal
                  </DropdownMenuItem>
                )}
                {onAddReflection && (
                  <DropdownMenuItem onClick={() => onAddReflection(goal)}>
                    <PenLine className="mr-2 h-4 w-4" />
                    Add Reflection
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem 
                    onClick={() => onDelete(goal)}
                    className="text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Goal
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {goal.target_date && (
            <div className="flex items-center text-sm text-muted-foreground mt-1">
              <Calendar className="h-4 w-4 mr-1" />
              Target: {format(new Date(goal.target_date), 'MMMM d, yyyy')}
            </div>
          )}
        </CardHeader>
        
        <CardContent className="pb-2">
          <div className="space-y-4">
            <p className="text-foreground/80">{goal.description}</p>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{goal.progress}%</span>
              </div>
              <Progress value={goal.progress} className="h-2" />
            </div>
            
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full flex items-center justify-center">
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-2" />
                      Hide Milestones
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Show Milestones ({goal.milestones?.length || 0})
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="space-y-3 mt-2">
                {goal.milestones && goal.milestones.length > 0 ? (
                  goal.milestones.map((milestone) => (
                    <div 
                      key={milestone.id} 
                      className={`p-3 rounded-lg border ${
                        milestone.is_completed 
                          ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                          : 'bg-card border-border'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-6 w-6 rounded-full mt-0.5 ${
                            milestone.is_completed 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-muted-foreground'
                          }`}
                          onClick={() => handleToggleMilestone(milestone)}
                          disabled={!!isUpdating}
                        >
                          {isUpdating === milestone.id ? (
                            <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : milestone.is_completed ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : (
                            <Circle className="h-5 w-5" />
                          )}
                        </Button>
                        
                        <div className="flex-1">
                          <h4 className={`font-medium ${
                            milestone.is_completed ? 'text-green-800 dark:text-green-300' : 'text-foreground'
                          }`}>
                            {milestone.title}
                          </h4>
                          
                          {milestone.description && (
                            <p className={`text-sm mt-1 ${
                              milestone.is_completed ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'
                            }`}>
                              {milestone.description}
                            </p>
                          )}
                          
                          {milestone.target_date && (
                            <div className="flex items-center text-xs mt-2">
                              <Calendar className="h-3 w-3 mr-1" />
                              <span className={milestone.is_completed ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}>
                                {format(new Date(milestone.target_date), 'MMM d, yyyy')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No milestones defined for this goal
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CardContent>
        
        <CardFooter className="pt-2">
          <div className="w-full flex justify-between items-center">
            <div className="text-xs text-muted-foreground">
              Created: {goal.created_at && format(new Date(goal.created_at), 'MMM d, yyyy')}
            </div>
            
            {onAddReflection && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onAddReflection(goal)}
                className="text-xs h-8"
              >
                <PenLine className="h-3 w-3 mr-1" />
                Add Reflection
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}