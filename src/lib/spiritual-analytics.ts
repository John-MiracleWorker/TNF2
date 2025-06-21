import { supabase } from './supabase';
import { format, subDays, subMonths, isSameDay, parseISO, differenceInDays, startOfDay, isAfter } from 'date-fns';

/**
 * Get comprehensive spiritual analytics based on user's data
 */
export async function getSpiritualAnalytics(
  timeRange: 'week' | 'month' | 'quarter' | 'year' = 'month'
): Promise<any> {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // First, check if we have a cached result from today
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    const { data: cachedData, error: cacheError } = await supabase
      .from('user_insights_cache')
      .select('insights, analytics_data, generated_at')
      .eq('user_id', user.id)
      .eq('time_range', timeRange)
      .single();
      
    // If we have a valid cache from today, use it
    if (!cacheError && cachedData && cachedData.generated_at) {
      const cachedDate = format(new Date(cachedData.generated_at), 'yyyy-MM-dd');
      
      if (cachedDate === todayStr) {
        console.log('Using cached spiritual insights from today');
        
        // Return the cached data which contains both analytics and insights
        const analytics = cachedData.analytics_data;
        analytics.insights = cachedData.insights;
        
        return analytics;
      }
    }

    // If no cache or cache is old, calculate new analytics

    // Calculate date ranges
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
    
    const formattedStartDate = format(startDate, 'yyyy-MM-dd');
    const formattedEndDate = format(today, 'yyyy-MM-dd');

    // Fetch all relevant data in parallel
    const [
      moodEntries,
      prayerRequests,
      journalEntries,
      scriptureMemory,
      bibleStudyNotes,
      devotionalProgress,
      habitLogs,
      readingProgress
    ] = await Promise.all([
      // Get mood entries
      supabase
        .from('mood_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('entry_date', formattedStartDate)
        .lte('entry_date', formattedEndDate)
        .order('entry_date', { ascending: true }),
        
      // Get prayer requests
      supabase
        .from('prayer_requests')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', today.toISOString())
        .order('created_at', { ascending: true }),
        
      // Get journal entries
      supabase
        .from('journal_entries')
        .select('id, title, created_at, mood_score, spiritual_score')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', today.toISOString())
        .order('created_at', { ascending: true }),
        
      // Get scripture memory activity
      supabase
        .from('scripture_memory')
        .select('id, last_practiced, memorized_level')
        .eq('user_id', user.id)
        .gte('last_practiced', startDate.toISOString())
        .lte('last_practiced', today.toISOString())
        .order('last_practiced', { ascending: true }),
        
      // Get Bible study notes
      supabase
        .from('bible_study_notes')
        .select('id, created_at')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', today.toISOString())
        .order('created_at', { ascending: true }),
        
      // Get devotional progress
      supabase
        .from('user_devotional_progress')
        .select('id, created_at, completed_at')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', today.toISOString())
        .order('created_at', { ascending: true }),
        
      // Get habit logs
      supabase
        .from('habit_logs')
        .select('id, completed_date, habit_id')
        .eq('user_id', user.id)
        .gte('completed_date', formattedStartDate)
        .lte('completed_date', formattedEndDate)
        .order('completed_date', { ascending: true }),
        
      // Get reading plan progress
      supabase
        .from('reading_reflections')
        .select('id, created_at')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', today.toISOString())
        .order('created_at', { ascending: true })
    ]);

    // Process all data to generate comprehensive analytics
    const analytics = processAnalyticsData({
      timeRange,
      moodEntries: moodEntries.data || [],
      prayerRequests: prayerRequests.data || [],
      journalEntries: journalEntries.data || [],
      scriptureMemory: scriptureMemory.data || [],
      bibleStudyNotes: bibleStudyNotes.data || [],
      devotionalProgress: devotionalProgress.data || [],
      habitLogs: habitLogs.data || [],
      readingProgress: readingProgress.data || [],
      startDate,
      endDate: today
    });

    // Generate AI insights if we have supabase functions available
    try {
      const insights = await generateAIInsights({
        userId: user.id,
        timeRange,
        analytics
      });
      
      if (insights && insights.insights) {
        analytics.insights = insights.insights;
        
        // Save to cache for future use
        try {
          await supabase
            .from('user_insights_cache')
            .upsert({
              user_id: user.id,
              time_range: timeRange,
              insights: insights.insights,
              analytics_data: analytics,
              generated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,time_range'
            });
            
          console.log('Cached spiritual insights for future use');
        } catch (cacheError) {
          console.error('Error caching insights:', cacheError);
          // Continue even if caching fails
        }
      }
    } catch (error) {
      console.warn('Could not generate AI insights, using static insights or cached data:', error);
      
      // Check if we have old cached insights to use instead
      if (cachedData && cachedData.insights) {
        console.log('Using older cached insights');
        analytics.insights = cachedData.insights;
      } else {
        // Fallback to static insights
        analytics.insights = generateStaticInsights(analytics);
      }
    }

    return analytics;
  } catch (error) {
    console.error('Error in getSpiritualAnalytics:', error);
    throw error;
  }
}

