import { type ClassValue } from 'clsx';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: string;
  id?: string;
}

export interface ChatThread {
  threadId: string;
  messages: ChatMessage[];
}

export interface JournalEntry {
  id?: string;
  user_id?: string;
  content: string;
  created_at?: string;
  title: string;
  summary: string;
  tags?: string[];
  source_thread_id?: string;
  mood_score?: number;
  spiritual_score?: number;
  related_scripture?: string;
}

export interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  bio?: string;
  profile_image_url?: string;
  created_at?: string;
  last_active?: string;
  is_admin?: boolean;
  dev_simulate_pro?: boolean;
}

export interface UserPreferences {
  id: string;
  notification_preferences: {
    prayer_reminders: boolean;
    bible_reading: boolean;
    journal_prompts: boolean;
    frequency?: 'daily' | 'weekly' | 'monthly' | 'custom';
    custom_days?: string[]; // Days of week when using 'custom' (e.g., ['monday', 'wednesday', 'friday'])
    quiet_hours?: {
      enabled: boolean;
      start: string; // HH:MM format
      end: string;   // HH:MM format
    };
  };
  theme: string;
  verse_translation: string;
  created_at?: string;
  updated_at?: string;
}

export interface PrayerRequest {
  id?: string;
  user_id?: string;
  title: string;
  description: string;
  is_answered: boolean;
  answered_date?: string;
  answered_notes?: string;
  created_at?: string;
  updated_at?: string;
  shared: boolean;
  tags?: string[];
  prayer_count?: number;
  profiles?: {
    display_name?: string;
    first_name?: string;
  };
}

export interface PrayerInteraction {
  id?: string;
  prayer_id: string;
  user_id?: string;
  prayed_at?: string;
}

export interface ScriptureMemory {
  id?: string;
  user_id?: string;
  verse_reference: string;
  verse_text: string;
  translation: string;
  memorized_level: number;
  last_practiced?: string;
  next_review?: string;
  notes?: string;
  created_at?: string;
  tags?: string[];
  mastery_score?: number;
  practice_count?: number;
  favorite?: boolean;
}

export interface DailyDevotional {
  id: string;
  title: string;
  scripture_reference: string;
  scripture_text: string;
  content: string;
  author?: string;
  publish_date: string;
  tags?: string[];
  created_at?: string;
}

export interface UserDevotionalProgress {
  id?: string;
  user_id?: string;
  devotional_id: string;
  completed: boolean;
  favorite: boolean;
  notes?: string;
  created_at?: string;
  completed_at?: string;
}

export interface SpiritualHabit {
  id?: string;
  user_id?: string;
  habit_name: string;
  goal_frequency: string;
  goal_amount: number;
  streak_current: number;
  streak_longest: number;
  created_at?: string;
  is_active: boolean;
}

export interface HabitLog {
  id?: string;
  habit_id: string;
  user_id?: string;
  completed_date: string;
  amount: number;
  notes?: string;
  created_at?: string;
}

export interface BibleStudyNote {
  id?: string;
  user_id?: string;
  title: string;
  scripture_reference: string;
  content: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  is_favorite: boolean;
}

export interface MoodEntry {
  id?: string;
  user_id?: string;
  mood_score: number;
  spiritual_score: number;
  prayer_time: boolean;
  bible_reading: boolean;
  church_attendance: boolean;
  notes?: string;
  created_at?: string;
  entry_date: string;
}

export interface Notification {
  id?: string;
  user_id?: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  action_link?: string;
  scheduled_for?: string;
  created_at?: string;
}

export interface PushSubscription {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface ContentRecommendation {
  id?: string;
  user_id?: string;
  title: string;
  description: string;
  content_type: string;
  content_id?: string;
  is_viewed: boolean;
  is_saved: boolean;
  created_at?: string;
  relevance_score: number;
}

// Faith Communities Types
export interface FaithCommunity {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  created_by: string;
  is_private: boolean;
  join_code?: string;
  member_limit?: number;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, any>;
  members?: CommunityMember[];
}

export interface CommunityMember {
  id: string;
  community_id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'member';
  joined_at?: string;
  profile?: UserProfile;
}

export interface CommunityPrayerCircle {
  id: string;
  community_id: string;
  name: string;
  description?: string;
  is_private: boolean;
  created_by: string;
  created_at?: string;
  updated_at?: string;
}

export interface CommunityPrayerRequest {
  id: string;
  community_id: string;
  circle_id?: string;
  user_id: string;
  title: string;
  description: string;
  is_anonymous: boolean;
  is_answered: boolean;
  answered_date?: string;
  answered_notes?: string;
  prayer_count?: number;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  user_profile?: {
    display_name?: string;
    first_name?: string;
  };
}

export interface CommunityChallenge {
  id?: string;
  community_id: string;
  name: string;
  description?: string;
  challenge_type: 'prayer' | 'scripture' | 'devotional' | 'custom';
  target_value: number;
  start_date: string;
  end_date: string;
  created_by: string;
  created_at?: string;
  updated_at?: string;
}

export interface ChallengeParticipant {
  id?: string;
  challenge_id: string;
  user_id: string;
  current_progress: number;
  completed: boolean;
  completed_at?: string;
  joined_at?: string;
}

// Spiritual Goals Types
export interface SpiritualGoal {
  id?: string;
  user_id?: string;
  title: string;
  description?: string;
  target_date?: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'abandoned';
  progress: number;
  category: string;
  is_ai_generated: boolean;
  ai_context?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  milestones?: GoalMilestone[];
  reflections?: GoalReflection[];
}

export interface GoalMilestone {
  id?: string;
  goal_id?: string;
  title: string;
  description?: string;
  target_date?: string;
  is_completed: boolean;
  completed_at?: string;
  created_at?: string;
}

export interface GoalReflection {
  id?: string;
  goal_id?: string;
  content: string;
  ai_feedback?: string;
  created_at?: string;
}

export interface GoalPreferences {
  category?: string;
  timeframe?: 'short' | 'medium' | 'long';
  focus?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

// Sermon Analysis Types
export interface SermonSummary {
  id?: string;
  user_id?: string;
  title: string;
  description?: string;
  sermon_date?: string;
  audio_url?: string;
  video_url?: string;
  transcription_text?: string;
  summary_text?: string;
  key_points?: string[]; // Moved out of ai_context
  application_to_faith?: string; // New field
  biblical_themes?: string[]; // New field
  biblical_characters?: string[]; // New field
  historical_context?: string; // New field
  follow_up_questions?: string[];
  ai_context?: {
    status?: 'processing_started' | 'processing' | 'completed' | 'error';
    step?: string;
    error?: string;
    completed_at?: string;
  };
  created_at?: string;
}
