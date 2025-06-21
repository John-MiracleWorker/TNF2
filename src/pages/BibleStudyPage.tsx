import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Book, Search, Plus, Tag, Calendar, Edit, Trash2, Heart, X, Sparkles, FileText, UploadCloud } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Existing imports
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { getBibleStudyNotes, saveBibleStudyNote, updateBibleStudyNote, deleteBibleStudyNote } from '@/lib/supabase';
import { BibleStudyNote } from '@/lib/types';
import { format } from 'date-fns';

// New imports for AI Bible Study
import { AIBibleStudyGenerator } from '@/components/bible/AIBibleStudyGenerator';
import { AIBibleStudyCard } from '@/components/bible/AIBibleStudyCard';
import { getAIBibleStudies, AIBibleStudy } from '@/lib/ai-bible-study';

// New imports for Sermon Analysis
import { SermonUploadForm } from '@/components/sermons/SermonUploadForm';
import { SermonDetail } from '@/components/sermons/SermonDetail';
import { SermonList } from '@/components/sermons/SermonList';
import { getSermonSummaries } from '@/lib/sermons';
import { SermonSummary } from '@/lib/types';

const BibleStudyPage = () => {
  const [notes, setNotes] = useState<BibleStudyNote[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<BibleStudyNote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<BibleStudyNote | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [newNote, setNewNote] = useState<BibleStudyNote>({
    title: '',
    scripture_reference: '',
    content: '',
    tags: [],
    is_favorite: false
  });
  const [newTag, setNewTag] = useState('');
  const [activeTab, setActiveTab] = useState('notes');
  
  // AI Bible Studies state
  const [aiBibleStudies, setAIBibleStudies] = useState<AIBibleStudy[]>([]);
  const [isLoadingAIStudies, setIsLoadingAIStudies] = useState(false);
  
  // Sermon Analysis state
  const [sermons, setSermons] = useState<SermonSummary[]>([]);
  const [isLoadingSermons, setIsLoadingSermons] = useState(false);
  const [selectedSermon, setSelectedSermon] = useState<SermonSummary | null>(null);
  const [showSermonUpload, setShowSermonUpload] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    loadBibleStudyNotes();
    
    if (activeTab === 'ai-studies') {
      loadAIBibleStudies();
    } else if (activeTab === 'sermons') {
      loadSermons();
    }
  }, [activeTab]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredNotes(notes);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = notes.filter(
        note => 
          note.title.toLowerCase().includes(query) ||
          note.scripture_reference.toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query) ||
          (note.tags && note.tags.some(tag => tag.toLowerCase().includes(query)))
      );
      setFilteredNotes(filtered);
    }
  }, [searchQuery, notes]);

  const loadBibleStudyNotes = async () => {
    setIsLoading(true);
    try {
      const data = await getBibleStudyNotes();
      setNotes(data);
      setFilteredNotes(data);
    } catch (error) {
      console.error('Error loading Bible study notes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load Bible study notes',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadAIBibleStudies = async () => {
    setIsLoadingAIStudies(true);
    try {
      const studies = await getAIBibleStudies();
      setAIBibleStudies(studies);
    } catch (error) {
      console.error('Error loading AI Bible studies:', error);
      toast({
        title: 'Error',
        description: 'Failed to load AI Bible studies',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingAIStudies(false);
    }
  };
  
  const loadSermons = async () => {
    setIsLoadingSermons(true);
    try {
      const data = await getSermonSummaries();
      setSermons(data);
    } catch (error) {
      console.error('Error loading sermons:', error);
      toast({
        title: 'Error',
        description: 'Failed to load sermon summaries',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingSermons(false);
    }
  };

  const handleCreateNote = async () => {
    if (!newNote.title.trim() || !newNote.scripture_reference.trim() || !newNote.content.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const note: BibleStudyNote = {
        ...newNote
      };
      
      const savedNote = await saveBibleStudyNote(note);
      setNotes(prev => [savedNote, ...prev]);
      
      setNewNote({
        title: '',
        scripture_reference: '',
        content: '',
        tags: [],
        is_favorite: false
      });
      
      toast({
        title: 'Success',
        description: 'Bible study note created successfully',
      });
    } catch (error) {
      console.error('Error creating Bible study note:', error);
      toast({
        title: 'Error',
        description: 'Failed to create Bible study note',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateNote = async () => {
    if (!selectedNote) return;
    
    try {
      const updatedNote = await updateBibleStudyNote(selectedNote);
      setNotes(prev => 
        prev.map(note => 
          note.id === updatedNote.id ? updatedNote : note
        )
      );
      
      setEditMode(false);
      toast({
        title: 'Success',
        description: 'Bible study note updated successfully',
      });
    } catch (error) {
      console.error('Error updating Bible study note:', error);
      toast({
        title: 'Error',
        description: 'Failed to update Bible study note',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await deleteBibleStudyNote(id);
      setNotes(prev => prev.filter(note => note.id !== id));
      setSelectedNote(null);
      
      toast({
        title: 'Success',
        description: 'Bible study note deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting Bible study note:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete Bible study note',
        variant: 'destructive',
      });
    }
  };

  const toggleFavorite = async (note: BibleStudyNote) => {
    try {
      const updatedNote: BibleStudyNote = {
        ...note,
        is_favorite: !note.is_favorite
      };
      
      await updateBibleStudyNote(updatedNote);
      setNotes(prev => 
        prev.map(n => 
          n.id === updatedNote.id ? updatedNote : n
        )
      );
      
      if (selectedNote && selectedNote.id === note.id) {
        setSelectedNote(updatedNote);
      }
      
      toast({
        title: 'Success',
        description: updatedNote.is_favorite
          ? 'Note added to favorites'
          : 'Note removed from favorites',
      });
    } catch (error) {
      console.error('Error updating favorite status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update favorite status',
        variant: 'destructive',
      });
    }
  };

  const addTag = (noteState: 'new' | 'edit') => {
    if (!newTag.trim()) return;
    
    if (noteState === 'new') {
      setNewNote(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()]
      }));
    } else if (selectedNote) {
      setSelectedNote(prev => ({
        ...prev!,
        tags: [...(prev!.tags || []), newTag.trim()]
      }));
    }
    
    setNewTag('');
  };

  const removeTag = (tag: string, noteState: 'new' | 'edit') => {
    if (noteState === 'new') {
      setNewNote(prev => ({
        ...prev,
        tags: prev.tags?.filter(t => t !== tag)
      }));
    } else if (selectedNote) {
      setSelectedNote(prev => ({
        ...prev!,
        tags: prev!.tags?.filter(t => t !== tag)
      }));
    }
  };
  
  const handleSermonUploadComplete = (sermon: SermonSummary) => {
    // Reload sermons after upload completes
    setShowSermonUpload(false);
    loadSermons();
  };
  
  const handleDeleteSermon = (id: string) => {
    // Remove the deleted sermon from the list
    setSermons(prev => prev.filter(s => s.id !== id));
    
    // Clear selection if the deleted sermon was selected
    if (selectedSermon && selectedSermon.id === id) {
      setSelectedSermon(null);
    }
    
    // Show success toast
    toast({
      title: 'Sermon Deleted',
      description: 'Sermon has been deleted successfully',
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Bible Study</h1>
            <p className="text-muted-foreground">
              Capture insights and reflections from your Bible study
            </p>
          </div>
          
          {activeTab === 'notes' && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary" className="text-secondary-foreground">
                  <Plus className="mr-2 h-4 w-4" />
                  New Note
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Create Bible Study Note</DialogTitle>
                  <DialogDescription>
                    Add a new note from your Bible study
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      placeholder="Title for your note"
                      value={newNote.title}
                      onChange={e => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="scripture_reference">Scripture Reference</Label>
                    <Input
                      id="scripture_reference"
                      placeholder="e.g., Romans 8:28-30"
                      value={newNote.scripture_reference}
                      onChange={e => setNewNote(prev => ({ ...prev, scripture_reference: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="content">Note Content</Label>
                    <Textarea
                      id="content"
                      placeholder="Write your Bible study insights here..."
                      rows={8}
                      value={newNote.content}
                      onChange={e => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Tags</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {newNote.tags?.map((tag, index) => (
                        <Badge key={index} variant="outline" className="bg-muted/50">
                          {tag}
                          <button
                            onClick={() => removeTag(tag, 'new')}
                            className="ml-1 text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a tag"
                        value={newTag}
                        onChange={e => setNewTag(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addTag('new')}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => addTag('new')}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_favorite"
                      checked={newNote.is_favorite}
                      onCheckedChange={value => setNewNote(prev => ({ ...prev, is_favorite: value }))}
                    />
                    <Label htmlFor="is_favorite">Add to favorites</Label>
                  </div>
                </div>
                
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button onClick={handleCreateNote}>Create Note</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          
          {activeTab === 'sermons' && !showSermonUpload && (
            <Button 
              variant="secondary" 
              className="text-secondary-foreground"
              onClick={() => setShowSermonUpload(true)}
            >
              <UploadCloud className="mr-2 h-4 w-4" />
              Upload Sermon
            </Button>
          )}
        </div>
        
        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <Book className="h-4 w-4" />
              <span className="hidden sm:inline">My Study Notes</span>
              <span className="sm:hidden">Notes</span>
            </TabsTrigger>
            <TabsTrigger value="ai-studies" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">AI Bible Studies</span>
              <span className="sm:hidden">AI Studies</span>
            </TabsTrigger>
            <TabsTrigger value="sermons" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Sermon Analysis</span>
              <span className="sm:hidden">Sermons</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Bible Study Notes Tab */}
          <TabsContent value="notes" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-2/3 space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search notes..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                
                {/* Notes list */}
                <div className="space-y-4">
                  {isLoading ? (
                    <div className="py-20 text-center text-muted-foreground">Loading Bible study notes...</div>
                  ) : filteredNotes.length > 0 ? (
                    filteredNotes.map((note) => (
                      <motion.div
                        key={note.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card 
                          className={`
                            hover:shadow-md transition-shadow cursor-pointer
                            ${note.is_favorite ? 'border-l-4 border-l-red-500 dark:border-l-red-600' : ''}
                          `}
                          onClick={() => {
                            setSelectedNote(note);
                            setEditMode(false);
                          }}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-foreground text-xl">{note.title}</CardTitle>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className={note.is_favorite 
                                  ? "text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/30" 
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(note);
                                }}
                              >
                                <Heart className={`h-5 w-5 ${note.is_favorite ? 'fill-red-500 dark:fill-red-400' : ''}`} />
                              </Button>
                            </div>
                            <div className="text-sm font-medium text-muted-foreground">
                              {note.scripture_reference}
                            </div>
                          </CardHeader>
                          <CardContent className="pb-2">
                            <p className="text-foreground/80 line-clamp-2">{note.content}</p>
                          </CardContent>
                          <CardFooter className="flex justify-between">
                            <div className="flex flex-wrap gap-1">
                              {note.tags && note.tags.map((tag, i) => (
                                <Badge key={i} variant="outline" className="bg-muted/50 text-muted-foreground">
                                  <Tag className="h-3 w-3 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {note.created_at && format(new Date(note.created_at), 'MMM d, yyyy')}
                            </div>
                          </CardFooter>
                        </Card>
                      </motion.div>
                    ))
                  ) : (
                    <div className="py-20 text-center">
                      <Book className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No Bible study notes found</h3>
                      <p className="text-muted-foreground mb-6">
                        {searchQuery.trim() !== '' 
                          ? "No notes match your search criteria"
                          : "Start by adding your first Bible study note"
                        }
                      </p>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Bible Study Note
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                          <DialogHeader>
                            <DialogTitle>Create Bible Study Note</DialogTitle>
                            <DialogDescription>
                              Add a new note from your Bible study
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="title_empty">Title</Label>
                              <Input
                                id="title_empty"
                                placeholder="Title for your note"
                                value={newNote.title}
                                onChange={e => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="scripture_reference_empty">Scripture Reference</Label>
                              <Input
                                id="scripture_reference_empty"
                                placeholder="e.g., Romans 8:28-30"
                                value={newNote.scripture_reference}
                                onChange={e => setNewNote(prev => ({ ...prev, scripture_reference: e.target.value }))}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="content_empty">Note Content</Label>
                              <Textarea
                                id="content_empty"
                                placeholder="Write your Bible study insights here..."
                                rows={8}
                                value={newNote.content}
                                onChange={e => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Tags</Label>
                              <div className="flex flex-wrap gap-2 mb-2">
                                {newNote.tags?.map((tag, index) => (
                                  <Badge key={index} variant="outline" className="bg-muted/50">
                                    {tag}
                                    <button
                                      onClick={() => removeTag(tag, 'new')}
                                      className="ml-1 text-muted-foreground hover:text-foreground"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <Input
                                  placeholder="Add a tag"
                                  value={newTag}
                                  onChange={e => setNewTag(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && addTag('new')}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => addTag('new')}
                                >
                                  Add
                                </Button>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="is_favorite_empty"
                                checked={newNote.is_favorite}
                                onCheckedChange={value => setNewNote(prev => ({ ...prev, is_favorite: value }))}
                              />
                              <Label htmlFor="is_favorite_empty">Add to favorites</Label>
                            </div>
                          </div>
                          
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <DialogClose asChild>
                              <Button onClick={handleCreateNote}>Create Note</Button>
                            </DialogClose>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Note detail view */}
              <div className="w-full md:w-1/3">
                {selectedNote ? (
                  <Card className="sticky top-4">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-foreground text-xl">
                          {editMode ? (
                            <Input
                              value={selectedNote.title}
                              onChange={e => setSelectedNote(prev => ({ ...prev!, title: e.target.value }))}
                              className="mt-1"
                            />
                          ) : (
                            selectedNote.title
                          )}
                        </CardTitle>
                        <div className="flex space-x-2">
                          {editMode ? (
                            <>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => setEditMode(false)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm"
                                onClick={handleUpdateNote}
                              >
                                Save
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className={selectedNote.is_favorite 
                                  ? "text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/30" 
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                }
                                onClick={() => toggleFavorite(selectedNote)}
                              >
                                <Heart className={`h-5 w-5 ${selectedNote.is_favorite ? 'fill-red-500 dark:fill-red-400' : ''}`} />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => setEditMode(true)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/30"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Bible Study Note</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this note? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => selectedNote.id && handleDeleteNote(selectedNote.id)}
                                      className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-sm font-medium text-muted-foreground mt-2">
                        {editMode ? (
                          <Input
                            value={selectedNote.scripture_reference}
                            onChange={e => setSelectedNote(prev => ({ ...prev!, scripture_reference: e.target.value }))}
                          />
                        ) : (
                          selectedNote.scripture_reference
                        )}
                      </div>
                      {selectedNote.created_at && (
                        <div className="text-xs text-muted-foreground flex items-center mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          Created: {format(new Date(selectedNote.created_at), 'MMMM d, yyyy')}
                        </div>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground mb-2">Notes</h3>
                          {editMode ? (
                            <Textarea
                              value={selectedNote.content}
                              onChange={e => setSelectedNote(prev => ({ ...prev!, content: e.target.value }))}
                              rows={12}
                            />
                          ) : (
                            <div className="prose dark:prose-invert max-w-none text-foreground/80 whitespace-pre-line">
                              {selectedNote.content}
                            </div>
                          )}
                        </div>
                        
                        {editMode ? (
                          <div className="space-y-2">
                            <h3 className="text-sm font-medium text-muted-foreground">Tags</h3>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {selectedNote.tags?.map((tag, index) => (
                                <Badge key={index} variant="outline" className="bg-muted/50">
                                  {tag}
                                  <button
                                    onClick={() => removeTag(tag, 'edit')}
                                    className="ml-1 text-muted-foreground hover:text-foreground"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Add a tag"
                                value={newTag}
                                onChange={e => setNewTag(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addTag('edit')}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => addTag('edit')}
                                size="sm"
                              >
                                Add
                              </Button>
                            </div>
                          </div>
                        ) : selectedNote.tags && selectedNote.tags.length > 0 && (
                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-2">Tags</h3>
                            <div className="flex flex-wrap gap-2">
                              {selectedNote.tags.map((tag, i) => (
                                <Badge key={i} variant="outline" className="bg-muted/50 text-muted-foreground">
                                  <Tag className="h-3 w-3 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {editMode && (
                          <div className="flex items-center space-x-2 pt-2">
                            <Switch
                              id="is_favorite_edit"
                              checked={selectedNote.is_favorite}
                              onCheckedChange={value => setSelectedNote(prev => ({ ...prev!, is_favorite: value }))}
                            />
                            <Label htmlFor="is_favorite_edit">Mark as favorite</Label>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      {!editMode && (
                        <Button 
                          variant="outline" 
                          className="w-full border-primary text-foreground hover:bg-muted"
                          onClick={() => setEditMode(true)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Note
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Book className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No note selected</h3>
                      <p className="text-muted-foreground">
                        Select a Bible study note to view details
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
          
          {/* AI Bible Studies Tab */}
          <TabsContent value="ai-studies" className="space-y-6">
            <AIBibleStudyGenerator onStudyGenerated={loadAIBibleStudies} />
            
            <div className="space-y-4">
              {isLoadingAIStudies ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground mt-2">Loading AI Bible studies...</p>
                </div>
              ) : aiBibleStudies.length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-foreground">Your AI Bible Studies</h2>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={loadAIBibleStudies}
                      className="flex items-center gap-2"
                    >
                      <Book className="h-4 w-4" />
                      <span>Refresh</span>
                    </Button>
                  </div>
                  
                  <div className="space-y-6">
                    {aiBibleStudies.map((study) => (
                      <AIBibleStudyCard
                        key={study.id}
                        study={study}
                        onUpdate={loadAIBibleStudies}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <Sparkles className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No AI Bible studies yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Generate your first AI-powered Bible study tailored to your spiritual journey
                  </p>
                  <Button 
                    onClick={() => {
                      const generator = document.querySelector('.bible-study-generator');
                      generator?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    variant="secondary"
                    className="text-secondary-foreground"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create My First Bible Study
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* New Sermon Analysis Tab */}
          <TabsContent value="sermons" className="space-y-6">
            {showSermonUpload ? (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-xl">Upload Sermon</CardTitle>
                      <CardDescription>
                        Upload audio or video files for AI transcription and analysis
                      </CardDescription>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowSermonUpload(false)}
                    >
                      Back to Sermons
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <SermonUploadForm onUploadComplete={handleSermonUploadComplete} />
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-1/2 lg:w-2/5">
                  <SermonList onSelectSermon={setSelectedSermon} />
                </div>
                
                <div className="w-full md:w-1/2 lg:w-3/5">
                  {selectedSermon ? (
                    <SermonDetail 
                      sermon={selectedSermon} 
                      onDelete={handleDeleteSermon}
                    />
                  ) : (
                    <Card className="h-full flex items-center justify-center py-12">
                      <CardContent className="text-center">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">No Sermon Selected</h3>
                        <p className="text-muted-foreground mb-6">
                          Select a sermon to view its AI-generated summary and transcription,
                          or upload a new sermon for analysis.
                        </p>
                        <Button 
                          onClick={() => setShowSermonUpload(true)}
                          variant="secondary" 
                          className="text-secondary-foreground"
                        >
                          <UploadCloud className="mr-2 h-4 w-4" />
                          Upload New Sermon
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

export default BibleStudyPage;