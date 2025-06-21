// Gamification utilities for scripture memory

export interface UserStats {
  id: string;
  user_id: string;
  total_points: number;
  current_level: number;
  experience_points: number;
  current_streak: number;
  longest_streak: number;
  verses_memorized: number;
  total_practice_time: number;
  last_practice_date?: string;
  achievements_count: number;
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: 'milestone' | 'streak' | 'practice' | 'special';
  points_reward: number;
  unlock_criteria: any;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  achievement?: Achievement;
}

export interface PracticeSession {
  id?: string;
  user_id?: string;
  scripture_memory_id: string;
  practice_type: 'review' | 'game' | 'quiz' | 'typing';
  accuracy_score?: number;
  time_spent?: number;
  points_earned?: number;
  mistakes_made?: number;
  completed?: boolean;
  created_at?: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  challenge_type: 'weekly' | 'monthly' | 'special';
  start_date: string;
  end_date: string;
  target_criteria: any;
  points_reward: number;
  is_active: boolean;
  created_at: string;
}

export interface UserChallengeProgress {
  id: string;
  user_id: string;
  challenge_id: string;
  current_progress: number;
  completed: boolean;
  completed_at?: string;
  created_at: string;
  challenge?: Challenge;
}

// Points calculation
export const POINTS = {
  VERSE_ADDED: 50,
  VERSE_MEMORIZED: 200,
  PRACTICE_COMPLETED: 25,
  PERFECT_ACCURACY: 100,
  STREAK_BONUS: 10, // per day in streak
  CHALLENGE_COMPLETED: 500,
  ACHIEVEMENT_EARNED: 100,
} as const;

// Level calculation
export function calculateLevel(experiencePoints: number): number {
  return Math.floor(Math.sqrt(experiencePoints / 100)) + 1;
}

export function getXPForLevel(level: number): number {
  return Math.pow(level - 1, 2) * 100;
}

export function getXPForNextLevel(level: number): number {
  return getXPForLevel(level + 1);
}

export function getLevelProgress(experiencePoints: number): {
  currentLevel: number;
  currentLevelXP: number;
  nextLevelXP: number;
  progress: number;
} {
  const currentLevel = calculateLevel(experiencePoints);
  const currentLevelXP = getXPForLevel(currentLevel);
  const nextLevelXP = getXPForLevel(currentLevel + 1);
  const progress = Math.min(100, ((experiencePoints - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100);

  return {
    currentLevel,
    currentLevelXP,
    nextLevelXP,
    progress
  };
}

// Rarity colors and styles
export const RARITY_STYLES = {
  common: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-300',
    glow: 'shadow-gray-200'
  },
  rare: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-300',
    glow: 'shadow-blue-200'
  },
  epic: {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    border: 'border-purple-300',
    glow: 'shadow-purple-200'
  },
  legendary: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-300',
    glow: 'shadow-yellow-200'
  }
} as const;

// Practice game types
export const PRACTICE_GAMES = [
  {
    id: 'fill-blanks',
    name: 'Fill in the Blanks',
    description: 'Complete the missing words in the verse',
    icon: 'PenTool',
    difficulty: 'easy'
  },
  {
    id: 'word-order',
    name: 'Word Order',
    description: 'Arrange the words in the correct order',
    icon: 'Shuffle',
    difficulty: 'medium'
  },
  {
    id: 'typing-test',
    name: 'Typing Test',
    description: 'Type the verse from memory',
    icon: 'Keyboard',
    difficulty: 'hard'
  },
  {
    id: 'multiple-choice',
    name: 'Multiple Choice',
    description: 'Choose the correct word or phrase',
    icon: 'CheckSquare',
    difficulty: 'easy'
  },
  {
    id: 'first-letter',
    name: 'First Letter',
    description: 'Type the verse using only first letter hints',
    icon: 'Type',
    difficulty: 'hard'
  }
] as const;

// Achievement checking functions
export function checkAchievements(
  userStats: UserStats,
  practiceSession?: PracticeSession,
  achievements: Achievement[] = []
): Achievement[] {
  const newAchievements: Achievement[] = [];

  achievements.forEach(achievement => {
    const criteria = achievement.unlock_criteria;
    let unlocked = false;

    switch (criteria.type) {
      case 'verses_memorized':
        unlocked = userStats.verses_memorized >= criteria.target;
        break;
      case 'streak':
        unlocked = userStats.current_streak >= criteria.target;
        break;
      case 'accuracy':
        unlocked = practiceSession?.accuracy_score && practiceSession.accuracy_score >= criteria.target;
        break;
      case 'speed':
        unlocked = practiceSession?.time_spent && practiceSession.time_spent <= criteria.target;
        break;
      case 'time_of_day':
        if (practiceSession) {
          const hour = new Date().getHours();
          if (criteria.target === 'morning' && hour < 8) unlocked = true;
          if (criteria.target === 'night' && hour >= 22) unlocked = true;
        }
        break;
      case 'day_type':
        if (practiceSession) {
          const day = new Date().getDay();
          if (criteria.target === 'weekend' && (day === 0 || day === 6)) unlocked = true;
        }
        break;
    }

    if (unlocked) {
      newAchievements.push(achievement);
    }
  });

  return newAchievements;
}

// Game mechanics
export function generateFillInBlanks(verseText: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium'): {
  text: string;
  blanks: string[];
  positions: number[];
} {
  const words = verseText.split(' ');
  const blankCount = Math.ceil(words.length * (difficulty === 'easy' ? 0.2 : difficulty === 'medium' ? 0.3 : 0.4));
  
  // Select random words to blank out
  const positions: number[] = [];
  const blanks: string[] = [];
  
  while (positions.length < blankCount) {
    const randomIndex = Math.floor(Math.random() * words.length);
    if (!positions.includes(randomIndex) && words[randomIndex].length > 2) {
      positions.push(randomIndex);
      blanks.push(words[randomIndex]);
    }
  }
  
  // Create text with blanks
  const textWithBlanks = words.map((word, index) => {
    if (positions.includes(index)) {
      return '_'.repeat(word.length);
    }
    return word;
  }).join(' ');
  
  return {
    text: textWithBlanks,
    blanks,
    positions
  };
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function calculateAccuracy(userInput: string, correctAnswer: string): number {
  const userWords = userInput.toLowerCase().trim().split(/\s+/);
  const correctWords = correctAnswer.toLowerCase().trim().split(/\s+/);
  
  if (correctWords.length === 0) return 0;
  
  let correctCount = 0;
  const maxLength = Math.max(userWords.length, correctWords.length);
  
  for (let i = 0; i < maxLength; i++) {
    if (userWords[i] === correctWords[i]) {
      correctCount++;
    }
  }
  
  return correctCount / correctWords.length;
}

export function getStreakBonus(streak: number): number {
  if (streak >= 30) return 100; // Monthly bonus
  if (streak >= 7) return 50;   // Weekly bonus
  if (streak >= 3) return 25;   // Three day bonus
  return 0;
}