import { useState } from 'react';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { SpiritualGoal, GoalMilestone } from '@/lib/types';
import { cn } from '@/lib/utils';

const goalSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters' }),
  category: z.string().min(1, { message: 'Please select a category' }),
  target_date: z.date().optional(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'abandoned']),
  progress: z.number().min(0).max(100),
});

type GoalFormValues = z.infer<typeof goalSchema>;

interface GoalFormProps {
  goal?: SpiritualGoal;
  onSubmit: (goal: SpiritualGoal) => void;
  onCancel: () => void;
}

export function GoalForm({ goal, onSubmit, onCancel }: GoalFormProps) {
  const [milestones, setMilestones] = useState<GoalMilestone[]>(
    goal?.milestones || []
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      title: goal?.title || '',
      description: goal?.description || '',
      category: goal?.category || 'prayer',
      target_date: goal?.target_date ? new Date(goal.target_date) : undefined,
      status: goal?.status || 'not_started',
      progress: goal?.progress || 0,
    },
  });

  const watchedCategory = watch('category');
  const watchedTargetDate = watch('target_date');

  const handleAddMilestone = () => {
    const newMilestone: GoalMilestone = {
      title: '',
      description: '',
      is_completed: false,
    };
    
    setMilestones([...milestones, newMilestone]);
  };

  const handleRemoveMilestone = (index: number) => {
    const updatedMilestones = [...milestones];
    updatedMilestones.splice(index, 1);
    setMilestones(updatedMilestones);
  };

  const handleMilestoneChange = (index: number, field: keyof GoalMilestone, value: any) => {
    const updatedMilestones = [...milestones];
    updatedMilestones[index] = {
      ...updatedMilestones[index],
      [field]: value,
    };
    setMilestones(updatedMilestones);
  };

  const onFormSubmit = (data: GoalFormValues) => {
    const formattedGoal: SpiritualGoal = {
      ...goal,
      ...data,
      target_date: data.target_date ? format(data.target_date, 'yyyy-MM-dd') : undefined,
      is_ai_generated: goal?.is_ai_generated || false,
      milestones: milestones.map(m => ({
        ...m,
        target_date: m.target_date ? format(new Date(m.target_date), 'yyyy-MM-dd') : undefined,
      })),
    };
    
    onSubmit(formattedGoal);
  };

  const categories = [
    { value: 'prayer', label: 'Prayer' },
    { value: 'bible_study', label: 'Bible Study' },
    { value: 'worship', label: 'Worship' },
    { value: 'service', label: 'Service' },
    { value: 'discipleship', label: 'Discipleship' },
    { value: 'relationships', label: 'Relationships' },
    { value: 'evangelism', label: 'Evangelism' },
    { value: 'stewardship', label: 'Stewardship' },
    { value: 'fasting', label: 'Fasting' },
    { value: 'sabbath', label: 'Sabbath' },
  ];

  const statuses = [
    { value: 'not_started', label: 'Not Started' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'abandoned', label: 'Abandoned' },
  ];

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Goal Title</Label>
          <Input
            id="title"
            placeholder="Enter a clear, specific goal"
            {...register('title')}
          />
          {errors.title && (
            <p className="text-sm text-red-500">{errors.title.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Describe your spiritual goal in detail"
            rows={3}
            {...register('description')}
          />
          {errors.description && (
            <p className="text-sm text-red-500">{errors.description.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={watchedCategory}
              onValueChange={(value) => setValue('category', value)}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-red-500">{errors.category.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_date">Target Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !watchedTargetDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {watchedTargetDate ? format(watchedTargetDate, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={watchedTargetDate}
                  onSelect={(date) => setValue('target_date', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={watch('status')}
              onValueChange={(value: any) => setValue('status', value)}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.status && (
              <p className="text-sm text-red-500">{errors.status.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="progress">Progress ({watch('progress')}%)</Label>
            <Input
              id="progress"
              type="range"
              min="0"
              max="100"
              step="5"
              {...register('progress', { valueAsNumber: true })}
            />
            {errors.progress && (
              <p className="text-sm text-red-500">{errors.progress.message}</p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Milestones</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddMilestone}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Milestone
          </Button>
        </div>

        <div className="space-y-4">
          {milestones.map((milestone, index) => (
            <div
              key={index}
              className="p-4 border rounded-lg bg-muted/20"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium">Milestone {index + 1}</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveMilestone(index)}
                  className="h-8 w-8 text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor={`milestone-${index}-title`}>Title</Label>
                  <Input
                    id={`milestone-${index}-title`}
                    value={milestone.title}
                    onChange={(e) => handleMilestoneChange(index, 'title', e.target.value)}
                    placeholder="Milestone title"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor={`milestone-${index}-description`}>Description</Label>
                  <Textarea
                    id={`milestone-${index}-description`}
                    value={milestone.description || ''}
                    onChange={(e) => handleMilestoneChange(index, 'description', e.target.value)}
                    placeholder="Describe this milestone"
                    rows={2}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor={`milestone-${index}-date`}>Target Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id={`milestone-${index}-date`}
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal mt-1",
                          !milestone.target_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {milestone.target_date ? (
                          format(new Date(milestone.target_date), 'PPP')
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={milestone.target_date ? new Date(milestone.target_date) : undefined}
                        onSelect={(date) => handleMilestoneChange(index, 'target_date', date ? format(date, 'yyyy-MM-dd') : undefined)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          ))}

          {milestones.length === 0 && (
            <div className="text-center py-6 border border-dashed rounded-lg">
              <p className="text-muted-foreground">
                No milestones yet. Add milestones to track your progress.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddMilestone}
                className="mt-2"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add First Milestone
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit">
          {goal ? 'Update Goal' : 'Create Goal'}
        </Button>
      </div>
    </form>
  );
}