import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Target, Calendar, Users, Loader2, Trophy, ArrowRight, CheckCircle, PlusCircle, UserPlus, Hand, BookOpen, BookHeart } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { getCommunityChallenge, joinCommunityChallenge, updateChallengeProgress } from '@/lib/communities';
import { CommunityChallenge } from '@/lib/types';
import { CreateChallengeDialog } from './CreateChallengeDialog';

interface ChallengeListProps {
  communityId: string;
}

export function ChallengeList({ communityId }: ChallengeListProps) {
  const [challenges, setChallenges] = useState<CommunityChallenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [participations, setParticipations] = useState<Record<string, any>>({});
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadChallenges();
  }, [communityId]);

  const loadChallenges = async () => {
    setIsLoading(true);
    try {
      const data = await getCommunityChallenge(communityId);
      setChallenges(data);
      
      // TODO: Load user's participation status for each challenge
      // This would require a new function to get challenge participants
      
    } catch (error) {
      console.error('Error loading challenges:', error);
      toast({
        title: 'Error',
        description: 'Failed to load community challenges',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinChallenge = async (challengeId: string) => {
    try {
      await joinCommunityChallenge(challengeId);
      toast({
        title: 'Challenge Joined',
        description: 'You have successfully joined this challenge',
      });
      loadChallenges(); // Reload to update participation status
    } catch (error) {
      console.error('Error joining challenge:', error);
      toast({
        title: 'Error',
        description: 'Failed to join challenge',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateProgress = async (challengeId: string, newProgress: number) => {
    try {
      await updateChallengeProgress(challengeId, newProgress);
      toast({
        title: 'Progress Updated',
        description: 'Your challenge progress has been updated',
      });
      loadChallenges(); // Reload to update progress
    } catch (error) {
      console.error('Error updating progress:', error);
      toast({
        title: 'Error',
        description: 'Failed to update progress',
        variant: 'destructive',
      });
    }
  };

  const handleChallengeCreated = () => {
    loadChallenges();
    toast({
      title: 'Success',
      description: 'Challenge created successfully',
    });
  };

  const getChallengeTypeIcon = (type: string) => {
    switch (type) {
      case 'prayer':
        return <Hand className="h-4 w-4" />;
      case 'scripture':
        return <BookOpen className="h-4 w-4" />;
      case 'devotional':
        return <BookHeart className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const getChallengeTypeColor = (type: string) => {
    switch (type) {
      case 'prayer':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'scripture':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'devotional':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      default:
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (challenges.length === 0) {
    return (
      <div className="text-center py-12">
        <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No Challenges Yet</h3>
        <p className="text-muted-foreground mb-6">
          This community doesn't have any challenges yet. Create one to encourage spiritual growth together!
        </p>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Target className="mr-2 h-4 w-4" />
          Create Challenge
        </Button>
        <CreateChallengeDialog 
          communityId={communityId}
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onChallengeCreated={handleChallengeCreated}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end mb-4">
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Target className="mr-2 h-4 w-4" />
          Create Challenge
        </Button>
        <CreateChallengeDialog 
          communityId={communityId}
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onChallengeCreated={handleChallengeCreated}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {challenges.map((challenge) => {
          const isActive = new Date(challenge.end_date) >= new Date();
          const hasStarted = new Date(challenge.start_date) <= new Date();
          const participation = participations[challenge.id || ''];
          const isParticipating = !!participation;
          const progress = participation?.current_progress || 0;
          const progressPercent = challenge.target_value > 0 
            ? Math.min(100, Math.round((progress / challenge.target_value) * 100)) 
            : 0;
          const isCompleted = participation?.completed || false;
          
          return (
            <Card key={challenge.id} className={!isActive ? 'border-muted' : ''}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge className={getChallengeTypeColor(challenge.challenge_type)}>
                        {getChallengeTypeIcon(challenge.challenge_type)}
                        <span className="ml-1 capitalize">{challenge.challenge_type}</span>
                      </Badge>
                      {!isActive && (
                        <Badge variant="outline" className="bg-muted text-muted-foreground">
                          Ended
                        </Badge>
                      )}
                      {!hasStarted && (
                        <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          Upcoming
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-xl">{challenge.name}</CardTitle>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center">
                    <Trophy className="h-4 w-4 mr-1" />
                    <span>{challenge.target_value} {challenge.challenge_type === 'prayer' ? 'prayers' : 
                           challenge.challenge_type === 'scripture' ? 'verses' : 
                           challenge.challenge_type === 'devotional' ? 'devotionals' : 'items'}</span>
                  </div>
                </div>
                <CardDescription className="mt-1">
                  {challenge.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pb-2">
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>{format(new Date(challenge.start_date), 'MMM d')} - {format(new Date(challenge.end_date), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    <span>0 participants</span>
                  </div>
                </div>
                
                {isParticipating && (
                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Your Progress</span>
                      <span className="text-sm">{progress} / {challenge.target_value}</span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                    {isCompleted && (
                      <div className="flex items-center text-green-600 dark:text-green-400 text-sm mt-1">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        <span>Challenge completed!</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
              
              <CardFooter>
                {isParticipating ? (
                  <div className="w-full flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleUpdateProgress(challenge.id!, progress + 1)}
                      disabled={!isActive || isCompleted}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Log Progress
                    </Button>
                    <Button 
                      variant="default" 
                      className="flex-1"
                      disabled={!isActive}
                    >
                      <ArrowRight className="mr-2 h-4 w-4" />
                      View Details
                    </Button>
                  </div>
                ) : (
                  <Button 
                    className="w-full" 
                    onClick={() => handleJoinChallenge(challenge.id!)}
                    disabled={!isActive}
                  >
                    Join Challenge
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}