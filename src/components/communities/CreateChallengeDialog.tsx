import { useState } from 'react';
import { CalendarClock, Target, Info, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, addDays } from 'date-fns';

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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from '@/hooks/use-toast';
import { createCommunityChallenge } from '@/lib/communities';

const challengeSchema = z.object({
  name: z.string().min(3, { message: 'Name must be at least 3 characters' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters' }),
  challenge_type: z.string().min(1, { message: 'Please select a challenge type' }),
  target_value: z.number().min(1, { message: 'Target value must be at least 1' }),
  start_date: z.string().min(1, { message: 'Start date is required' }),
  end_date: z.string().min(1, { message: 'End date is required' }),
});

type ChallengeFormValues = z.infer<typeof challengeSchema>;

interface CreateChallengeDialogProps {
  communityId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onChallengeCreated?: () => void;
}

export function CreateChallengeDialog({ communityId, open, onOpenChange, onChallengeCreated }: CreateChallengeDialogProps) {
  const [isOpen, setIsOpen] = useState(open || false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const today = new Date();
  const tomorrow = addDays(today, 1);
  const nextWeek = addDays(today, 7);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ChallengeFormValues>({
    resolver: zodResolver(challengeSchema),
    defaultValues: {
      name: '',
      description: '',
      challenge_type: 'prayer',
      target_value: 7,
      start_date: format(tomorrow, 'yyyy-MM-dd'),
      end_date: format(nextWeek, 'yyyy-MM-dd'),
    },
  });

  const challengeType = watch('challenge_type');

  const challengeTypes = [
    { value: 'prayer', label: 'Prayer Challenge', description: 'Pray a certain number of times' },
    { value: 'scripture', label: 'Scripture Challenge', description: 'Read or memorize scripture' },
    { value: 'devotional', label: 'Devotional Challenge', description: 'Complete devotionals' },
    { value: 'custom', label: 'Custom Challenge', description: 'Create your own challenge type' },
  ];

  const getTargetLabel = () => {
    switch (challengeType) {
      case 'prayer':
        return 'Number of prayers';
      case 'scripture':
        return 'Verses to read/memorize';
      case 'devotional':
        return 'Devotionals to complete';
      default:
        return 'Target value';
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    if (onOpenChange) onOpenChange(newOpen);
    
    if (!newOpen) {
      reset();
    }
  };

  const onSubmit = async (data: ChallengeFormValues) => {
    setIsSubmitting(true);
    try {
      await createCommunityChallenge({
        community_id: communityId,
        name: data.name,
        description: data.description,
        challenge_type: data.challenge_type,
        target_value: data.target_value,
        start_date: data.start_date,
        end_date: data.end_date,
      });

      toast({
        title: 'Challenge Created',
        description: 'Your community challenge has been created successfully.',
      });

      reset();
      handleOpenChange(false);
      if (onChallengeCreated) onChallengeCreated();
    } catch (error) {
      console.error('Error creating challenge:', error);
      toast({
        title: 'Error',
        description: 'Failed to create challenge. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Target className="mr-2 h-4 w-4" />
          Create Challenge
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Create Community Challenge</DialogTitle>
          <DialogDescription>
            Create a challenge for your community members to participate in together.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Challenge Name</Label>
            <Input
              id="name"
              placeholder="E.g., 7-Day Prayer Challenge"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what this challenge is about and how to participate"
              rows={3}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="challenge_type">Challenge Type</Label>
            <Select
              defaultValue={challengeType}
              onValueChange={(value) => setValue('challenge_type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select challenge type" />
              </SelectTrigger>
              <SelectContent>
                {challengeTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center">
                      <span>{type.label}</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 ml-2 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{type.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.challenge_type && (
              <p className="text-sm text-red-500">{errors.challenge_type.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_value">
              {getTargetLabel()}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 ml-2 text-muted-foreground inline-block" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>The goal participants need to reach to complete the challenge</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              id="target_value"
              type="number"
              min={1}
              {...register('target_value', { valueAsNumber: true })}
            />
            {errors.target_value && (
              <p className="text-sm text-red-500">{errors.target_value.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                {...register('start_date')}
              />
              {errors.start_date && (
                <p className="text-sm text-red-500">{errors.start_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                {...register('end_date')}
              />
              {errors.end_date && (
                <p className="text-sm text-red-500">{errors.end_date.message}</p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Challenge'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}