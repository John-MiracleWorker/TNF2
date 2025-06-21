import { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { Hand, Search, Plus, Tag, Calendar, Edit, Trash2, Heart, Users, Filter, Check, X, Share2, MessageSquare } from 'lucide-react';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CommunityPrayerList } from '@/components/prayer/CommunityPrayerList';
import { useToast } from '@/hooks/use-toast';
import { getPrayerRequests, savePrayerRequest, updatePrayerRequest, deletePrayerRequest } from '@/lib/supabase';
import { PrayerRequest } from '@/lib/types';
import { format } from 'date-fns';
import { AuthContext } from '@/App';

const PrayerPage = () => {
  const { session } = useContext(AuthContext);
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [filteredPrayers, setFilteredPrayers] = useState<PrayerRequest[]>([]);
  const [activeTab, setActiveTab] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerRequest | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [newPrayer, setNewPrayer] = useState<PrayerRequest>({
    title: '',
    description: '',
    is_answered: false,
    shared: false,
    tags: []
  });
  const [newTag, setNewTag] = useState('');
  const [activeSection, setActiveSection] = useState('my-prayers');
  const { toast } = useToast();

  useEffect(() => {
    if (session) {
      loadPrayers();
    }
  }, [session]);

  useEffect(() => {
    filterPrayers();
  }, [prayers, searchQuery, activeTab]);

  const loadPrayers = async () => {
    if (!session) return;
    
    setIsLoading(true);
    try {
      const data = await getPrayerRequests();
      setPrayers(data);
      setFilteredPrayers(data.filter(p => !p.is_answered));
    } catch (error) {
      console.error('Error loading prayers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load prayer requests',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterPrayers = () => {
    let filtered = [...prayers];
    
    // Filter by tab
    if (activeTab === 'active') {
      filtered = filtered.filter(prayer => !prayer.is_answered);
    } else if (activeTab === 'answered') {
      filtered = filtered.filter(prayer => prayer.is_answered);
    }
    
    // Filter by search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        prayer => 
          prayer.title.toLowerCase().includes(query) ||
          prayer.description.toLowerCase().includes(query) ||
          (prayer.tags && prayer.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }
    
    setFilteredPrayers(filtered);
  };

  const handleCreatePrayer = async () => {
    if (!newPrayer.title.trim() || !newPrayer.description.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const savedPrayer = await savePrayerRequest(newPrayer);
      setPrayers(prev => [savedPrayer, ...prev]);
      
      setNewPrayer({
        title: '',
        description: '',
        is_answered: false,
        shared: false,
        tags: []
      });
      
      toast({
        title: 'Success',
        description: 'Prayer request created successfully',
      });
    } catch (error) {
      console.error('Error creating prayer request:', error);
      toast({
        title: 'Error',
        description: 'Failed to create prayer request',
        variant: 'destructive',
      });
    }
  };

  const handleUpdatePrayer = async () => {
    if (!selectedPrayer) return;
    
    try {
      const updatedPrayer = await updatePrayerRequest(selectedPrayer);
      setPrayers(prev => 
        prev.map(prayer => 
          prayer.id === updatedPrayer.id ? updatedPrayer : prayer
        )
      );
      
      setEditMode(false);
      toast({
        title: 'Success',
        description: 'Prayer request updated successfully',
      });
    } catch (error) {
      console.error('Error updating prayer request:', error);
      toast({
        title: 'Error',
        description: 'Failed to update prayer request',
        variant: 'destructive',
      });
    }
  };

  const handleDeletePrayer = async (id: string) => {
    try {
      await deletePrayerRequest(id);
      setPrayers(prev => prev.filter(prayer => prayer.id !== id));
      setSelectedPrayer(null);
      
      toast({
        title: 'Success',
        description: 'Prayer request deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting prayer request:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete prayer request',
        variant: 'destructive',
      });
    }
  };

  const handleMarkAnswered = async (prayer: PrayerRequest) => {
    try {
      const updatedPrayer: PrayerRequest = {
        ...prayer,
        is_answered: true,
        answered_date: new Date().toISOString()
      };
      
      const result = await updatePrayerRequest(updatedPrayer);
      setPrayers(prev => 
        prev.map(p => 
          p.id === result.id ? result : p
        )
      );
      
      if (selectedPrayer && selectedPrayer.id === prayer.id) {
        setSelectedPrayer(result);
      }
      
      toast({
        title: 'Praise God!',
        description: 'Prayer marked as answered',
      });
    } catch (error) {
      console.error('Error marking prayer as answered:', error);
      toast({
        title: 'Error',
        description: 'Failed to update prayer status',
        variant: 'destructive',
      });
    }
  };

  const addTag = (prayerState: 'new' | 'edit') => {
    if (!newTag.trim()) return;
    
    if (prayerState === 'new') {
      setNewPrayer(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()]
      }));
    } else if (selectedPrayer) {
      setSelectedPrayer(prev => ({
        ...prev!,
        tags: [...(prev!.tags || []), newTag.trim()]
      }));
    }
    
    setNewTag('');
  };

  const removeTag = (tag: string, prayerState: 'new' | 'edit') => {
    if (prayerState === 'new') {
      setNewPrayer(prev => ({
        ...prev,
        tags: prev.tags?.filter(t => t !== tag)
      }));
    } else if (selectedPrayer) {
      setSelectedPrayer(prev => ({
        ...prev!,
        tags: prev!.tags?.filter(t => t !== tag)
      }));
    }
  };

  const handleCommunityPrayerSelected = (prayer: PrayerRequest) => {
    setSelectedPrayer(prayer);
    setEditMode(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Prayer Requests</h1>
            <p className="text-muted-foreground">
              Track your prayers, celebrate answered ones, and pray for others
            </p>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary" className="text-secondary-foreground">
                <Plus className="mr-2 h-4 w-4" />
                New Prayer
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create Prayer Request</DialogTitle>
                <DialogDescription>
                  Add a new prayer request to your list
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Title for your prayer request"
                    value={newPrayer.title}
                    onChange={e => setNewPrayer(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what you're praying for..."
                    rows={5}
                    value={newPrayer.description}
                    onChange={e => setNewPrayer(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {newPrayer.tags?.map((tag, index) => (
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
                      className="shrink-0"
                    >
                      Add
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    id="shared"
                    checked={newPrayer.shared}
                    onCheckedChange={value => setNewPrayer(prev => ({ ...prev, shared: value }))}
                  />
                  <Label htmlFor="shared">Share with community</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Shared prayers are visible to other TrueNorth users who can pray for you
                </p>
              </div>
              
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button onClick={handleCreatePrayer}>Create Prayer</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        <Tabs value={activeSection} onValueChange={setActiveSection}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="my-prayers" className="flex items-center gap-2">
              <Hand className="h-4 w-4" />
              <span>My Prayers</span>
            </TabsTrigger>
            <TabsTrigger value="community" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Community</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="my-prayers" className="mt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-2/3 space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search prayers..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                
                {/* Tabs */}
                <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="active">Active</TabsTrigger>
                    <TabsTrigger value="answered">Answered</TabsTrigger>
                  </TabsList>
                </Tabs>
                
                {/* Prayer list */}
                <div className="space-y-4">
                  {isLoading ? (
                    <div className="py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-muted-foreground mt-2">Loading prayer requests...</p>
                    </div>
                  ) : filteredPrayers.length > 0 ? (
                    filteredPrayers.map((prayer) => (
                      <motion.div
                        key={prayer.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card 
                          className={`
                            hover:shadow-md transition-shadow cursor-pointer
                            ${prayer.is_answered ? 'border-l-4 border-l-green-500' : ''}
                          `}
                          onClick={() => {
                            setSelectedPrayer(prayer);
                            setEditMode(false);
                          }}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-foreground flex items-center space-x-2">
                                  {prayer.is_answered && (
                                    <Badge className="mr-2 bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800">
                                      Answered
                                    </Badge>
                                  )}
                                  {prayer.title}
                                </CardTitle>
                              </div>
                              
                              <div>
                                <Badge 
                                  variant="outline" 
                                  className={`
                                    ${prayer.shared 
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                      : 'bg-muted text-muted-foreground'}
                                  `}
                                >
                                  {prayer.shared ? (
                                    <>
                                      <Share2 className="h-3 w-3 mr-1" />
                                      Shared
                                    </>
                                  ) : (
                                    <>
                                      <Users className="h-3 w-3 mr-1" />
                                      Private
                                    </>
                                  )}
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pb-2">
                            <p className="text-foreground/80 line-clamp-2">{prayer.description}</p>
                          </CardContent>
                          <CardFooter className="flex justify-between">
                            <div className="flex flex-wrap gap-1">
                              {prayer.tags && prayer.tags.map((tag, i) => (
                                <Badge key={i} variant="outline" className="bg-muted/50 text-muted-foreground">
                                  <Tag className="h-3 w-3 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {prayer.created_at && format(new Date(prayer.created_at), 'MMM d, yyyy')}
                            </div>
                          </CardFooter>
                        </Card>
                      </motion.div>
                    ))
                  ) : (
                    <div className="py-12 text-center">
                      <Hand className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No prayer requests found</h3>
                      <p className="text-muted-foreground mb-6">
                        {searchQuery.trim() !== '' 
                          ? "No prayers match your search criteria"
                          : activeTab === 'answered'
                            ? "You don't have any answered prayers yet"
                            : activeTab === 'active'
                              ? "You don't have any active prayers"
                              : "Start by adding your first prayer request"
                        }
                      </p>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Prayer Request
                          </Button>
                        </DialogTrigger>
                        {/* Dialog content is the same as above */}
                      </Dialog>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Prayer detail view */}
              <div className="w-full md:w-1/3">
                {selectedPrayer ? (
                  <Card className="sticky top-4">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-foreground">
                          {editMode ? (
                            <Input
                              value={selectedPrayer.title}
                              onChange={e => setSelectedPrayer(prev => ({ ...prev!, title: e.target.value }))}
                              className="mt-1"
                            />
                          ) : (
                            selectedPrayer.title
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
                                onClick={handleUpdatePrayer}
                              >
                                Save
                              </Button>
                            </>
                          ) : (
                            <>
                              {!selectedPrayer.is_answered && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200 hover:text-green-900 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800 dark:hover:bg-green-800/50"
                                  onClick={() => handleMarkAnswered(selectedPrayer)}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Mark Answered
                                </Button>
                              )}
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
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 dark:text-red-400 dark:hover:text-red-300"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Prayer Request</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this prayer request? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => selectedPrayer.id && handleDeletePrayer(selectedPrayer.id)}
                                      className="bg-red-500 hover:bg-red-600 dark:bg-red-700 dark:hover:bg-red-800"
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
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground mb-2">Details</h3>
                          {editMode ? (
                            <Textarea
                              value={selectedPrayer.description}
                              onChange={e => setSelectedPrayer(prev => ({ ...prev!, description: e.target.value }))}
                              rows={5}
                            />
                          ) : (
                            <p className="text-foreground whitespace-pre-line">
                              {selectedPrayer.description}
                            </p>
                          )}
                        </div>
                        
                        {selectedPrayer.is_answered && (
                          <div className="bg-green-100 rounded-lg p-4 dark:bg-green-900/20 dark:border dark:border-green-800">
                            <h3 className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">Answered</h3>
                            {editMode ? (
                              <Textarea
                                value={selectedPrayer.answered_notes || ''}
                                onChange={e => setSelectedPrayer(prev => ({ ...prev!, answered_notes: e.target.value }))}
                                placeholder="Add notes about how this prayer was answered..."
                                rows={3}
                                className="mt-2"
                              />
                            ) : (
                              <>
                                {selectedPrayer.answered_date && (
                                  <p className="text-sm text-green-700 dark:text-green-400 flex items-center">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    Answered on {format(new Date(selectedPrayer.answered_date), 'MMMM d, yyyy')}
                                  </p>
                                )}
                                {selectedPrayer.answered_notes && (
                                  <div className="mt-2 text-green-800 dark:text-green-300">
                                    <p>{selectedPrayer.answered_notes}</p>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                        
                        {editMode ? (
                          <div className="space-y-2">
                            <h3 className="text-sm font-medium text-muted-foreground">Tags</h3>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {selectedPrayer.tags?.map((tag, index) => (
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
                        ) : selectedPrayer.tags && selectedPrayer.tags.length > 0 && (
                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-2">Tags</h3>
                            <div className="flex flex-wrap gap-2">
                              {selectedPrayer.tags.map((tag, i) => (
                                <Badge key={i} variant="outline" className="bg-muted/50 text-muted-foreground">
                                  <Tag className="h-3 w-3 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between pt-2">
                          <div className="text-sm text-muted-foreground">
                            Created: {selectedPrayer.created_at ? format(new Date(selectedPrayer.created_at), 'MMM d, yyyy') : 'Today'}
                          </div>
                          
                          {editMode && (
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="shared_edit"
                                checked={selectedPrayer.shared}
                                onCheckedChange={value => setSelectedPrayer(prev => ({ ...prev!, shared: value }))}
                              />
                              <Label htmlFor="shared_edit" className="cursor-pointer">Share with community</Label>
                            </div>
                          )}
                          
                          {!editMode && (
                            <Badge 
                              variant="outline" 
                              className={`
                                ${selectedPrayer.shared 
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                  : 'bg-muted text-muted-foreground'}
                              `}
                            >
                              {selectedPrayer.shared ? (
                                <>
                                  <Share2 className="h-3 w-3 mr-1" />
                                  Shared
                                </>
                              ) : (
                                <>
                                  <Users className="h-3 w-3 mr-1" />
                                  Private
                                </>
                              )}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                    
                    {!selectedPrayer.is_answered && !editMode && (
                      <CardFooter>
                        <Button 
                          className="w-full"
                          onClick={() => handleMarkAnswered(selectedPrayer)}
                          variant="default"
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Mark as Answered
                        </Button>
                      </CardFooter>
                    )}
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Hand className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No prayer selected</h3>
                      <p className="text-muted-foreground">
                        Select a prayer request to view details
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="community" className="mt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-2/3">
                <CommunityPrayerList onSelectRequest={handleCommunityPrayerSelected} />
              </div>
              
              <div className="w-full md:w-1/3">
                {selectedPrayer ? (
                  <Card className="sticky top-4">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-foreground flex items-center space-x-2">
                          {selectedPrayer.is_answered && (
                            <Badge className="mr-2 bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800">
                              Answered
                            </Badge>
                          )}
                          {selectedPrayer.title}
                        </CardTitle>
                        
                        <Badge 
                          variant="outline" 
                          className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                        >
                          <Users className="h-3 w-3 mr-1" />
                          Community
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground mt-1">
                        From: {selectedPrayer.profiles?.display_name || selectedPrayer.profiles?.first_name || 'Anonymous'}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <p className="text-foreground whitespace-pre-line">
                            {selectedPrayer.description}
                          </p>
                        </div>
                        
                        {selectedPrayer.is_answered && (
                          <div className="bg-green-100 rounded-lg p-4 dark:bg-green-900/20 dark:border dark:border-green-800">
                            <h3 className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">Answered Prayer</h3>
                            {selectedPrayer.answered_date && (
                              <p className="text-sm text-green-700 dark:text-green-400 flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                Answered on {format(new Date(selectedPrayer.answered_date), 'MMMM d, yyyy')}
                              </p>
                            )}
                            {selectedPrayer.answered_notes && (
                              <div className="mt-2 text-green-800 dark:text-green-300">
                                <p>{selectedPrayer.answered_notes}</p>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {selectedPrayer.tags && selectedPrayer.tags.length > 0 && (
                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-2">Tags</h3>
                            <div className="flex flex-wrap gap-2">
                              {selectedPrayer.tags.map((tag, i) => (
                                <Badge key={i} variant="outline" className="bg-muted/50 text-muted-foreground">
                                  <Tag className="h-3 w-3 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between pt-2">
                          <div className="text-sm text-muted-foreground">
                            Created: {selectedPrayer.created_at ? format(new Date(selectedPrayer.created_at), 'MMM d, yyyy') : 'Today'}
                          </div>
                          
                          {selectedPrayer.prayer_count !== undefined && selectedPrayer.prayer_count > 0 && (
                            <Badge variant="outline" className="bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800">
                              <Heart className="h-3 w-3 mr-1 fill-rose-500 dark:fill-rose-400" />
                              {selectedPrayer.prayer_count} {selectedPrayer.prayer_count === 1 ? 'prayer' : 'prayers'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                    
                    <CardFooter>
                      <Button 
                        variant="default"
                        className="w-full"
                        onClick={() => {
                          // Add prayer interaction logic here
                          toast({
                            title: 'Prayer Recorded',
                            description: 'Thank you for praying for this request',
                          });
                        }}
                      >
                        <Heart className="mr-2 h-4 w-4" />
                        Pray for This
                      </Button>
                    </CardFooter>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No prayer selected</h3>
                      <p className="text-muted-foreground">
                        Select a community prayer request to view details
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default PrayerPage;