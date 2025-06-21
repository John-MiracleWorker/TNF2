import { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Star, 
  Flame, 
  Target, 
  TrendingUp, 
  Award,
  Crown,
  Zap,
  Calendar,
  Users,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AuthContext } from '@/App';
import { getUserStats, getUserAchievements, getActiveChallenges, getUserChallengeProgress, getLeaderboard, getUserRank } from '@/lib/supabase-gamification';
import { getLevelProgress, RARITY_STYLES } from '@/lib/gamification';
import type { UserStats, UserAchievement, Challenge, UserChallengeProgress } from '@/lib/gamification';

interface GamificationDashboardProps {
  onPractice?: () => void;
  onViewAchievements?: () => void;
  onViewChallenges?: () => void;
}

export function GamificationDashboard({ onPractice, onViewAchievements, onViewChallenges }: GamificationDashboardProps) {
  const { session } = useContext(AuthContext);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challengeProgress, setChallengeProgress] = useState<UserChallengeProgress[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      loadDashboardData();
    }
  }, [session]);

  const loadDashboardData = async () => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    try {
      const [
        statsData,
        achievementsData,
        challengesData,
        progressData,
        leaderboardData,
        rankData
      ] = await Promise.all([
        getUserStats(session.user.id),
        getUserAchievements(session.user.id),
        getActiveChallenges(),
        getUserChallengeProgress(session.user.id),
        getLeaderboard(10),
        getUserRank(session.user.id)
      ]);

      setUserStats(statsData);
      setAchievements(achievementsData);
      setChallenges(challengesData);
      setChallengeProgress(progressData);
      setLeaderboard(leaderboardData);
      setUserRank(rankData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (!userStats) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Trophy className="h-12 w-12 text-navy/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-navy mb-2">Start Your Journey</h3>
          <p className="text-navy/60 mb-4">Begin memorizing scripture to unlock achievements and track your progress!</p>
          <Button onClick={onPractice} className="bg-gold text-navy hover:bg-gold/90">
            Start Practicing
          </Button>
        </CardContent>
      </Card>
    );
  }

  const levelInfo = getLevelProgress(userStats.experience_points);
  const recentAchievements = achievements.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Crown className="h-6 w-6 text-gold mr-2" />
                <span className="text-2xl font-bold text-navy">{levelInfo.currentLevel}</span>
              </div>
              <p className="text-sm text-navy/70">Level</p>
              <Progress value={levelInfo.progress} className="mt-2 h-2" />
              <p className="text-xs text-navy/50 mt-1">
                {userStats.experience_points} / {levelInfo.nextLevelXP} XP
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Star className="h-6 w-6 text-gold mr-2" />
                <span className="text-2xl font-bold text-navy">{userStats.total_points}</span>
              </div>
              <p className="text-sm text-navy/70">Points</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Flame className="h-6 w-6 text-orange-500 mr-2" />
                <span className="text-2xl font-bold text-navy">{userStats.current_streak}</span>
              </div>
              <p className="text-sm text-navy/70">Day Streak</p>
              <p className="text-xs text-navy/50">Best: {userStats.longest_streak}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Award className="h-6 w-6 text-purple-500 mr-2" />
                <span className="text-2xl font-bold text-navy">{userStats.achievements_count}</span>
              </div>
              <p className="text-sm text-navy/70">Achievements</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="progress" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Memorization Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2 text-gold" />
                  Memorization Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Verses Memorized</span>
                      <span className="text-sm text-navy/70">{userStats.verses_memorized}</span>
                    </div>
                    <Progress value={Math.min(100, (userStats.verses_memorized / 10) * 100)} className="h-2" />
                    <p className="text-xs text-navy/50 mt-1">Goal: 10 verses</p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Practice Time</span>
                      <span className="text-sm text-navy/70">{userStats.total_practice_time} min</span>
                    </div>
                    <Progress value={Math.min(100, (userStats.total_practice_time / 120) * 100)} className="h-2" />
                    <p className="text-xs text-navy/50 mt-1">Goal: 2 hours</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rank & Position */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-gold" />
                  Your Rank
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-navy mb-2">
                    #{userRank || 'Unranked'}
                  </div>
                  <p className="text-navy/70 mb-4">
                    {userRank ? `Out of ${leaderboard.length}+ users` : 'Start practicing to get ranked!'}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onPractice?.()}
                  >
                    Practice Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          {recentAchievements.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentAchievements.map((userAchievement) => {
                const achievement = userAchievement.achievement;
                if (!achievement) return null;
                
                const rarityStyle = RARITY_STYLES[achievement.rarity];
                
                return (
                  <motion.div
                    key={userAchievement.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className={`${rarityStyle.border} ${rarityStyle.glow} shadow-lg`}>
                      <CardContent className="p-4 text-center">
                        <div className={`${rarityStyle.bg} ${rarityStyle.text} rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3`}>
                          <Zap className="h-8 w-8" />
                        </div>
                        <h3 className="font-bold text-navy mb-1">{achievement.name}</h3>
                        <p className="text-sm text-navy/70 mb-2">{achievement.description}</p>
                        <Badge className={`${rarityStyle.bg} ${rarityStyle.text}`}>
                          {achievement.rarity}
                        </Badge>
                        <div className="text-xs text-navy/50 mt-2">
                          Earned {new Date(userAchievement.earned_at).toLocaleDateString()}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Trophy className="h-12 w-12 text-navy/20 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-navy mb-2">No Achievements Yet</h3>
                <p className="text-navy/60 mb-4">Start practicing to earn your first achievement!</p>
                <Button onClick={onPractice} className="bg-gold text-navy hover:bg-gold/90">
                  Start Practicing
                </Button>
              </CardContent>
            </Card>
          )}
          
          {achievements.length > 3 && (
            <div className="text-center">
              <Button variant="outline" onClick={onViewAchievements}>
                View All Achievements
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="challenges" className="space-y-4">
          {challenges.length > 0 ? (
            <div className="space-y-4">
              {challenges.map((challenge) => {
                const progress = challengeProgress.find(p => p.challenge_id === challenge.id);
                const progressPercent = progress 
                  ? Math.min(100, (progress.current_progress / challenge.target_criteria.target) * 100)
                  : 0;

                return (
                  <Card key={challenge.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center">
                            <Calendar className="h-5 w-5 mr-2 text-gold" />
                            {challenge.title}
                          </CardTitle>
                          <p className="text-navy/70 mt-1">{challenge.description}</p>
                        </div>
                        <Badge variant="outline" className="bg-gold/10 text-gold">
                          {challenge.points_reward} pts
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{progress?.current_progress || 0} / {challenge.target_criteria.target}</span>
                        </div>
                        <Progress value={progressPercent} className="h-2" />
                        <div className="flex justify-between text-xs text-navy/50">
                          <span>Ends: {new Date(challenge.end_date).toLocaleDateString()}</span>
                          {progress?.completed && (
                            <span className="text-green-600 font-medium">Completed!</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Calendar className="h-12 w-12 text-navy/20 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-navy mb-2">No Active Challenges</h3>
                <p className="text-navy/60">Check back later for new challenges!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          {leaderboard.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2 text-gold" />
                  Top Scripture Memorizers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leaderboard.map((user, index) => (
                    <div 
                      key={user.user_id} 
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        user.user_id === session?.user?.id ? 'bg-gold/10 border border-gold/20' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-yellow-500 text-white' :
                          index === 1 ? 'bg-gray-400 text-white' :
                          index === 2 ? 'bg-amber-600 text-white' :
                          'bg-navy/10 text-navy'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-navy">
                            {user.display_name || user.first_name || 'Anonymous'}
                            {user.user_id === session?.user?.id && (
                              <span className="text-gold ml-2">(You)</span>
                            )}
                          </p>
                          <p className="text-sm text-navy/60">
                            {user.verses_memorized} verses • Level {user.current_level}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-navy">{user.total_points}</p>
                        <p className="text-xs text-navy/50">points</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Users className="h-12 w-12 text-navy/20 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-navy mb-2">Leaderboard Coming Soon</h3>
                <p className="text-navy/60">Be among the first to start memorizing scripture!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}