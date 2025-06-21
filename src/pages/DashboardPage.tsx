import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Book, Hand, BookOpen, FileBadge, PenTool, BarChart3, CalendarClock, TrendingUp, BookHeart, ArrowRight, Quote, Sunrise, Search, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SpiritualAnalytics } from '@/components/dashboard/SpiritualAnalytics';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AuthContext } from '@/App';
import { 
  getJournalEntries, 
  getPrayerRequests, 
  getScriptureMemories,
  getDailyDevotionals,
  getSpiritualHabits,
  getMoodEntries,
  getProfile
} from '@/lib/supabase';
import { 
  JournalEntry, 
  PrayerRequest, 
  ScriptureMemory,
  DailyDevotional,
  SpiritualHabit,
  MoodEntry,
  UserProfile
} from '@/lib/types';
import { format, subDays } from 'date-fns';
import { MoodEntryForm } from '@/components/dashboard/MoodEntryForm';
import { MoodBasedRecommendations } from '@/components/dashboard/MoodBasedRecommendations';

// Curated verses for personalized daily inspiration
const DAILY_VERSES = [
  {
    reference: "Jeremiah 29:11",
    text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.",
    theme: "hope"
  },
  {
    reference: "Philippians 4:13",
    text: "I can do all things through Christ who strengthens me.",
    theme: "strength"
  },
  {
    reference: "Psalm 23:1",
    text: "The Lord is my shepherd; I shall not want.",
    theme: "comfort"
  },
  {
    reference: "Romans 8:28",
    text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose.",
    theme: "trust"
  },
  {
    reference: "Isaiah 40:31",
    text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.",
    theme: "renewal"
  },
  {
    reference: "Proverbs 3:5-6",
    text: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.",
    theme: "guidance"
  },
  {
    reference: "Joshua 1:9",
    text: "Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.",
    theme: "courage"
  },
  {
    reference: "1 Corinthians 13:4-5",
    text: "Love is patient, love is kind. It does not envy, it does not boast, it is not proud. It does not dishonor others, it is not self-seeking, it is not easily angered, it keeps no record of wrongs.",
    theme: "love"
  },
  {
    reference: "Matthew 11:28",
    text: "Come to me, all you who are weary and burdened, and I will give you rest.",
    theme: "rest"
  },
  {
    reference: "Psalm 46:10",
    text: "Be still, and know that I am God; I will be exalted among the nations, I will be exalted in the earth.",
    theme: "peace"
  },
  {
    reference: "2 Corinthians 5:7",
    text: "For we live by faith, not by sight.",
    theme: "faith"
  },
  {
    reference: "Ephesians 2:8-9",
    text: "For it is by grace you have been saved, through faith—and this is not from yourselves, it is the gift of God—not by works, so that no one can boast.",
    theme: "grace"
  },
  {
    reference: "Psalm 118:24",
    text: "This is the day the Lord has made; let us rejoice and be glad in it.",
    theme: "joy"
  },
  {
    reference: "Matthew 6:26",
    text: "Look at the birds of the air; they do not sow or reap or store away in barns, and yet your heavenly Father feeds them. Are you not much more valuable than they?",
    theme: "provision"
  },
  {
    reference: "Philippians 4:6-7",
    text: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.",
    theme: "peace"
  }
];