/**
 * Generate AI insights via edge function
 */
async function generateAIInsights(params: any): Promise<any> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('No authenticated session');
    }
    
    // Check connection before making request
    try {
      // Simple fetch check with a timeout to detect network issues early
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      await fetch(`${supabaseUrl}/rest/v1/?apikey=${import.meta.env.VITE_SUPABASE_ANON_KEY}`, {
        method: 'HEAD',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
    } catch (connError) {
      console.error('Connection to Supabase failed:', connError);
      throw new Error('Connection to Supabase failed, please check your network');
    }
    
    const response = await fetch(`${supabaseUrl}/functions/v1/spiritual-insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      throw new Error(`Error generating insights: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error generating AI insights:', error);
    throw error;
  }
}

/**
 * Process raw data into analytics
 */
function processAnalyticsData(data: any): any {
  const {
    timeRange,
    moodEntries,
    prayerRequests,
    journalEntries,
    scriptureMemory,
    bibleStudyNotes,
    devotionalProgress,
    habitLogs,
    readingProgress,
    startDate,
    endDate
  } = data;
  
  // Calculate total days in the time range
  const totalDays = differenceInDays(endDate, startDate) + 1;
  
  // Count total entries
  const totalEntryCount = moodEntries.length + journalEntries.length + scriptureMemory.length +
    bibleStudyNotes.length + devotionalProgress.length + habitLogs.length + readingProgress.length;
  
  // Calculate overall activity days
  const activityDays = new Set<string>();
  
  [...moodEntries, ...journalEntries, ...scriptureMemory, ...bibleStudyNotes,
   ...devotionalProgress, ...habitLogs, ...readingProgress].forEach(entry => {
    // Extract date from entry - entries have different date field names
    let date;
    if ('entry_date' in entry) date = entry.entry_date;
    else if ('completed_date' in entry) date = entry.completed_date;
    else if ('created_at' in entry) date = entry.created_at.split('T')[0];
    else if ('last_practiced' in entry) date = entry.last_practiced.split('T')[0];
    
    if (date) activityDays.add(date);
  });
  
  // Count unique dates
  const activityDaysCount = activityDays.size;
  
  // Calculate activity consistency
  const consistency = {
    overall: activityDaysCount / totalDays,
    prayer: calculatePrayerConsistency(moodEntries, totalDays),
    bibleReading: calculateBibleReadingConsistency(moodEntries, totalDays),
    church: calculateChurchConsistency(moodEntries),
    scriptureMemory: scriptureMemory.length / totalDays,
    journaling: journalEntries.length / totalDays
  };
  
  // Create data for wellbeing chart with smoothed lines
  const wellbeingData = generateWellbeingChartData(moodEntries, journalEntries, timeRange);
  
  // Calculate averages
  const averages = {
    mood: calculateAverage(moodEntries, 'mood_score'),
    spiritual: calculateAverage(moodEntries, 'spiritual_score')
  };
  
  // Calculate trends
  const trends = {
    overall: determineOverallTrend(moodEntries),
    mood: determineTrend(moodEntries, 'mood_score'),
    spiritual: determineTrend(moodEntries, 'spiritual_score'),
    consistency: determineTrend(sortEntriesByDate([...moodEntries, ...journalEntries, ...habitLogs]), 'date', true),
    prayer: determinePrayerTrend(moodEntries)
  };
  
  // Calculate streaks
  const streaks = calculateStreaks(activityDays, startDate, endDate);
  
  // Generate spiritual disciplines data
  const disciplinesData = generateDisciplinesData(moodEntries, habitLogs);
  
  // Calculate activity statistics
  const activity = {
    journalEntries: journalEntries.length,
    bibleStudies: bibleStudyNotes.length,
    devotionalEntries: devotionalProgress.length,
    scriptureMemoryProgress: scriptureMemory.length,
    prayerRequests: prayerRequests.length,
    answeredPrayers: prayerRequests.filter(pr => pr.is_answered).length,
    habitLogsCount: habitLogs.length,
    readingProgress: readingProgress.length,
    prayerDays: moodEntries.filter(entry => entry.prayer_time).length,
    bibleReadingDays: moodEntries.filter(entry => entry.bible_reading).length,
    churchDays: moodEntries.filter(entry => entry.church_attendance).length
  };
  
  // Analyze correlations
  const correlations = analyzeCorrelations(moodEntries);
  
  // Analyze patterns
  const patterns = {
    dayOfWeek: analyzeDayOfWeekPatterns([...moodEntries, ...journalEntries, ...habitLogs]),
    growth: analyzeGrowthPatterns(moodEntries, timeRange),
    positives: generatePositiveTrends(trends, activity, averages, streaks),
    opportunities: generateGrowthOpportunities(trends, activity, averages, consistency)
  };

  return {
    timeRange,
    totalEntryCount,
    activityDaysCount,
    totalDays,
    consistency,
    wellbeingData,
    averages,
    trends,
    streaks,
    disciplinesData,
    activity,
    correlations,
    patterns
  };
}

/**
 * Calculate prayer consistency from mood entries
 */
function calculatePrayerConsistency(moodEntries: any[], totalDays: number): number {
  if (!moodEntries.length) return 0;
  return moodEntries.filter(entry => entry.prayer_time).length / totalDays;
}

/**
 * Calculate Bible reading consistency from mood entries
 */
function calculateBibleReadingConsistency(moodEntries: any[], totalDays: number): number {
  if (!moodEntries.length) return 0;
  return moodEntries.filter(entry => entry.bible_reading).length / totalDays;
}

/**
 * Calculate church attendance consistency
 */
function calculateChurchConsistency(moodEntries: any[]): number {
  if (!moodEntries.length) return 0;
  // Church attendance is typically weekly, so we calculate differently
  const churchDays = moodEntries.filter(entry => entry.church_attendance).length;
  // We assume 1 church attendance per week is ideal
  const weekCount = Math.ceil(moodEntries.length / 7);
  return weekCount > 0 ? Math.min(1, churchDays / weekCount) : 0;
}

/**
 * Generate data for wellbeing chart with proper dates
 */
function generateWellbeingChartData(moodEntries: any[], journalEntries: any[], timeRange: string): any[] {
  // Use mood entries first since they have both mood and spiritual scores
  const dataByDate = new Map();
  
  // Process mood entries
  moodEntries.forEach(entry => {
    const date = entry.entry_date;
    dataByDate.set(date, {
      date,
      mood: entry.mood_score,
      spiritual: entry.spiritual_score
    });
  });
  
  // Fill in missing dates with journal entries if they have mood_score and spiritual_score
  journalEntries.forEach(entry => {
    if (!entry.mood_score && !entry.spiritual_score) return;
    
    const date = entry.created_at.split('T')[0];
    if (!dataByDate.has(date)) {
      dataByDate.set(date, {
        date,
        mood: entry.mood_score || null,
        spiritual: entry.spiritual_score || null
      });
    }
  });
  
  // Convert to array and sort by date
  let chartData = Array.from(dataByDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  
  // Format dates and ensure all dates have values
  chartData = chartData.map(item => {
    // Format date based on time range
    let formattedDate;
    if (timeRange === 'week') {
      formattedDate = format(parseISO(item.date), 'EEE');
    } else if (timeRange === 'month') {
      formattedDate = format(parseISO(item.date), 'MMM d');
    } else {
      formattedDate = format(parseISO(item.date), 'MMM d');
    }
    
    return {
      ...item,
      date: formattedDate
    };
  });
  
  return chartData;
}

/**
 * Calculate average for a specific property
 */
function calculateAverage(entries: any[], property: string): number {
  if (!entries.length) return 0;
  
  const validEntries = entries.filter(entry => entry[property] != null);
  if (!validEntries.length) return 0;
  
  return validEntries.reduce((sum, entry) => sum + entry[property], 0) / validEntries.length;
}

/**
 * Determine trend for a specific property (improving, declining, or stable)
 */
function determineTrend(entries: any[], property: string, isDateProperty: boolean = false): 'improving' | 'declining' | 'stable' {
  if (entries.length < 3) return 'stable';
  
  // Sort entries by date if needed
  let sortedEntries = entries;
  if (!isDateProperty) {
    sortedEntries = sortEntriesByDate(entries);
  }
  
  // Split into halves to compare
  const midpoint = Math.floor(sortedEntries.length / 2);
  const firstHalf = sortedEntries.slice(0, midpoint);
  const secondHalf = sortedEntries.slice(midpoint);
  
  // Calculate averages for each half
  let firstAvg, secondAvg;
  
  if (isDateProperty) {
    // For date properties, we're measuring frequency/consistency
    // Count unique days in each half
    const firstHalfDays = new Set(firstHalf.map((e: any) => getDateFromEntry(e))).size;
    const secondHalfDays = new Set(secondHalf.map((e: any) => getDateFromEntry(e))).size;
    
    // Calculate the number of days in each half
    const firstHalfTotal = differenceInDays(
      getDateFromEntry(firstHalf[firstHalf.length - 1]),
      getDateFromEntry(firstHalf[0])
    ) + 1;
    
    const secondHalfTotal = differenceInDays(
      getDateFromEntry(secondHalf[secondHalf.length - 1]),
      getDateFromEntry(secondHalf[0])
    ) + 1;
    
    firstAvg = firstHalfDays / firstHalfTotal;
    secondAvg = secondHalfDays / secondHalfTotal;
  } else {
    // For regular properties, calculate the average value
    firstAvg = firstHalf.reduce((sum, e) => sum + (e[property] || 0), 0) / firstHalf.length;
    secondAvg = secondHalf.reduce((sum, e) => sum + (e[property] || 0), 0) / secondHalf.length;
  }
  
  // Determine trend direction
  const difference = secondAvg - firstAvg;
  if (difference > 0.5) return 'improving';
  if (difference < -0.5) return 'declining';
  return 'stable';
}

/**
 * Get date from an entry with different possible date fields
 */
function getDateFromEntry(entry: any): Date {
  if ('entry_date' in entry) return parseISO(entry.entry_date);
  if ('completed_date' in entry) return parseISO(entry.completed_date);
  if ('created_at' in entry) {
    if (typeof entry.created_at === 'string') {
      return parseISO(entry.created_at);
    }
    return entry.created_at;
  }
  if ('last_practiced' in entry) return parseISO(entry.last_practiced);
  
  // Fallback to current date
  return new Date();
}

/**
 * Sort entries by date regardless of which date field they use
 */
function sortEntriesByDate(entries: any[]): any[] {
  return [...entries].sort((a, b) => {
    const dateA = getDateFromEntry(a);
    const dateB = getDateFromEntry(b);
    return dateA.getTime() - dateB.getTime();
  });
}

/**
 * Determine overall trend based on mood, spiritual scores, and consistency
 */
function determineOverallTrend(moodEntries: any[]): 'improving' | 'stable' | 'declining' {
  if (moodEntries.length < 3) return 'stable';
  
  const moodTrend = determineTrend(moodEntries, 'mood_score');
  const spiritualTrend = determineTrend(moodEntries, 'spiritual_score');
  
  // If both trends are the same, that's the overall trend
  if (moodTrend === spiritualTrend) return moodTrend;
  
  // If one is stable and the other is not, go with the non-stable one
  if (moodTrend === 'stable') return spiritualTrend;
  if (spiritualTrend === 'stable') return moodTrend;
  
  // If one is improving and one is declining, consider it stable overall
  return 'stable';
}

/**
 * Determine prayer trend specifically
 */
function determinePrayerTrend(moodEntries: any[]): 'improving' | 'declining' | 'stable' {
  if (moodEntries.length < 3) return 'stable';
  
  // Sort entries by date
  const sortedEntries = sortEntriesByDate(moodEntries);
  
  // Split into halves
  const midpoint = Math.floor(sortedEntries.length / 2);
  const firstHalf = sortedEntries.slice(0, midpoint);
  const secondHalf = sortedEntries.slice(midpoint);
  
  // Calculate prayer consistency for each half
  const firstHalfPrayer = firstHalf.filter(e => e.prayer_time).length / firstHalf.length;
  const secondHalfPrayer = secondHalf.filter(e => e.prayer_time).length / secondHalf.length;
  
  const difference = secondHalfPrayer - firstHalfPrayer;
  if (difference > 0.15) return 'improving';
  if (difference < -0.15) return 'declining';
  return 'stable';
}

/**
 * Calculate current and longest streaks
 */
function calculateStreaks(activityDays: Set<string>, startDate: Date, endDate: Date): { current: number, longest: number } {
  const activityDatesArray = Array.from(activityDays).map(date => parseISO(date)).sort((a, b) => a.getTime() - b.getTime());
  
  if (activityDatesArray.length === 0) {
    return { current: 0, longest: 0 };
  }
  
  // Calculate longest streak
  let longestStreak = 1;
  let currentLongestStreak = 1;
  
  for (let i = 1; i < activityDatesArray.length; i++) {
    const prevDate = activityDatesArray[i - 1];
    const currDate = activityDatesArray[i];
    
    // Check if consecutive days
    if (differenceInDays(currDate, prevDate) === 1) {
      currentLongestStreak++;
      longestStreak = Math.max(longestStreak, currentLongestStreak);
    } else {
      currentLongestStreak = 1;
    }
  }
  
  // Calculate current streak
  let currentStreak = 0;
  const today = startOfDay(new Date());
  
  // Start from the most recent date and work backwards
  for (let i = activityDatesArray.length - 1; i >= 0; i--) {
    const activityDate = startOfDay(activityDatesArray[i]);
    const expectedDate = subDays(today, currentStreak);
    
    // If this date is the expected date in the streak
    if (isSameDay(activityDate, expectedDate)) {
      currentStreak++;
    } else {
      break;
    }
  }
  
  // Special case: check if today has activity
  const hasActivityToday = Array.from(activityDays).some(date => 
    isSameDay(parseISO(date), today)
  );
  
  // If no activity today, check if yesterday had activity (streak continues)
  if (!hasActivityToday) {
    const hasActivityYesterday = Array.from(activityDays).some(date => 
      isSameDay(parseISO(date), subDays(today, 1))
    );
    
    if (!hasActivityYesterday) {
      currentStreak = 0;
    }
  }
  
  return { 
    current: currentStreak, 
    longest: longestStreak 
  };
}

/**
 * Generate data for spiritual disciplines chart
 */
function generateDisciplinesData(moodEntries: any[], habitLogs: any[]): any[] {
  if (!moodEntries.length) return [];
  
  const prayerPercentage = moodEntries.filter(e => e.prayer_time).length / moodEntries.length * 100;
  const bibleReadingPercentage = moodEntries.filter(e => e.bible_reading).length / moodEntries.length * 100;
  const churchPercentage = moodEntries.filter(e => e.church_attendance).length / moodEntries.length * 100;
  
  // Calculate unique habit completion days
  const habitDates = new Set(habitLogs.map(log => log.completed_date));
  const habitPercentage = habitDates.size / moodEntries.length * 100;
  
  return [
    { name: 'Prayer', percentage: Math.round(prayerPercentage) },
    { name: 'Bible', percentage: Math.round(bibleReadingPercentage) },
    { name: 'Church', percentage: Math.round(churchPercentage) },
    { name: 'Habits', percentage: Math.round(habitPercentage) }
  ];
}

/**
 * Analyze correlations between activities and well-being
 */
function analyzeCorrelations(moodEntries: any[]): any {
  if (moodEntries.length < 3) {
    return {
      activities: [],
      insights: ['Not enough data to analyze correlations yet.']
    };
  }
  
  // Create correlation data
  const prayerCorrelation = calculateCorrelation(
    moodEntries.map(e => e.prayer_time ? 1 : 0),
    moodEntries.map(e => e.spiritual_score)
  );
  
  const bibleCorrelation = calculateCorrelation(
    moodEntries.map(e => e.bible_reading ? 1 : 0),
    moodEntries.map(e => e.spiritual_score)
  );
  
  const churchCorrelation = calculateCorrelation(
    moodEntries.map(e => e.church_attendance ? 1 : 0),
    moodEntries.map(e => e.spiritual_score)
  );
  
  // Cross-correlations
  const prayerMoodCorrelation = calculateCorrelation(
    moodEntries.map(e => e.prayer_time ? 1 : 0),
    moodEntries.map(e => e.mood_score)
  );
  
  const bibleMoodCorrelation = calculateCorrelation(
    moodEntries.map(e => e.bible_reading ? 1 : 0),
    moodEntries.map(e => e.mood_score)
  );
  
  // Generate insights based on correlations
  const insights = [];
  
  if (prayerCorrelation > 0.3) {
    insights.push('Prayer appears to significantly strengthen your spiritual wellbeing.');
  }
  
  if (bibleCorrelation > 0.3) {
    insights.push('Bible reading has a strong positive impact on your spiritual state.');
  }
  
  if (churchCorrelation > 0.3) {
    insights.push('Church attendance correlates well with your spiritual growth.');
  }
  
  if (prayerMoodCorrelation > 0.3) {
    insights.push('Prayer seems to positively impact your emotional wellbeing as well.');
  }
  
  if (bibleMoodCorrelation > 0.3) {
    insights.push('Bible reading appears to boost both your spiritual and emotional health.');
  }
  
  // Special insight for strong correlations
  if (prayerCorrelation > 0.5 && bibleCorrelation > 0.5) {
    insights.push('The combination of prayer and Bible reading shows an especially strong impact on your spiritual life.');
  }
  
  // Default insight if none were generated
  if (insights.length === 0) {
    insights.push('Your spiritual practices show potential connections to your wellbeing, but more data will help clarify these patterns.');
  }
  
  return {
    activities: [
      { name: 'Prayer', value: parseFloat(prayerCorrelation.toFixed(2)) },
      { name: 'Bible Reading', value: parseFloat(bibleCorrelation.toFixed(2)) },
      { name: 'Church Attendance', value: parseFloat(churchCorrelation.toFixed(2)) }
    ],
    insights
  };
}

/**
 * Calculate Pearson correlation coefficient
 */
function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  
  // Calculate means
  const xMean = x.reduce((sum, val) => sum + val, 0) / x.length;
  const yMean = y.reduce((sum, val) => sum + val, 0) / y.length;
  
  // Calculate covariance and variances
  let covariance = 0;
  let xVariance = 0;
  let yVariance = 0;
  
  for (let i = 0; i < x.length; i++) {
    const xDiff = x[i] - xMean;
    const yDiff = y[i] - yMean;
    
    covariance += xDiff * yDiff;
    xVariance += xDiff * xDiff;
    yVariance += yDiff * yDiff;
  }
  
  if (xVariance === 0 || yVariance === 0) return 0;
  
  return covariance / Math.sqrt(xVariance * yVariance);
}

/**
 * Analyze day of week patterns
 */
function analyzeDayOfWeekPatterns(entries: any[]): number[] {
  // Initialize array for each day of week (0 = Sunday, 6 = Saturday)
  const dayCounters = [0, 0, 0, 0, 0, 0, 0];
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  
  // Group entries by day of week
  entries.forEach(entry => {
    // Get date from entry
    let date;
    if ('entry_date' in entry) {
      date = parseISO(entry.entry_date);
    } else if ('completed_date' in entry) {
      date = parseISO(entry.completed_date);
    } else if ('created_at' in entry) {
      date = new Date(entry.created_at);
    } else {
      return;
    }
    
    const dayOfWeek = date.getDay();
    dayCounters[dayOfWeek]++;
  });
  
  // Calculate percentages (normalized to the highest day)
  const maxCount = Math.max(...dayCounters);
  if (maxCount > 0) {
    for (let i = 0; i < 7; i++) {
      dayCounts[i] = dayCounters[i] / maxCount;
    }
  }
  
  return dayCounts;
}

/**
 * Analyze growth patterns over time
 */
function analyzeGrowthPatterns(moodEntries: any[], timeRange: string): any[] {
  if (moodEntries.length < 2) {
    return [
      { label: 'Start', value: 5 },
      { label: 'Now', value: 5 }
    ];
  }
  
  // Sort entries chronologically
  const sortedEntries = sortEntriesByDate(moodEntries);
  
  let intervals;
  let intervalLabels;
  
  // Determine intervals based on time range
  if (timeRange === 'week') {
    intervals = 7; // Daily for a week
    intervalLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  } else if (timeRange === 'month') {
    intervals = 4; // Weekly for a month
    intervalLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
  } else if (timeRange === 'quarter') {
    intervals = 6; // Bi-weekly for a quarter
    intervalLabels = ['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5', 'Period 6'];
  } else {
    intervals = 12; // Monthly for a year
    intervalLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  }
  
  // Group entries into intervals
  const intervalData = Array(intervals).fill(null).map(() => []);
  const intervalSize = sortedEntries.length / intervals;
  
  sortedEntries.forEach((entry, index) => {
    const intervalIndex = Math.min(intervals - 1, Math.floor(index / intervalSize));
    intervalData[intervalIndex].push(entry);
  });
  
  // Calculate average spiritual score for each interval
  const growthData = intervalData.map((entries, index) => {
    if (entries.length === 0) {
      // If no entries in this interval, use adjacent intervals or default value
      let value = 5;
      
      // Check previous intervals
      for (let i = index - 1; i >= 0; i--) {
        if (intervalData[i].length > 0) {
          value = calculateAverage(intervalData[i], 'spiritual_score');
          break;
        }
      }
      
      // If no previous intervals have data, check following intervals
      if (value === 5) {
        for (let i = index + 1; i < intervalData.length; i++) {
          if (intervalData[i].length > 0) {
            value = calculateAverage(intervalData[i], 'spiritual_score');
            break;
          }
        }
      }
      
      return {
        label: intervalLabels[index],
        value
      };
    }
    
    // Normal case with data
    return {
      label: intervalLabels[index],
      value: calculateAverage(entries, 'spiritual_score')
    };
  });
  
  return growthData;
}

/**
 * Generate positive trends based on analytics
 */
function generatePositiveTrends(trends: any, activity: any, averages: any, streaks: any): string[] {
  const positives = [];
  
  if (trends.spiritual === 'improving') {
    positives.push('Your spiritual wellbeing is on an upward trajectory');
  }
  
  if (trends.mood === 'improving') {
    positives.push('Your emotional wellbeing is improving');
  }
  
  if (trends.consistency === 'improving') {
    positives.push('Your consistency in spiritual practices is growing');
  }
  
  if (trends.prayer === 'improving') {
    positives.push('Your prayer life is becoming more consistent');
  }
  
  if (streaks.current > 3) {
    positives.push(`You have a ${streaks.current}-day streak of spiritual activity`);
  }
  
  if (averages.spiritual >= 7) {
    positives.push('Your spiritual wellbeing score is strong');
  }
  
  if (activity.prayerRequests > 0 && activity.answeredPrayers / activity.prayerRequests > 0.5) {
    positives.push(`You've seen ${activity.answeredPrayers} answered prayers recently`);
  }
  
  if (activity.journalEntries > 5) {
    positives.push('You\'re actively journaling your spiritual journey');
  }
  
  if (activity.bibleReadingDays > activity.prayerDays && activity.bibleReadingDays > 5) {
    positives.push('Bible reading is a consistent strength for you');
  } else if (activity.prayerDays > activity.bibleReadingDays && activity.prayerDays > 5) {
    positives.push('Prayer is a strong foundation in your spiritual life');
  }
  
  // If we don't have enough positives, add generic ones
  if (positives.length < 2) {
    if (activity.totalEntryCount > 0) {
      positives.push('You\'re actively tracking your spiritual journey');
    }
    if (activity.scriptureMemoryProgress > 0) {
      positives.push('You\'re growing in scripture knowledge');
    }
    if (activity.churchDays > 0) {
      positives.push('You\'re maintaining connection with your faith community');
    }
  }
  
  return positives.slice(0, 3); // Return top 3 positives
}

/**
 * Generate growth opportunities based on analytics
 */
function generateGrowthOpportunities(trends: any, activity: any, averages: any, consistency: any): string[] {
  const opportunities = [];
  
  if (trends.spiritual === 'declining') {
    opportunities.push('Your spiritual wellbeing could use some focused attention');
  }
  
  if (trends.prayer === 'declining' || consistency.prayer < 0.3) {
    opportunities.push('Increasing prayer consistency could strengthen your spiritual life');
  }
  
  if (consistency.bibleReading < 0.3) {
    opportunities.push('More regular Bible reading would deepen your faith foundation');
  }
  
  if (consistency.church < 0.5) {
    opportunities.push('Connecting more consistently with your faith community');
  }
  
  if (activity.journalEntries === 0) {
    opportunities.push('Starting a spiritual journal could help track your growth');
  }
  
  if (averages.spiritual < 5) {
    opportunities.push('Your spiritual wellbeing score indicates room for renewal');
  }
  
  if (consistency.overall < 0.4) {
    opportunities.push('Developing more consistent spiritual habits');
  }
  
  if (activity.bibleStudies === 0) {
    opportunities.push('Adding Bible study to your practices could deepen understanding');
  }
  
  if (activity.scriptureMemoryProgress === 0) {
    opportunities.push('Scripture memorization would strengthen your spiritual foundation');
  }
  
  // If we don't have enough opportunities, add generic ones
  if (opportunities.length < 2) {
    opportunities.push('Setting specific spiritual growth goals for the coming month');
    opportunities.push('Exploring new spiritual disciplines to enrich your practice');
  }
  
  return opportunities.slice(0, 3); // Return top 3 opportunities
}

/**
 * Generate static insights based on analytics
 */
function generateStaticInsights(analytics: any): any[] {
  const insights = [];
  
  // Add a strength
  if (analytics.trends.spiritual === 'improving') {
    insights.push({
      type: 'strength',
      title: 'Growing Spiritual Health',
      content: 'Your spiritual wellbeing scores have been trending upward, showing that your practices are bearing fruit in your life.',
      scripture: {
        reference: 'Galatians 6:9',
        text: 'Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.'
      }
    });
  } else if (analytics.consistency.overall > 0.6) {
    insights.push({
      type: 'strength',
      title: 'Consistent Spiritual Practices',
      content: `You've been remarkably consistent in your spiritual activities, logging activity on ${Math.round(analytics.consistency.overall * 100)}% of days in this period.`,
      scripture: {
        reference: '1 Corinthians 15:58',
        text: 'Therefore, my dear brothers and sisters, stand firm. Let nothing move you. Always give yourselves fully to the work of the Lord, because you know that your labor in the Lord is not in vain.'
      }
    });
  }
  
  // Add a growth insight
  if (analytics.patterns.positives.length > 0) {
    insights.push({
      type: 'growth',
      title: 'Positive Growth Trajectory',
      content: analytics.patterns.positives[0],
      scripture: {
        reference: 'Philippians 1:6',
        text: 'Being confident of this, that he who began a good work in you will carry it on to completion until the day of Christ Jesus.'
      }
    });
  } else if (analytics.streaks.current > 3) {
    insights.push({
      type: 'growth',
      title: 'Building Momentum',
      content: `You're currently on a ${analytics.streaks.current}-day streak of spiritual activity. Consistency is key to long-term spiritual growth.`,
      scripture: {
        reference: 'Hebrews 12:1',
        text: 'Therefore, since we are surrounded by such a great cloud of witnesses, let us throw off everything that hinders and the sin that so easily entangles. And let us run with perseverance the race marked out for us.'
      }
    });
  }
  
  // Add an opportunity
  if (analytics.patterns.opportunities.length > 0) {
    insights.push({
      type: 'opportunity',
      title: 'Growth Opportunity',
      content: analytics.patterns.opportunities[0],
      scripture: {
        reference: '2 Peter 3:18',
        text: 'But grow in the grace and knowledge of our Lord and Savior Jesus Christ. To him be glory both now and forever! Amen.'
      }
    });
  } else {
    insights.push({
      type: 'opportunity',
      title: 'Next Steps in Your Journey',
      content: 'Consider setting specific spiritual goals for the coming weeks to build on your current foundation.',
      scripture: {
        reference: 'Proverbs 16:9',
        text: 'In their hearts humans plan their course, but the LORD establishes their steps.'
      }
    });
  }
  
  return insights;
}