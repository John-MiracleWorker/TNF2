import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { format, subDays, subMonths, subWeeks, addDays, isSameDay } from 'date-fns';
import { 
  BarChart3, 
  Calendar, 
  ArrowRight, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Heart,
  BookOpen,
  PenTool,
  Hand,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger
} from "@/components/ui/tabs";
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { getSpiritualAnalytics } from '@/lib/spiritual-analytics';

interface SpiritualAnalyticsProps {
  timeRange?: 'week' | 'month' | 'quarter' | 'year';
  onTimeRangeChange?: (range: 'week' | 'month' | 'quarter' | 'year') => void;
}

export function SpiritualAnalytics({ 
  timeRange = 'month',
  onTimeRangeChange
}: SpiritualAnalyticsProps) {
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInsights, setShowInsights] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const { toast } = useToast();
  const analyticsRef = useRef<any>(null);

  useEffect(() => {
    loadAnalytics(false);
  }, [timeRange]);

  const loadAnalytics = async (forceRefresh = false) => {
    setIsLoading(!analytics); // Only show loading state if we don't have any data yet
    if (forceRefresh) setIsRefreshing(true);
    setError(null);
    
    try {
      const data = await getSpiritualAnalytics(timeRange);
      setAnalytics(data);
      setLastRefreshed(new Date());
      analyticsRef.current = data; // Store in ref for future reference
      
      if (forceRefresh) {
        toast({
          title: 'Analytics Refreshed',
          description: 'Your spiritual insights have been updated with fresh data.'
        });
      }
    } catch (err) {
      console.error('Error loading spiritual analytics:', err);
      setError('Failed to load analytics data. Please try again.');
      
      // If we have cached data, continue to show it
      if (analyticsRef.current) {
        setAnalytics(analyticsRef.current);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load analytics data',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefreshAnalytics = () => {
    loadAnalytics(true);
  };

  const handleTimeRangeChange = (range: 'week' | 'month' | 'quarter' | 'year') => {
    if (onTimeRangeChange) {
      onTimeRangeChange(range);
    }
  };

  // Format the date range for display
  const getDateRangeText = () => {
    const today = new Date();
    let startDate;
    
    switch(timeRange) {
      case 'week':
        startDate = subDays(today, 7);
        break;
      case 'month':
        startDate = subMonths(today, 1);
        break;
      case 'quarter':
        startDate = subMonths(today, 3);
        break;
      case 'year':
        startDate = subMonths(today, 12);
        break;
      default:
        startDate = subMonths(today, 1);
    }
    
    return `${format(startDate, 'MMM d, yyyy')} - ${format(today, 'MMM d, yyyy')}`;
  };

  if (isLoading && !analytics) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Analyzing your spiritual journey...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !analytics) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6 flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">{error || 'No analytics data available yet'}</p>
            <Button onClick={() => loadAnalytics(true)} variant="outline">Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start mb-1">
          <div className="space-y-0.5">
            <div className="flex items-center">
              <Activity className="h-5 w-5 text-primary mr-2" />
              <CardTitle className="text-xl">Spiritual Journey Analytics</CardTitle>
            </div>
            <CardDescription>
              {getDateRangeText()}
              {lastRefreshed && (
                <span className="ml-2 text-xs">
                  (Insights updated: {format(lastRefreshed, 'h:mm a')})
                </span>
              )}
            </CardDescription>
          </div>
          <Tabs 
            defaultValue={timeRange} 
            value={timeRange} 
            className="w-auto"
            onValueChange={(value) => handleTimeRangeChange(value as any)}
          >
            <TabsList className="grid grid-cols-4 w-[300px]">
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="quarter">Quarter</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10">
            <Calendar className="h-3 w-3 mr-1" />
            {analytics.totalEntryCount} entries
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900">
            <TrendingUp className="h-3 w-3 mr-1" />
            {analytics.trends.overall === 'improving' ? 'Improving' : 
             analytics.trends.overall === 'stable' ? 'Stable' : 'Needs Focus'}
          </Badge>
          {analytics.trends.consistency === 'high' && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-100 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900">
              <Activity className="h-3 w-3 mr-1" />
              Consistent
            </Badge>
          )}
          {analytics.streaks.current > 7 && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900">
              <TrendingUp className="h-3 w-3 mr-1" />
              {analytics.streaks.current} day streak
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 pb-2 space-y-6">
        {/* Mood and Spiritual Chart */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium flex items-center">
            <Heart className="h-4 w-4 text-muted-foreground mr-2" />
            Wellbeing Trends
          </h3>
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={analytics.wellbeingData}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0a2540" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#0a2540" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorSpiritual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e8b44f" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#e8b44f" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis 
                  domain={[0, 10]} 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  formatter={(value: any) => [`${value}/10`, undefined]}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    borderRadius: '8px',
                    border: '1px solid #f0f0f0',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                  }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle"
                  iconSize={10}
                  formatter={(value) => <span className="text-sm">{value === 'mood' ? 'Emotional' : 'Spiritual'}</span>}
                />
                <Area 
                  type="monotone" 
                  dataKey="mood" 
                  name="Emotional" 
                  stroke="#0a2540" 
                  fillOpacity={1} 
                  fill="url(#colorMood)" 
                  strokeWidth={2}
                  activeDot={{ r: 6 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="spiritual" 
                  name="Spiritual" 
                  stroke="#e8b44f" 
                  fillOpacity={1} 
                  fill="url(#colorSpiritual)" 
                  strokeWidth={2}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Emotional Avg</span>
                <span className="text-sm font-bold text-primary">{analytics.averages.mood.toFixed(1)}/10</span>
              </div>
              <div className="flex items-center">
                <Progress value={analytics.averages.mood * 10} className="h-1.5" />
                <span className="ml-2 text-xs text-muted-foreground">
                  {analytics.trends.mood === 'improving' ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : analytics.trends.mood === 'declining' ? (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  ) : (
                    <Activity className="h-3 w-3 text-orange-500" />
                  )}
                </span>
              </div>
            </div>
            
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Spiritual Avg</span>
                <span className="text-sm font-bold text-secondary">{analytics.averages.spiritual.toFixed(1)}/10</span>
              </div>
              <div className="flex items-center">
                <Progress value={analytics.averages.spiritual * 10} className="h-1.5" />
                <span className="ml-2 text-xs text-muted-foreground">
                  {analytics.trends.spiritual === 'improving' ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : analytics.trends.spiritual === 'declining' ? (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  ) : (
                    <Activity className="h-3 w-3 text-orange-500" />
                  )}
                </span>
              </div>
            </div>
            
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Consistency</span>
                <span className="text-sm font-bold">
                  {Math.round(analytics.consistency.overall * 100)}%
                </span>
              </div>
              <div className="flex items-center">
                <Progress value={analytics.consistency.overall * 100} className="h-1.5" />
                <span className="ml-2 text-xs text-muted-foreground">
                  {analytics.trends.consistency === 'improving' ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : analytics.trends.consistency === 'declining' ? (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  ) : (
                    <Activity className="h-3 w-3 text-orange-500" />
                  )}
                </span>
              </div>
            </div>
            
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Current Streak</span>
                <span className="text-sm font-bold">{analytics.streaks.current} days</span>
              </div>
              <div className="flex items-center">
                <Progress 
                  value={(analytics.streaks.current / Math.max(1, analytics.streaks.longest)) * 100} 
                  className="h-1.5" 
                />
                <span className="ml-2 text-xs text-muted-foreground">
                  Best: {analytics.streaks.longest}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Spiritual Disciplines Chart */}
        <div className="space-y-2 border-t border-border pt-4">
          <h3 className="text-sm font-medium flex items-center">
            <BookOpen className="h-4 w-4 text-muted-foreground mr-2" />
            Spiritual Disciplines
          </h3>
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analytics.disciplinesData}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                barSize={20}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                <XAxis 
                  dataKey="name" 
                  scale="point" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  formatter={(value: any) => [`${value}%`, 'Consistency']}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    borderRadius: '8px',
                    border: '1px solid #f0f0f0',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="percentage" 
                  fill="#0a2540" 
                  name="Consistency" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* AI Insights - Collapsible */}
        <Collapsible
          open={showInsights}
          onOpenChange={setShowInsights}
          className="border rounded-lg p-4 bg-secondary/5 space-y-2"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium flex items-center">
              <Sparkles className="h-4 w-4 text-secondary mr-2" />
              AI Spiritual Insights
            </h3>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-9 p-0 hover:bg-secondary/10">
                {showInsights ? 
                  <ChevronUp className="h-4 w-4" /> : 
                  <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
          
          <CollapsibleContent className="space-y-4">
            {analytics.insights ? (
              analytics.insights.map((insight: any, index: number) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="space-y-1"
                >
                  <div className="flex items-start">
                    <div className="rounded-full bg-secondary/10 p-1.5 mr-3 mt-0.5">
                      {insight.type === 'strength' && <TrendingUp className="h-3.5 w-3.5 text-secondary" />}
                      {insight.type === 'growth' && <Sparkles className="h-3.5 w-3.5 text-secondary" />}
                      {insight.type === 'opportunity' && <BookOpen className="h-3.5 w-3.5 text-secondary" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{insight.title}</p>
                      <p className="text-sm text-muted-foreground">{insight.content}</p>
                      {insight.scripture && (
                        <p className="text-xs italic text-muted-foreground mt-1">"{insight.scripture.text}" — {insight.scripture.reference}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-2">
                <p className="text-muted-foreground">Insights are being generated...</p>
              </div>
            )}
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="border-t border-secondary/10 pt-3 mt-3"
            >
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground italic">
                  These insights are based on your data from the last {timeRange} and are refreshed daily.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8"
                  onClick={handleRefreshAnalytics}
                  disabled={isRefreshing}
                >
                  {isRefreshing ? (
                    <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5 mr-2" />
                  )}
                  Refresh Insights
                </Button>
              </div>
            </motion.div>
          </CollapsibleContent>
        </Collapsible>
        
        {/* Activity Breakdown */}
        <div className="border-t border-border pt-4">
          <Tabs defaultValue="activity">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="correlations">Correlations</TabsTrigger>
              <TabsTrigger value="patterns">Patterns</TabsTrigger>
            </TabsList>
            
            {/* Activity Tab Content */}
            <TabsContent value="activity" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-muted/30 p-3 rounded-lg flex flex-col items-center justify-center text-center">
                  <PenTool className="h-5 w-5 text-primary mb-1" />
                  <span className="text-sm font-medium">Journaling</span>
                  <div className="flex gap-2 items-baseline">
                    <span className="text-2xl font-bold">{analytics.activity.journalEntries}</span>
                    <span className="text-xs text-muted-foreground">entries</span>
                  </div>
                </div>
                
                <div className="bg-muted/30 p-3 rounded-lg flex flex-col items-center justify-center text-center">
                  <Hand className="h-5 w-5 text-primary mb-1" />
                  <span className="text-sm font-medium">Prayer</span>
                  <div className="flex gap-2 items-baseline">
                    <span className="text-2xl font-bold">{analytics.activity.prayerDays}</span>
                    <span className="text-xs text-muted-foreground">days</span>
                  </div>
                </div>
                
                <div className="bg-muted/30 p-3 rounded-lg flex flex-col items-center justify-center text-center">
                  <BookOpen className="h-5 w-5 text-primary mb-1" />
                  <span className="text-sm font-medium">Bible Reading</span>
                  <div className="flex gap-2 items-baseline">
                    <span className="text-2xl font-bold">{analytics.activity.bibleReadingDays}</span>
                    <span className="text-xs text-muted-foreground">days</span>
                  </div>
                </div>
                
                <div className="bg-muted/30 p-3 rounded-lg flex flex-col items-center justify-center text-center">
                  <Heart className="h-5 w-5 text-primary mb-1" />
                  <span className="text-sm font-medium">Devotionals</span>
                  <div className="flex gap-2 items-baseline">
                    <span className="text-2xl font-bold">{analytics.activity.devotionalEntries}</span>
                    <span className="text-xs text-muted-foreground">completed</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-secondary/5 border border-secondary/10 rounded-lg p-3 space-y-2">
                <h4 className="text-sm font-medium flex items-center">
                  <Sparkles className="h-3.5 w-3.5 text-secondary mr-2" />
                  Most Active Days
                </h4>
                <div className="grid grid-cols-7 gap-1">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => {
                    const activityLevel = analytics.patterns.dayOfWeek[i] || 0;
                    let bgColor;
                    if (activityLevel > 0.75) bgColor = "bg-primary";
                    else if (activityLevel > 0.5) bgColor = "bg-primary/70";
                    else if (activityLevel > 0.25) bgColor = "bg-primary/40";
                    else bgColor = "bg-primary/20";
                    
                    return (
                      <div key={day} className="text-center">
                        <div className="text-xs mb-1">{day}</div>
                        <div className={`h-10 rounded-md ${bgColor} flex items-center justify-center`}>
                          <span className="text-xs font-medium text-white">
                            {Math.round(activityLevel * 100)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
            
            {/* Correlations Tab Content */}
            <TabsContent value="correlations" className="space-y-4 mt-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Activities & Well-being Correlation</h4>
                <p className="text-xs text-muted-foreground mb-2">
                  How different spiritual practices correlate with your spiritual and emotional well-being
                </p>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analytics.correlations.activities}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" domain={[-1, 1]} tickFormatter={(value) => `${Math.abs(value)}`} />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        tick={{ fontSize: 12 }}
                        width={80}
                      />
                      <Tooltip 
                        formatter={(value: number) => [
                          `${Math.abs(value).toFixed(2)}`,
                          value > 0 ? 'Positive Impact' : 'Negative Impact'
                        ]}
                      />
                      <Bar 
                        dataKey="value" 
                        fill={(entry: any) => entry.value >= 0 ? "#4ade80" : "#f87171"} 
                        name="Correlation" 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="space-y-3 bg-muted/30 p-3 rounded-lg">
                <h4 className="text-sm font-medium flex items-center">
                  <Sparkles className="h-3.5 w-3.5 text-primary mr-2" />
                  Key Insights
                </h4>
                
                {analytics.correlations.insights.map((insight: string, index: number) => (
                  <div key={index} className="flex items-start">
                    <div className="rounded-full bg-primary/10 p-1 mr-2 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                    </div>
                    <p className="text-sm flex-1">{insight}</p>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            {/* Patterns Tab Content */}
            <TabsContent value="patterns" className="space-y-4 mt-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Spiritual Growth Over Time</h4>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={analytics.patterns.growth}
                      margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" />
                      <YAxis domain={[0, 10]} />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#e8b44f" 
                        strokeWidth={2}
                        name="Spiritual Growth"
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-secondary/5 border border-secondary/10 rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-2 flex items-center">
                    <TrendingUp className="h-4 w-4 text-secondary mr-2" />
                    Positive Trends
                  </h4>
                  <ul className="space-y-2">
                    {analytics.patterns.positives.map((trend: string, i: number) => (
                      <li key={i} className="text-sm flex items-start">
                        <div className="rounded-full bg-green-500 w-1.5 h-1.5 mt-1.5 mr-2"></div>
                        <span>{trend}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="bg-muted/30 border border-muted rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-2 flex items-center">
                    <TrendingDown className="h-4 w-4 text-primary mr-2" />
                    Growth Opportunities
                  </h4>
                  <ul className="space-y-2">
                    {analytics.patterns.opportunities.map((trend: string, i: number) => (
                      <li key={i} className="text-sm flex items-start">
                        <div className="rounded-full bg-orange-500 w-1.5 h-1.5 mt-1.5 mr-2"></div>
                        <span>{trend}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
      
      <CardFooter>
        <Button variant="outline" className="w-full" onClick={handleRefreshAnalytics} disabled={isRefreshing}>
          {isRefreshing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating Analytics...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Analytics
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}