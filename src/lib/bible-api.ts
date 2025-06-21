// Bible API service for fetching scripture data
import { withErrorHandling } from './error-handler';

export interface BibleVerse {
  reference: string;
  text: string;
  translation_id: string;
  translation_name: string;
  translation_note: string;
}

export interface BibleBook {
  id: string;
  name: string;
  testament: 'old' | 'new';
  chapters: number;
}

export interface BibleChapter {
  book: string;
  chapter: number;
  verses: BibleVerse[];
}

export interface BibleSearchResult {
  reference: string;
  text: string;
  book: string;
  chapter: number;
  verse: number;
}

// List of Bible books for navigation
export const BIBLE_BOOKS: BibleBook[] = [
  // Old Testament
  { id: 'genesis', name: 'Genesis', testament: 'old', chapters: 50 },
  { id: 'exodus', name: 'Exodus', testament: 'old', chapters: 40 },
  { id: 'leviticus', name: 'Leviticus', testament: 'old', chapters: 27 },
  { id: 'numbers', name: 'Numbers', testament: 'old', chapters: 36 },
  { id: 'deuteronomy', name: 'Deuteronomy', testament: 'old', chapters: 34 },
  { id: 'joshua', name: 'Joshua', testament: 'old', chapters: 24 },
  { id: 'judges', name: 'Judges', testament: 'old', chapters: 21 },
  { id: 'ruth', name: 'Ruth', testament: 'old', chapters: 4 },
  { id: '1samuel', name: '1 Samuel', testament: 'old', chapters: 31 },
  { id: '2samuel', name: '2 Samuel', testament: 'old', chapters: 24 },
  { id: '1kings', name: '1 Kings', testament: 'old', chapters: 22 },
  { id: '2kings', name: '2 Kings', testament: 'old', chapters: 25 },
  { id: '1chronicles', name: '1 Chronicles', testament: 'old', chapters: 29 },
  { id: '2chronicles', name: '2 Chronicles', testament: 'old', chapters: 36 },
  { id: 'ezra', name: 'Ezra', testament: 'old', chapters: 10 },
  { id: 'nehemiah', name: 'Nehemiah', testament: 'old', chapters: 13 },
  { id: 'esther', name: 'Esther', testament: 'old', chapters: 10 },
  { id: 'job', name: 'Job', testament: 'old', chapters: 42 },
  { id: 'psalms', name: 'Psalms', testament: 'old', chapters: 150 },
  { id: 'proverbs', name: 'Proverbs', testament: 'old', chapters: 31 },
  { id: 'ecclesiastes', name: 'Ecclesiastes', testament: 'old', chapters: 12 },
  { id: 'songofsolomon', name: 'Song of Solomon', testament: 'old', chapters: 8 },
  { id: 'isaiah', name: 'Isaiah', testament: 'old', chapters: 66 },
  { id: 'jeremiah', name: 'Jeremiah', testament: 'old', chapters: 52 },
  { id: 'lamentations', name: 'Lamentations', testament: 'old', chapters: 5 },
  { id: 'ezekiel', name: 'Ezekiel', testament: 'old', chapters: 48 },
  { id: 'daniel', name: 'Daniel', testament: 'old', chapters: 12 },
  { id: 'hosea', name: 'Hosea', testament: 'old', chapters: 14 },
  { id: 'joel', name: 'Joel', testament: 'old', chapters: 3 },
  { id: 'amos', name: 'Amos', testament: 'old', chapters: 9 },
  { id: 'obadiah', name: 'Obadiah', testament: 'old', chapters: 1 },
  { id: 'jonah', name: 'Jonah', testament: 'old', chapters: 4 },
  { id: 'micah', name: 'Micah', testament: 'old', chapters: 7 },
  { id: 'nahum', name: 'Nahum', testament: 'old', chapters: 3 },
  { id: 'habakkuk', name: 'Habakkuk', testament: 'old', chapters: 3 },
  { id: 'zephaniah', name: 'Zephaniah', testament: 'old', chapters: 3 },
  { id: 'haggai', name: 'Haggai', testament: 'old', chapters: 2 },
  { id: 'zechariah', name: 'Zechariah', testament: 'old', chapters: 14 },
  { id: 'malachi', name: 'Malachi', testament: 'old', chapters: 4 },
  
  // New Testament
  { id: 'matthew', name: 'Matthew', testament: 'new', chapters: 28 },
  { id: 'mark', name: 'Mark', testament: 'new', chapters: 16 },
  { id: 'luke', name: 'Luke', testament: 'new', chapters: 24 },
  { id: 'john', name: 'John', testament: 'new', chapters: 21 },
  { id: 'acts', name: 'Acts', testament: 'new', chapters: 28 },
  { id: 'romans', name: 'Romans', testament: 'new', chapters: 16 },
  { id: '1corinthians', name: '1 Corinthians', testament: 'new', chapters: 16 },
  { id: '2corinthians', name: '2 Corinthians', testament: 'new', chapters: 13 },
  { id: 'galatians', name: 'Galatians', testament: 'new', chapters: 6 },
  { id: 'ephesians', name: 'Ephesians', testament: 'new', chapters: 6 },
  { id: 'philippians', name: 'Philippians', testament: 'new', chapters: 4 },
  { id: 'colossians', name: 'Colossians', testament: 'new', chapters: 4 },
  { id: '1thessalonians', name: '1 Thessalonians', testament: 'new', chapters: 5 },
  { id: '2thessalonians', name: '2 Thessalonians', testament: 'new', chapters: 3 },
  { id: '1timothy', name: '1 Timothy', testament: 'new', chapters: 6 },
  { id: '2timothy', name: '2 Timothy', testament: 'new', chapters: 4 },
  { id: 'titus', name: 'Titus', testament: 'new', chapters: 3 },
  { id: 'philemon', name: 'Philemon', testament: 'new', chapters: 1 },
  { id: 'hebrews', name: 'Hebrews', testament: 'new', chapters: 13 },
  { id: 'james', name: 'James', testament: 'new', chapters: 5 },
  { id: '1peter', name: '1 Peter', testament: 'new', chapters: 5 },
  { id: '2peter', name: '2 Peter', testament: 'new', chapters: 3 },
  { id: '1john', name: '1 John', testament: 'new', chapters: 5 },
  { id: '2john', name: '2 John', testament: 'new', chapters: 1 },
  { id: '3john', name: '3 John', testament: 'new', chapters: 1 },
  { id: 'jude', name: 'Jude', testament: 'new', chapters: 1 },
  { id: 'revelation', name: 'Revelation', testament: 'new', chapters: 22 },
];

