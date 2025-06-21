import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Hand, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface SharePrayerRequestDialogProps {
  communityId: string;
  circleId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onRequestShared?: () => void;
}

export function SharePrayerRequestDialog({
  communityId,
  circleId,
  open,
  onOpenChange,
  onRequestShared
}: SharePrayerRequestDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a title for your prayer request',
        variant: 'destructive'
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a description for your prayer request',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be signed in to share a prayer request');
      }

      // Create the prayer request
      const { error } = await supabase
        .from('community_prayer_requests')
        .insert({
          community_id: communityId,
          circle_id: circleId || null,
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          is_anonymous: isAnonymous,
          is_answered: false,
          tags: []
        });

      if (error) {
        console.error('Error creating prayer request:', error);
        throw new Error(`Failed to create prayer request: ${error.message}`);
      }

      toast({
        title: 'Prayer Request Shared',
        description: 'Your prayer request has been shared with the community',
      });

      // Reset form
      setTitle('');
      setDescription('');
      setIsAnonymous(false);
      
      // Close dialog and trigger refresh
      if (onOpenChange) onOpenChange(false);
      if (onRequestShared) onRequestShared();
      
    } catch (error) {
      console.error('Error sharing prayer request:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to share prayer request',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Hand className="mr-2 h-4 w-4" />
          Share Prayer Request
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Prayer Request</DialogTitle>
          <DialogDescription>
            Share your prayer needs with the community
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="What would you like prayer for?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Provide details about your prayer request..."
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="is-anonymous"
              checked={isAnonymous}
              onCheckedChange={setIsAnonymous}
            />
            <Label htmlFor="is-anonymous">Share anonymously</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                <Hand className="mr-2 h-4 w-4" />
                Share Request
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}