const DashboardPage = () => {
  const { session } = useContext(AuthContext);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>([]);
  const [scriptureMemories, setScriptureMemories] = useState<ScriptureMemory[]>([]);
  const [devotionals, setDevotionals] = useState<DailyDevotional[]>([]);
  const [habits, setHabits] = useState<SpiritualHabit[]>([]);
  const [moodData, setMoodData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [todaysVerse, setTodaysVerse] = useState(DAILY_VERSES[0]);
  const [showMoodForm, setShowMoodForm] = useState(false);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [showAnalytics, setShowAnalytics] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      loadDashboardData();
    }
  }, [session]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Get last 30 days for mood data
      const today = new Date();
      const thirtyDaysAgo = subDays(today, 30);
      const formattedToday = format(today, 'yyyy-MM-dd');
      const formattedThirtyDaysAgo = format(thirtyDaysAgo, 'yyyy-MM-dd');
      
      // Load user profile
      let userProfileData = null;
      if (session?.user?.id) {
        userProfileData = await getProfile(session.user.id);
      }
      
      // Load all dashboard data in parallel
      const [
        journalData, 
        prayerData, 
        scriptureData, 
        devotionalData,
        habitsData,
        moodEntries
      ] = await Promise.all([
        getJournalEntries(),
        getPrayerRequests(),
        getScriptureMemories(),
        getDailyDevotionals(7),
        getSpiritualHabits(),
        getMoodEntries(formattedThirtyDaysAgo, formattedToday)
      ]);
      
      setUserProfile(userProfileData);
      setJournalEntries(journalData);
      setPrayerRequests(prayerData);
      setScriptureMemories(scriptureData);
      setDevotionals(devotionalData);
      setHabits(habitsData);
      
      // Process mood data for chart
      const processedMoodData = processMoodData(moodEntries);
      setMoodData(processedMoodData);

      // Set personalized verse of the day
      const personalizedVerse = getPersonalizedVerse(moodEntries, prayerData);
      setTodaysVerse(personalizedVerse);
      
      // Show mood form if no entry for today
      const todayStr = format(today, 'yyyy-MM-dd');
      const hasTodayEntry = moodEntries.some(entry => 
        entry.entry_date === todayStr
      );
      setShowMoodForm(!hasTodayEntry);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Get the user's display name or fallback to other options
  const getUserDisplayName = () => {
    // First try to use the profile display name
    if (userProfile?.display_name) {
      return userProfile.display_name;
    }
    
    // Then try the first name
    if (userProfile?.first_name) {
      return userProfile.first_name;
    }
    
    // Fall back to the email username
    return session?.user?.email?.split('@')[0] || 'Friend';
  };
  
  // Process mood data for the chart
  const processMoodData = (entries: MoodEntry[]) => {
    // Create a map of dates to average scores
    const dateMap = new Map();
    
    entries.forEach(entry => {
      const date = format(new Date(entry.entry_date), 'MMM dd');
      if (!dateMap.has(date)) {
        dateMap.set(date, { 
          date, 
          moodTotal: entry.mood_score, 
          spiritualTotal: entry.spiritual_score,
          count: 1 
        });
      } else {
        const current = dateMap.get(date);
        dateMap.set(date, {
          ...current,
          moodTotal: current.moodTotal + entry.mood_score,
          spiritualTotal: current.spiritualTotal + entry.spiritual_score,
          count: current.count + 1
        });
      }
    });
    
    // Convert map to array and calculate averages
    const result = Array.from(dateMap.values()).map(item => ({
      date: item.date,
      mood: Math.round((item.moodTotal / item.count) * 10) / 10,
      spiritual: Math.round((item.spiritualTotal / item.count) * 10) / 10
    }));
    
    // Sort by date
    result.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
    
    return result;
  };

  // Get personalized verse based on user's recent activity and mood
  const getPersonalizedVerse = (moodEntries: MoodEntry[], prayers: PrayerRequest[]) => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    
    // Base verse selection on day of year for consistency
    let verseIndex = dayOfYear % DAILY_VERSES.length;
    
    // Personalize based on recent mood if available
    const recentMoodEntries = moodEntries.slice(-7); // Last 7 entries
    if (recentMoodEntries.length > 0) {
      const avgMood = recentMoodEntries.reduce((sum, entry) => sum + entry.mood_score, 0) / recentMoodEntries.length;
      const avgSpiritual = recentMoodEntries.reduce((sum, entry) => sum + entry.spiritual_score, 0) / recentMoodEntries.length;
      
      // If struggling spiritually or emotionally, prioritize comfort/hope themes
      if (avgMood < 6 || avgSpiritual < 6) {
        const comfortVerses = DAILY_VERSES.filter(v => 
          v.theme === 'comfort' || v.theme === 'hope' || v.theme === 'strength' || v.theme === 'peace'
        );
        if (comfortVerses.length > 0) {
          verseIndex = DAILY_VERSES.indexOf(comfortVerses[dayOfYear % comfortVerses.length]);
        }
      }
      
      // If doing well, focus on growth and gratitude themes
      else if (avgMood >= 8 && avgSpiritual >= 8) {
        const growthVerses = DAILY_VERSES.filter(v => 
          v.theme === 'joy' || v.theme === 'love' || v.theme === 'faith' || v.theme === 'grace'
        );
        if (growthVerses.length > 0) {
          verseIndex = DAILY_VERSES.indexOf(growthVerses[dayOfYear % growthVerses.length]);
        }
      }
    }
    
    // Consider recent prayer requests for additional personalization
    const recentPrayers = prayers.filter(p => {
      const prayerDate = new Date(p.created_at || '');
      const daysDiff = (today.getTime() - prayerDate.getTime()) / (1000 * 3600 * 24);
      return daysDiff <= 7; // Last 7 days
    });
    
    if (recentPrayers.length > 0) {
      const hasAnsweredPrayers = recentPrayers.some(p => p.is_answered);
      if (hasAnsweredPrayers) {
        // If prayers were answered, focus on gratitude and trust
        const gratitudeVerses = DAILY_VERSES.filter(v => 
          v.theme === 'joy' || v.theme === 'trust' || v.theme === 'grace'
        );
        if (gratitudeVerses.length > 0) {
          verseIndex = DAILY_VERSES.indexOf(gratitudeVerses[dayOfYear % gratitudeVerses.length]);
        }
      }
    }
    
    return DAILY_VERSES[verseIndex];
  };
  
  // Calculate percentage of answered prayers
  const answeredPrayersPercentage = prayerRequests.length > 0
    ? Math.round((prayerRequests.filter(p => p.is_answered).length / prayerRequests.length) * 100)
    : 0;
  
  // Calculate scripture memory progress
  const memorizedVerses = scriptureMemories.filter(s => s.memorized_level >= 4).length;
  const totalVerses = scriptureMemories.length;
  const memorizedPercentage = totalVerses > 0 ? Math.round((memorizedVerses / totalVerses) * 100) : 0;
  
  const quickActions = [
    { name: 'New Chat', href: '/chat', icon: MessageSquare, color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400' },
    { name: 'Bible', href: '/bible', icon: Search, color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' },
    { name: 'Journal', href: '/journal', icon: Book, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' },
    { name: 'Prayer', href: '/prayer', icon: Hand, color: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400' },
    { name: 'Reading Plans', href: '/reading-plans', icon: Calendar, color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400' },
  ];

  const handleMoodEntrySubmitted = () => {
    setShowMoodForm(false);
    // Reload dashboard data to update mood chart
    const loadDashboardData = async () => {
      try {
        // Get last 30 days for mood data
        const today = new Date();
        const thirtyDaysAgo = subDays(today, 30);
        const formattedToday = format(today, 'yyyy-MM-dd');
        const formattedThirtyDaysAgo = format(thirtyDaysAgo, 'yyyy-MM-dd');
        
        const moodEntries = await getMoodEntries(formattedThirtyDaysAgo, formattedToday);
        const processedMoodData = processMoodData(moodEntries);
        setMoodData(processedMoodData);
      } catch (error) {
        console.error('Error reloading mood data:', error);
      }
    };
    
    loadDashboardData();
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome, {getUserDisplayName()}
          </h1>
          <p className="text-muted-foreground">
            Track your spiritual journey and grow in faith
          </p>
        </div>

        {/* Personalized Verse of the Day */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="border-secondary/30 bg-gradient-to-br from-cream to-secondary/5 relative overflow-hidden dark:from-card dark:to-secondary/10">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full translate-x-16 -translate-y-16" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full -translate-x-12 translate-y-12" />
            
            <CardHeader className="relative z-10">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-secondary/20 p-2 rounded-full">
                  <Sunrise className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-foreground">Your Verse for Today</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {format(new Date(), 'EEEE, MMMM d, yyyy')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <div className="p-6 pt-0 relative z-10">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Quote className="h-6 w-6 text-secondary/70 mt-1 shrink-0" />
                  <div>
                    <blockquote className="text-lg md:text-xl text-foreground italic leading-relaxed">
                      "{todaysVerse.text}"
                    </blockquote>
                    <cite className="text-muted-foreground font-medium mt-3 block">
                      — {todaysVerse.reference}
                    </cite>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-4">
                  <Badge 
                    variant="outline" 
                    className="bg-secondary/10 text-secondary border-secondary/30 capitalize"
                  >
                    Theme: {todaysVerse.theme}
                  </Badge>
                  
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-primary/20 text-primary hover:bg-primary/20 dark:border-primary/30 dark:hover:bg-primary/20"
                      asChild
                    >
                      <Link to="/scripture-memory">
                        <BookHeart className="mr-2 h-4 w-4" />
                        Memorize
                      </Link>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-primary/20 text-primary hover:bg-primary/20 dark:border-primary/30 dark:hover:bg-primary/20"
                      asChild
                    >
                      <Link to="/bible">
                        <Search className="mr-2 h-4 w-4" />
                        Explore
                      </Link>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-primary/20 text-primary hover:bg-primary/20 dark:border-primary/30 dark:hover:bg-primary/20"
                      asChild
                    >
                      <Link 
                        to={{
                          pathname: "/chat",
                          search: `?verse=${encodeURIComponent(todaysVerse.reference)}&text=${encodeURIComponent(todaysVerse.text)}`
                        }}
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Reflect
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.section>
        
        {/* Mood-Based Recommendations */}
        <MoodBasedRecommendations timeRange={timeRange} />

        {/* Spiritual Analytics */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Spiritual Analytics</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAnalytics(!showAnalytics)}
            >
              {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
            </Button>
          </div>

          {showAnalytics && (
            <SpiritualAnalytics
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
          )}
        </section>
        
        {/* Quick Actions */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {quickActions.map((action) => (
              <Link key={action.name} to={action.href}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <div className={`${action.color} p-3 rounded-full mb-3`}>
                      <action.icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-medium">{action.name}</h3>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
        
        {/* Mood Entry Form (conditionally shown) */}
        {showMoodForm && (
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Daily Check-in</h2>
            <MoodEntryForm onEntrySubmitted={handleMoodEntrySubmitted} />
          </section>
        )}
        
        {/* Spiritual Progress */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <BookHeart className="h-5 w-5 mr-2 text-secondary" />
                Scripture Memory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Progress</span>
                  <span className="text-sm font-medium">{memorizedPercentage}%</span>
                </div>
                <Progress value={memorizedPercentage} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  {memorizedVerses} of {totalVerses} verses memorized
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" size="sm" className="w-full text-primary hover:text-primary hover:bg-primary/20" asChild>
                <Link to="/scripture-memory">
                  Practice Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Hand className="h-5 w-5 mr-2 text-secondary" />
                Prayer Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Answered Prayers</span>
                  <span className="text-sm font-medium">{answeredPrayersPercentage}%</span>
                </div>
                <Progress value={answeredPrayersPercentage} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  {prayerRequests.filter(p => p.is_answered).length} of {prayerRequests.length} prayers answered
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" size="sm" className="w-full text-primary hover:text-primary hover:bg-primary/20" asChild>
                <Link to="/prayer">
                  View Prayer List
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <CalendarClock className="h-5 w-5 mr-2 text-secondary" />
                Today's Focus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {habits.slice(0, 3).map((habit, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm">{habit.habit_name}</span>
                    <span className="text-xs bg-primary/10 px-2 py-1 rounded-full">
                      {habit.streak_current} day streak
                    </span>
                  </div>
                ))}
                {habits.length === 0 && (
                  <p className="text-sm text-muted-foreground">No habits tracked yet</p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" size="sm" className="w-full text-primary hover:text-primary hover:bg-primary/20" asChild>
                <Link to="/habits">
                  Track Habits
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </section>
        
        {/* Recent Activity */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Recent Activity</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent Journal Entries */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Book className="h-5 w-5 mr-2 text-secondary" />
                  Recent Journal Entries
                </CardTitle>
              </CardHeader>
              <CardContent>
                {journalEntries.slice(0, 3).map((entry, index) => (
                  <div key={index} className="py-2 border-b last:border-0">
                    <h3 className="font-medium">{entry.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">{entry.summary}</p>
                    <div className="text-xs text-muted-foreground mt-1">
                      {entry.created_at && format(new Date(entry.created_at), 'MMM d, yyyy')}
                    </div>
                  </div>
                ))}
                {journalEntries.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4">No journal entries yet</p>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="ghost" size="sm" className="w-full text-primary hover:text-primary hover:bg-primary/20" asChild>
                  <Link to="/journal">
                    View All Journal Entries
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
            
            {/* Daily Devotional */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <BookOpen className="h-5 w-5 mr-2 text-secondary" />
                  Daily Devotional
                </CardTitle>
              </CardHeader>
              <CardContent>
                {devotionals.length > 0 ? (
                  <div>
                    <h3 className="font-medium">{devotionals[0].title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {devotionals[0].scripture_reference}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                      {devotionals[0].content}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4">No devotionals available</p>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="ghost" size="sm" className="w-full text-primary hover:text-primary hover:bg-primary/20" asChild>
                  <Link to="/devotionals">
                    Read Today's Devotional
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;