// Cache for Bible API responses
const cache = new Map<string, any>();
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

// API Base URLs
const BIBLE_API_BASE = 'https://bible-api.com';
const ESV_API_BASE = 'https://api.esv.org/v3/passage';

// Get verse by reference (e.g., "John 3:16")
export async function getVerse(reference: string, translation = 'kjv'): Promise<BibleVerse | null> {
  const cacheKey = `verse_${reference}_${translation}`;
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    // Use Bible API for most translations - convert translation to uppercase
    const url = `${BIBLE_API_BASE}/${encodeURIComponent(reference)}?translation=${translation.toUpperCase()}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch verse: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.verses || data.verses.length === 0) {
      return null;
    }
    
    const verse: BibleVerse = {
      reference: data.reference,
      text: data.text.trim(),
      translation_id: data.translation_id || translation.toUpperCase(),
      translation_name: data.translation_name || translation.toUpperCase(),
      translation_note: data.translation_note || ''
    };
    
    // Cache the result
    cache.set(cacheKey, { data: verse, timestamp: Date.now() });
    
    return verse;
  } catch (error) {
    console.error('Error fetching verse:', error);
    return null;
  }
}

// Get multiple verses by references
export async function getVerses(references: string[], translation = 'kjv'): Promise<BibleVerse[]> {
  const promises = references.map(ref => getVerse(ref, translation));
  const results = await Promise.all(promises);
  return results.filter((verse): verse is BibleVerse => verse !== null);
}

// Get a whole chapter
export async function getChapter(book: string, chapter: number, translation = 'kjv'): Promise<BibleChapter | null> {
  const cacheKey = `chapter_${book}_${chapter}_${translation}`;
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const reference = `${book} ${chapter}`;
    // Convert translation to uppercase
    const url = `${BIBLE_API_BASE}/${encodeURIComponent(reference)}?translation=${translation.toUpperCase()}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch chapter: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.verses || data.verses.length === 0) {
      return null;
    }
    
    const chapterData: BibleChapter = {
      book: book,
      chapter: chapter,
      verses: data.verses.map((verse: any) => ({
        reference: `${book} ${chapter}:${verse.verse}`,
        text: verse.text.trim(),
        translation_id: data.translation_id || translation.toUpperCase(),
        translation_name: data.translation_name || translation.toUpperCase(),
        translation_note: data.translation_note || ''
      }))
    };
    
    // Cache the result
    cache.set(cacheKey, { data: chapterData, timestamp: Date.now() });
    
    return chapterData;
  } catch (error) {
    console.error('Error fetching chapter:', error);
    return null;
  }
}

