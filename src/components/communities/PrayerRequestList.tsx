import { useState, useEffect } from 'react';
import { 
  Hand, 
  MessageSquare, 
  Loader2,
  Heart,
  Calendar,
  User,
  Shield,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { SharePrayerRequestDialog } from './SharePrayerRequestDialog';

interface PrayerRequestListProps {
  communityId: string;
  circleId?: string;
}

interface CommunityPrayerRequest {
  id: string;
  user_id: string;
  title: string;
  description: string;
  is_anonymous: boolean;
  is_answered: boolean;
  prayer_count: number;
  created_at: string;
  user_profile?: {
    display_name?: string;
    first_name?: string;
  };
  has_prayed?: boolean;
}

export function PrayerRequestList({ communityId, circleId }: PrayerRequestListProps) {
  const [prayers, setPrayers] = useState<CommunityPrayerRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [prayingForId, setPrayingForId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPrayerRequests();
  }, [communityId, circleId]);

  const loadPrayerRequests = async () => {
    setIsLoading(true);
    
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Fetch prayer requests for this community
      let query = supabase
        .from('community_prayer_requests')
        .select(`
          *,
          user_profile:profiles(
            display_name,
            first_name
          )
        `)
        .eq('community_id', communityId)
        .order('created_at', { ascending: false });
        
      // Add circle filter if provided
      if (circleId) {
        query = query.eq('circle_id', circleId);
      }
      
      const { data: prayerData, error } = await query;
      
      if (error) {
        throw error;
      }
      
      // Fetch the prayer interactions to determine which ones the user has prayed for
      const { data: prayerInteractions, error: interactionsError } = await supabase
        .from('community_prayer_interactions')
        .select('prayer_id')
        .eq('user_id', user.id);
        
      if (interactionsError) {
        console.error('Error fetching prayer interactions:', interactionsError);
        // Continue anyway, this is non-critical
      }
      
      // Create a set of prayer IDs the user has prayed for
      const prayedForIds = new Set(prayerInteractions?.map(i => i.prayer_id) || []);
      
      // Add the has_prayed flag to each prayer request
      const enrichedPrayers = prayerData?.map((prayer: any) => ({
        ...prayer,
        has_prayed: prayedForIds.has(prayer.id)
      })) || [];
      
      setPrayers(enrichedPrayers);
    } catch (error) {
      console.error('Error loading prayer requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load prayer requests',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrayForRequest = async (prayerId: string) => {
    try {
      setPrayingForId(prayerId);
      
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Check if already prayed
      const prayer = prayers.find(p => p.id === prayerId);
      if (prayer?.has_prayed) {
        toast({
          title: 'Already Prayed',
          description: 'You have already prayed for this request',
        });
        return;
      }
      
      // Create prayer interaction
      const { error } = await supabase
        .from('community_prayer_interactions')
        .insert({
          prayer_id: prayerId,
          user_id: user.id
        });
        
      if (error) {
        throw error;
      }
      
      // Update local state
      setPrayers(prev => 
        prev.map(prayer => 
          prayer.id === prayerId 
            ? { 
                ...prayer, 
                has_prayed: true,
                prayer_count: prayer.prayer_count + 1 
              } 
            : prayer
        )
      );
      
      toast({
        title: 'Prayer Recorded',
        description: 'Thank you for praying for this request',
      });
    } catch (error) {
      console.error('Error praying for request:', error);
      toast({
        title: 'Error',
        description: 'Failed to record your prayer',
        variant: 'destructive',
      });
    } finally {
      setPrayingForId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (prayers.length === 0) {
    return (
      <div className="text-center py-8">
        <Hand className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No prayer requests yet</h3>
        <p className="text-muted-foreground mb-6">
          Be the first to share a prayer request with this community
        </p>
        <SharePrayerRequestDialog 
          communityId={communityId} 
          circleId={circleId}
          onRequestShared={loadPrayerRequests}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <SharePrayerRequestDialog 
          communityId={communityId} 
          circleId={circleId} 
          onRequestShared={loadPrayerRequests}
        />
      </div>
      
      <div className="space-y-4">
        {prayers.map((prayer) => (
          <Card key={prayer.id} className={prayer.is_answered ? "border-l-4 border-l-green-500" : ""}>
            <CardHeader className="pb-2">
              <div className="flex justify-between">
                <CardTitle className="text-lg">
                  {prayer.is_answered && (
                    <Badge className="mr-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                      <Check className="h-3 w-3 mr-1" />
                      Answered
                    </Badge>
                  )}
                  {prayer.title}
                </CardTitle>
                
                {prayer.is_anonymous ? (
                  <Badge variant="outline">Anonymous</Badge>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback>
                        {prayer.user_profile?.display_name?.[0] || 
                         prayer.user_profile?.first_name?.[0] || 
                         'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">
                      {prayer.user_profile?.display_name || 
                       prayer.user_profile?.first_name || 
                       'User'}
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            
            <CardContent>
              <p className="text-foreground">{prayer.description}</p>
            </CardContent>
            
            <CardFooter className="flex justify-between pt-2">
              <div className="text-xs text-muted-foreground">
                <Calendar className="h-3 w-3 inline mr-1" />
                {format(new Date(prayer.created_at), 'MMM d, yyyy')}
              </div>
              
              <Button
                variant={prayer.has_prayed ? "outline" : "default"}
                size="sm"
                onClick={() => handlePrayForRequest(prayer.id)}
                disabled={prayingForId === prayer.id}
                className={prayer.has_prayed 
                  ? "border-rose-500 text-rose-600 hover:bg-rose-50" 
                  : "bg-rose-600 text-white hover:bg-rose-700"
                }
              >
                {prayingForId === prayer.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Heart className={`h-4 w-4 mr-1 ${prayer.has_prayed ? "fill-rose-500" : ""}`} />
                )}
                {prayer.has_prayed ? "Prayed" : "Pray"}
                {prayer.prayer_count > 0 && ` (${prayer.prayer_count})`}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}