import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Book, 
  ChevronRight, 
  ChevronLeft, 
  Bookmark, 
  Copy, 
  Plus,
  ArrowLeft,
  RefreshCw,
  Heart,
  Filter,
  CheckIcon,
  AlertCircle,
  Volume2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ScriptureAudioPlayer } from '@/components/ui/ScriptureAudioPlayer';
import { 
  getVerse, 
  getChapter, 
  searchVerses, 
  getRandomVerse,
  BIBLE_BOOKS, 
  getBooksByTestament,
  formatReference,
  parseReference,
  type BibleVerse,
  type BibleChapter,
  type BibleSearchResult,
  type BibleBook
} from '@/lib/bible-api';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils";

interface BibleBrowserProps {
  onVerseSelect?: (verse: BibleVerse) => void;
  onAddToMemory?: (verse: BibleVerse) => void;
  initialReference?: string;
  showActions?: boolean;
  translation?: string;
  onTabChange?: (tab: string) => void;
  defaultTab?: string;
}

type ViewMode = 'browse' | 'search' | 'chapter';

export function BibleBrowser({ 
  onVerseSelect, 
  onAddToMemory, 
  initialReference,
  showActions = true,
  translation = 'kjv',
  onTabChange,
  defaultTab = 'browse'
}: BibleBrowserProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(defaultTab as ViewMode || 'browse');
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [chapterData, setChapterData] = useState<BibleChapter | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BibleSearchResult[]>([]);
  const [selectedVerse, setSelectedVerse] = useState<BibleVerse | null>(null);
  const [currentTranslation, setCurrentTranslation] = useState(translation);
  const [isLoading, setIsLoading] = useState(false);
  const [randomVerse, setRandomVerse] = useState<BibleVerse | null>(null);
  const [hasRandomVerseError, setHasRandomVerseError] = useState(false);
  const [translationFilter, setTranslationFilter] = useState('');
  const [translationPopoverOpen, setTranslationPopoverOpen] = useState(false);
  const { toast } = useToast();

  const translations = [
    // English translations
    { value: 'kjv', label: 'King James Version (KJV)', language: 'English' },
    { value: 'web', label: 'World English Bible (WEB)', language: 'English' },
    { value: 'asv', label: 'American Standard Version (ASV)', language: 'English' },
    { value: 'bbe', label: 'Basic English Bible', language: 'English' },
    { value: 'oeb-cw', label: 'Open English Bible (OEB)', language: 'English' },
    { value: 'ylt', label: 'Young\'s Literal Translation', language: 'English' },
    { value: 'akjv', label: 'American King James Version', language: 'English' },
    { value: 'wbt', label: 'Webster Bible', language: 'English' },
    { value: 'wey', label: 'Weymouth NT', language: 'English' },
    { value: 'darby', label: 'Darby Bible', language: 'English' },
    { value: 'drb', label: 'Douay-Rheims Bible', language: 'English' },
    { value: 'tyn', label: 'Tyndale Bible (NT)', language: 'English' },
    { value: 'cov', label: 'Coverdale Bible', language: 'English' },
    
    // Latin translations
    { value: 'vulgate', label: 'Clementine Latin Vulgate', language: 'Latin' },
    { value: 'vulgate', label: 'Latin Vulgate', language: 'Latin' },
    
    // German translations
    { value: 'luther1545', label: 'Luther Bible (1545)', language: 'German' },
    { value: 'luther1912', label: 'Luther Bible (1912)', language: 'German' },
    
    // Spanish translations
    { value: 'rvr1960', label: 'Reina Valera (1960)', language: 'Spanish' },
    
    // Portuguese translations
    { value: 'almeida', label: 'João Ferreira de Almeida', language: 'Portuguese' },
    
    // French translations
    { value: 'martin', label: 'Martin (1744)', language: 'French' },
    { value: 'ostervald', label: 'Ostervald (1744)', language: 'French' },
    
    // Russian translations
    { value: 'synodal', label: 'Synodal Translation', language: 'Russian' },
    
    // Finnish translations
    { value: 'finnish1776', label: 'Finnish Bible (1776)', language: 'Finnish' },
    
    // Czech translations
    { value: 'bkr', label: 'Bible Kralická', language: 'Czech' },
    
    // Swedish translations
    { value: 'swedish', label: 'Swedish Bible (1917)', language: 'Swedish' },
    
    // Romanian translations
    { value: 'cornilescu', label: 'Cornilescu Bible', language: 'Romanian' }
  ];

  const filteredTranslations = translationFilter 
    ? translations.filter(t => 
        t.label.toLowerCase().includes(translationFilter.toLowerCase()) || 
        t.language.toLowerCase().includes(translationFilter.toLowerCase()))
    : translations;

  // Group translations by language
  const translationsByLanguage = translations.reduce((acc, t) => {
    if (!acc[t.language]) {
      acc[t.language] = [];
    }
    acc[t.language].push(t);
    return acc;
  }, {} as Record<string, typeof translations>);

  // Get unique languages
  const languages = Object.keys(translationsByLanguage).sort();

  // Initialize with reference if provided
  useEffect(() => {
    if (initialReference) {
      const parsed = parseReference(initialReference);
      if (parsed) {
        const book = BIBLE_BOOKS.find(b => 
          b.name.toLowerCase() === parsed.book.toLowerCase() ||
          b.id.toLowerCase() === parsed.book.toLowerCase()
        );
        if (book) {
          setSelectedBook(book);
          setSelectedChapter(parsed.chapter);
          setViewMode('chapter');
        }
      }
    } else {
      // Load a random inspirational verse on mount
      loadRandomVerse();
    }
  }, [initialReference]);

  // Load chapter when book/chapter changes
  useEffect(() => {
    if (selectedBook && viewMode === 'chapter') {
      loadChapter();
    }
  }, [selectedBook, selectedChapter, currentTranslation, viewMode]);

  // Handle tab changes
  useEffect(() => {
    if (onTabChange) {
      onTabChange(viewMode);
    }
  }, [viewMode, onTabChange]);

  const loadRandomVerse = async () => {
    try {
      setHasRandomVerseError(false);
      const verse = await getRandomVerse(currentTranslation);
      if (verse) {
        setRandomVerse(verse);
      } else {
        setHasRandomVerseError(true);
      }
    } catch (error) {
      console.error('Error loading random verse:', error);
      setHasRandomVerseError(true);
    }
  };

  const loadChapter = async () => {
    if (!selectedBook) return;
    
    setIsLoading(true);
    try {
      const data = await getChapter(selectedBook.name, selectedChapter, currentTranslation);
      setChapterData(data);
    } catch (error) {
      console.error('Error loading chapter:', error);
      toast({
        title: 'Error',
        description: 'Failed to load Bible chapter',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    setViewMode('search');
    
    try {
      // First try to parse as a reference
      const parsed = parseReference(searchQuery);
      if (parsed) {
        const verse = await getVerse(searchQuery, currentTranslation);
        if (verse) {
          setSelectedVerse(verse);
          setSearchResults([]);
          return;
        }
      }
      
      // Otherwise search for text
      const results = await searchVerses(searchQuery, currentTranslation);
      setSearchResults(results);
      setSelectedVerse(null);
    } catch (error) {
      console.error('Error searching:', error);
      toast({
        title: 'Error',
        description: 'Failed to search Bible',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerseClick = async (reference: string) => {
    try {
      const verse = await getVerse(reference, currentTranslation);
      if (verse) {
        setSelectedVerse(verse);
        onVerseSelect?.(verse);
      }
    } catch (error) {
      console.error('Error loading verse:', error);
    }
  };

  const handleCopyVerse = (verse: BibleVerse) => {
    const text = `"${verse.text}" - ${verse.reference} (${verse.translation_id})`;
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Verse copied to clipboard',
    });
  };

  const handleAddToMemory = (verse: BibleVerse) => {
    onAddToMemory?.(verse);
    toast({
      title: 'Added',
      description: 'Verse added to scripture memory',
    });
  };

  const navigateChapter = (direction: 'prev' | 'next') => {
    if (!selectedBook) return;
    
    if (direction === 'prev' && selectedChapter > 1) {
      setSelectedChapter(selectedChapter - 1);
    } else if (direction === 'next' && selectedChapter < selectedBook.chapters) {
      setSelectedChapter(selectedChapter + 1);
    }
  };

  const oldTestamentBooks = getBooksByTestament('old');
  const newTestamentBooks = getBooksByTestament('new');

  // Function to get the translation label by value
  const getTranslationLabel = (value: string) => {
    const trans = translations.find(t => t.value === value);
    return trans ? trans.label : value.toUpperCase();
  };

  return (
    <div className="space-y-4">
      {/* Header with translation selector */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center space-x-2">
          <Book className="h-5 w-5 text-secondary" />
          <h3 className="text-lg font-semibold text-foreground">Bible</h3>
          {selectedBook && viewMode === 'chapter' && (
            <Badge variant="outline" className="bg-secondary/10 text-secondary">
              {formatReference(selectedBook.name, selectedChapter)}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Popover open={translationPopoverOpen} onOpenChange={setTranslationPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[220px] justify-between">
                {getTranslationLabel(currentTranslation)}
                <Filter className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="end">
              <Command>
                <CommandInput placeholder="Search translations..." value={translationFilter} onValueChange={setTranslationFilter} />
                <CommandList>
                  <CommandEmpty>No translation found.</CommandEmpty>
                  <ScrollArea className="h-[300px]">
                    {filteredTranslations.length > 0 && !translationFilter && (
                      languages.map(language => (
                        <CommandGroup heading={language} key={language}>
                          {translationsByLanguage[language].map(trans => (
                            <CommandItem
                              key={trans.value}
                              value={trans.value}
                              onSelect={value => {
                                setCurrentTranslation(value);
                                setTranslationPopoverOpen(false);
                              }}
                            >
                              {trans.label}
                              <CheckIcon 
                                className={cn(
                                  "ml-auto h-4 w-4",
                                  currentTranslation === trans.value ? "opacity-100" : "opacity-0"
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      ))
                    )}
                    
                    {translationFilter && (
                      <CommandGroup>
                        {filteredTranslations.map(trans => (
                          <CommandItem
                            key={trans.value}
                            value={trans.value}
                            onSelect={value => {
                              setCurrentTranslation(value);
                              setTranslationPopoverOpen(false);
                            }}
                          >
                            <span>{trans.label}</span>
                            <span className="ml-2 text-xs text-muted-foreground">({trans.language})</span>
                            <CheckIcon 
                              className={cn(
                                "ml-auto h-4 w-4",
                                currentTranslation === trans.value ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </ScrollArea>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          
          <Button
            variant="outline"
            size="icon"
            onClick={loadRandomVerse}
            className="shrink-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Random verse display */}
      {viewMode === 'browse' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          {randomVerse ? (
            <Card className="bg-gradient-to-r from-secondary/5 to-primary/5 border-secondary/20">
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <blockquote className="text-lg italic text-foreground">
                        "{randomVerse.text}"
                      </blockquote>
                      <cite className="text-muted-foreground font-medium block mt-2">
                        — {randomVerse.reference}
                      </cite>
                    </div>
                    <div className="flex flex-col space-y-1 ml-4">
                      <ScriptureAudioPlayer 
                        scripture={randomVerse.text}
                        size="sm"
                        variant="ghost"
                      />
                      {showActions && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyVerse(randomVerse)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          {onAddToMemory && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAddToMemory(randomVerse)}
                            >
                              <Heart className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : hasRandomVerseError ? (
            <Card className="bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-medium text-amber-800 dark:text-amber-300">Unable to load verse</h4>
                      <p className="text-amber-700 dark:text-amber-400 text-sm mt-1">
                        There was an error loading the random verse. The selected translation may not be available.
                      </p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/50"
                    onClick={loadRandomVerse}
                  >
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
        </motion.div>
      )}

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Search verses or enter reference (e.g., John 3:16)"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          className="flex-1"
        />
        <Button onClick={handleSearch} disabled={isLoading}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation tabs */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="chapter">Chapter</TabsTrigger>
        </TabsList>

        {/* Browse books */}
        <TabsContent value="browse" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Old Testament */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Old Testament</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-1">
                    {oldTestamentBooks.map(book => (
                      <Button
                        key={book.id}
                        variant="ghost"
                        className="w-full justify-start text-left h-auto py-2"
                        onClick={() => {
                          setSelectedBook(book);
                          setSelectedChapter(1);
                          setViewMode('chapter');
                        }}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span>{book.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {book.chapters} ch
                          </Badge>
                        </div>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* New Testament */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">New Testament</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-1">
                    {newTestamentBooks.map(book => (
                      <Button
                        key={book.id}
                        variant="ghost"
                        className="w-full justify-start text-left h-auto py-2"
                        onClick={() => {
                          setSelectedBook(book);
                          setSelectedChapter(1);
                          setViewMode('chapter');
                        }}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span>{book.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {book.chapters} ch
                          </Badge>
                        </div>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Search results */}
        <TabsContent value="search" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Searching...</p>
            </div>
          ) : selectedVerse ? (
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <blockquote className="text-lg italic text-foreground">
                        "{selectedVerse.text}"
                      </blockquote>
                      <cite className="text-muted-foreground font-medium block mt-2">
                        — {selectedVerse.reference}
                      </cite>
                    </div>
                    <div className="flex flex-col space-y-1 ml-4">
                      <ScriptureAudioPlayer 
                        scripture={selectedVerse.text}
                        size="sm"
                        variant="ghost"
                      />
                      {showActions && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyVerse(selectedVerse)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          {onAddToMemory && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAddToMemory(selectedVerse)}
                            >
                              <Heart className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : searchResults.length > 0 ? (
            <div className="space-y-2">
              {searchResults.map((result, index) => (
                <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-foreground">{result.reference}</h4>
                        <div className="flex space-x-1">
                          <ScriptureAudioPlayer
                            scripture={result.text}
                            size="sm"
                            variant="ghost"
                          />
                          {showActions && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyVerse({
                                    reference: result.reference,
                                    text: result.text,
                                    translation_id: currentTranslation.toUpperCase(),
                                    translation_name: currentTranslation.toUpperCase(),
                                    translation_note: ''
                                  });
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              {onAddToMemory && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddToMemory({
                                      reference: result.reference,
                                      text: result.text,
                                      translation_id: currentTranslation.toUpperCase(),
                                      translation_name: currentTranslation.toUpperCase(),
                                      translation_note: ''
                                    });
                                  }}
                                >
                                  <Heart className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <p className="text-foreground/80 italic">"{result.text}"</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : searchQuery && (
            <div className="text-center py-8">
              <Book className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
            </div>
          )}
        </TabsContent>

        {/* Chapter view */}
        <TabsContent value="chapter" className="space-y-4">
          {selectedBook && (
            <div className="space-y-4">
              {/* Chapter navigation */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateChapter('prev')}
                  disabled={selectedChapter <= 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                
                <div className="flex items-center space-x-2">
                  <Select
                    value={selectedChapter.toString()}
                    onValueChange={(value) => setSelectedChapter(parseInt(value))}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map(ch => (
                        <SelectItem key={ch} value={ch.toString()}>
                          Chapter {ch}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode('browse')}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Books
                  </Button>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateChapter('next')}
                  disabled={selectedChapter >= selectedBook.chapters}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              {/* Chapter content */}
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground mt-2">Loading chapter...</p>
                </div>
              ) : chapterData ? (
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-foreground">
                        {formatReference(selectedBook.name, selectedChapter)}
                      </CardTitle>
                      <ScriptureAudioPlayer 
                        scripture={chapterData.verses.map(v => v.text).join(' ')}
                        title={`${selectedBook.name} ${selectedChapter}`}
                        showSettings={true}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-4">
                        {chapterData.verses.map((verse, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="group"
                          >
                            <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted transition-colors">
                              <Badge variant="outline" className="mt-1 text-xs">
                                {index + 1}
                              </Badge>
                              <div className="flex-1">
                                <p className="text-foreground leading-relaxed">{verse.text}</p>
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                                <ScriptureAudioPlayer
                                  scripture={verse.text}
                                  size="sm"
                                  variant="ghost"
                                />
                                {showActions && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleCopyVerse(verse)}
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                    {onAddToMemory && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleAddToMemory(verse)}
                                      >
                                        <Heart className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-8">
                  <Book className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Failed to load chapter</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadChapter}
                    className="mt-2"
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}