// Search for verses containing specific text
export async function searchVerses(query: string, translation = 'kjv'): Promise<BibleSearchResult[]> {
  // For now, we'll implement a simple search using common verses
  // In a full implementation, you'd want to use a dedicated search API
  
  const commonVerses = [
    'John 3:16', 'Romans 8:28', 'Philippians 4:13', 'Jeremiah 29:11',
    'Psalm 23:1', 'Matthew 11:28', 'Isaiah 40:31', 'Romans 6:23',
    'Ephesians 2:8-9', '1 Corinthians 13:4-7', 'Proverbs 3:5-6',
    'Matthew 6:26', 'Psalm 46:10', 'Romans 12:2', 'Galatians 2:20',
    'Psalm 91:1-2', 'Joshua 1:9', 'Hebrews 11:1', '2 Timothy 3:16-17',
    '1 John 4:7-8', 'Matthew 28:19-20', 'Isaiah 41:10', 'John 14:6',
    'John 1:1-3', 'Galatians 5:22-23', '2 Corinthians 5:17', 'Hebrews 4:12'
  ];
  
  const searchResults: BibleSearchResult[] = [];
  const searchTerm = query.toLowerCase();
  
  // Search through common verses
  for (const ref of commonVerses) {
    try {
      const verse = await getVerse(ref, translation);
      if (verse && verse.text.toLowerCase().includes(searchTerm)) {
        const parts = ref.match(/(\w+)\s+(\d+):(\d+)/);
        if (parts) {
          searchResults.push({
            reference: verse.reference,
            text: verse.text,
            book: parts[1],
            chapter: parseInt(parts[2]),
            verse: parseInt(parts[3])
          });
        }
      }
    } catch (error) {
      console.error(`Error searching verse ${ref}:`, error);
    }
  }
  
  return searchResults;
}

// Parse a reference string into components
export function parseReference(reference: string): { book: string; chapter: number; verse?: number } | null {
  // Handle various formats: "John 3:16", "John 3", "1 Corinthians 13:4-7", etc.
  const patterns = [
    /^(\d?\s?\w+)\s+(\d+):(\d+)(?:-\d+)?$/, // "John 3:16" or "1 Corinthians 13:4-7"
    /^(\d?\s?\w+)\s+(\d+)$/, // "John 3"
  ];
  
  for (const pattern of patterns) {
    const match = reference.match(pattern);
    if (match) {
      return {
        book: match[1].trim(),
        chapter: parseInt(match[2]),
        verse: match[3] ? parseInt(match[3]) : undefined
      };
    }
  }
  
  return null;
}

// Get book information by name or ID
export function getBook(nameOrId: string): BibleBook | null {
  const search = nameOrId.toLowerCase();
  return BIBLE_BOOKS.find(book => 
    book.id.toLowerCase() === search || 
    book.name.toLowerCase() === search ||
    book.name.toLowerCase().replace(/\s+/g, '') === search.replace(/\s+/g, '')
  ) || null;
}

// Get all books in a testament
export function getBooksByTestament(testament: 'old' | 'new'): BibleBook[] {
  return BIBLE_BOOKS.filter(book => book.testament === testament);
}

// Format reference for display
export function formatReference(book: string, chapter: number, verse?: number): string {
  const bookInfo = getBook(book);
  const bookName = bookInfo ? bookInfo.name : book;
  
  if (verse) {
    return `${bookName} ${chapter}:${verse}`;
  } else {
    return `${bookName} ${chapter}`;
  }
}

// Validate if a reference exists
export function isValidReference(book: string, chapter: number, verse?: number): boolean {
  const bookInfo = getBook(book);
  if (!bookInfo) return false;
  
  if (chapter < 1 || chapter > bookInfo.chapters) return false;
  
  // For now, we'll assume verses 1-999 are valid for any chapter
  // In a full implementation, you'd want to check actual verse counts
  if (verse && (verse < 1 || verse > 999)) return false;
  
  return true;
}

// Get random verse for inspiration
export async function getRandomVerse(translation = 'kjv'): Promise<BibleVerse | null> {
  const inspirationalVerses = [
    'Jeremiah 29:11', 'Romans 8:28', 'Philippians 4:13', 'John 3:16',
    'Psalm 23:1', 'Isaiah 40:31', 'Matthew 11:28', 'Proverbs 3:5-6',
    'Joshua 1:9', 'Psalm 46:10', 'Romans 12:2', '2 Corinthians 5:7',
    'Ephesians 2:8-9', 'Psalm 118:24', 'Matthew 6:26', 'Philippians 4:6-7',
    'Isaiah 41:10', '1 John 4:7-8', 'Psalm 91:1-2', 'Hebrews 11:1',
    '2 Timothy 3:16-17', 'Galatians 5:22-23', '1 Peter 5:7', 'John 14:27'
  ];
  
  const randomIndex = Math.floor(Math.random() * inspirationalVerses.length);
  const randomRef = inspirationalVerses[randomIndex];
  
  return await getVerse(randomRef, translation);
}