import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Tag, Calendar, Heart, Users, MessageSquare, AlertCircle, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getCommunityPrayers, prayForRequest, hasPrayedFor } from '@/lib/supabase';
import type { PrayerRequest } from '@/lib/types';

interface CommunityPrayerListProps {
  onSelectRequest?: (request: PrayerRequest) => void;
}

export function CommunityPrayerList({ onSelectRequest }: CommunityPrayerListProps) {
  const [communityPrayers, setCommunityPrayers] = useState<PrayerRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [prayedForMap, setPrayedForMap] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadCommunityPrayers();
  }, []);

  const loadCommunityPrayers = async () => {
    setIsLoading(true);
    try {
      const prayers = await getCommunityPrayers();
      setCommunityPrayers(prayers);
      
      // Check which prayers the user has prayed for
      const prayedMap: Record<string, boolean> = {};
      
      for (const prayer of prayers) {
        if (prayer.id) {
          const hasPrayed = await hasPrayedFor(prayer.id);
          prayedMap[prayer.id] = hasPrayed;
        }
      }
      
      setPrayedForMap(prayedMap);
    } catch (error) {
      console.error('Error loading community prayers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load community prayer requests',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrayForRequest = async (prayerId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!prayerId) return;
    
    try {
      const result = await prayForRequest(prayerId);
      
      if (result.alreadyPrayed) {
        toast({
          title: 'Already Prayed',
          description: "You've already prayed for this request"
        });
        return;
      }
      
      // Update the UI
      setPrayedForMap(prev => ({ ...prev, [prayerId]: true }));
      
      setCommunityPrayers(prev => 
        prev.map(prayer => 
          prayer.id === prayerId 
            ? { ...prayer, prayer_count: (prayer.prayer_count || 0) + 1 } 
            : prayer
        )
      );
      
      toast({
        title: 'Prayer Recorded',
        description: 'Thank you for praying for this request'
      });
    } catch (error) {
      console.error('Error praying for request:', error);
      toast({
        title: 'Error',
        description: 'Failed to record your prayer',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-2">Loading community prayer requests...</p>
      </div>
    );
  }

  if (communityPrayers.length === 0) {
    return (
      <div className="py-12 text-center">
        <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No Community Prayers Yet</h3>
        <p className="text-muted-foreground mb-6">
          Be the first to share a prayer request with the community
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-foreground flex items-center">
          <Users className="h-5 w-5 mr-2 text-muted-foreground" />
          Shared Prayer Requests
        </h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="outline" onClick={loadCommunityPrayers} className="h-7">
                <Eye className="h-3.5 w-3.5 mr-1" /> Refresh
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Refresh prayer requests</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {communityPrayers.map((prayer) => (
        <motion.div
          key={prayer.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-3"
        >
          <Card 
            className={`
              hover:shadow-md transition-shadow cursor-pointer
              ${prayer.is_answered ? 'border-l-4 border-l-green-500' : ''}
            `}
            onClick={() => onSelectRequest?.(prayer)}
          >
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-foreground flex items-center space-x-2">
                    {prayer.is_answered && (
                      <Badge className="mr-2 bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800">
                        Answered
                      </Badge>
                    )}
                    {prayer.title}
                  </CardTitle>
                  <div className="text-sm text-muted-foreground mt-1 flex items-center">
                    <Users className="h-3.5 w-3.5 mr-1" />
                    From: {prayer.profiles?.display_name || prayer.profiles?.first_name || 'Anonymous'}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pb-2">
              <p className="text-foreground/80 line-clamp-2">{prayer.description}</p>
            </CardContent>

            <CardFooter className="flex justify-between pt-2 border-t border-border">
              <div className="flex flex-wrap gap-1">
                {prayer.tags && prayer.tags.map((tag, i) => (
                  <Badge key={i} variant="outline" className="bg-muted/50 text-muted-foreground">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-xs text-muted-foreground flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  {prayer.created_at && format(new Date(prayer.created_at), 'MMM d, yyyy')}
                </div>
                <Button 
                  size="sm" 
                  variant={prayedForMap[prayer.id!] ? "outline" : "default"}
                  className={prayedForMap[prayer.id!] 
                    ? "border-rose-500 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30" 
                    : "bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-800"
                  }
                  onClick={(e) => prayer.id && handlePrayForRequest(prayer.id, e)}
                >
                  <Heart className={`mr-1 h-4 w-4 ${prayedForMap[prayer.id!] ? "fill-rose-500 dark:fill-rose-400" : ""}`} />
                  {prayedForMap[prayer.id!] ? "Prayed" : "Pray"}
                  {prayer.prayer_count ? ` (${prayer.prayer_count})` : ""}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}