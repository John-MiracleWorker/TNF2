import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, Plus, Settings, ExternalLink, Shield, UserPlus, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  FaithCommunity, 
  getUserCommunities, 
  getPublicCommunities
} from '@/lib/communities';
import { format } from 'date-fns';
import { CreateCommunityDialog } from './CreateCommunityDialog';

interface CommunityListProps {
  onSelect: (community: FaithCommunity) => void;
  onCreateCommunity?: () => void;
}

export function CommunityList({ onSelect, onCreateCommunity }: CommunityListProps) {
  const [allCommunities, setAllCommunities] = useState<FaithCommunity[]>([]);
  const [myCommunities, setMyCommunities] = useState<FaithCommunity[]>([]);
  const [filteredCommunities, setFilteredCommunities] = useState<FaithCommunity[]>([]);
  const [activeTab, setActiveTab] = useState('my');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCommunities();
  }, []);

  useEffect(() => {
    filterCommunities();
  }, [searchQuery, activeTab, allCommunities, myCommunities]);

  const loadCommunities = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Using Promise.all to load both in parallel
      const [allCommunitiesData, myCommunitiesData] = await Promise.all([
        getPublicCommunities(),
        getUserCommunities()
      ]);
      
      setAllCommunities(allCommunitiesData);
      setMyCommunities(myCommunitiesData);
    } catch (error) {
      console.error('Error loading communities:', error);
      setError('Failed to load communities. ' + (error instanceof Error ? error.message : String(error)));
      
      toast({
        title: 'Error',
        description: 'Failed to load communities. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterCommunities = () => {
    const source = activeTab === 'my' ? myCommunities : allCommunities;
    
    if (searchQuery.trim() === '') {
      setFilteredCommunities(source);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = source.filter(
      community => 
        community.name.toLowerCase().includes(query) ||
        (community.description && community.description.toLowerCase().includes(query))
    );
    
    setFilteredCommunities(filtered);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      filterCommunities();
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // For now, just use the existing public communities and filter them locally
      const results = await getPublicCommunities();
      setAllCommunities(results);
      setActiveTab('all'); // Switch to all tab to show search results
      // The filtering will happen automatically via the useEffect
    } catch (error) {
      console.error('Error searching communities:', error);
      setError('Search failed. Please try again.');
      
      toast({
        title: 'Search Error',
        description: 'Failed to search communities.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCommunity = (newCommunity: FaithCommunity) => {
    setMyCommunities(prev => [newCommunity, ...prev]);
    setActiveTab('my');
    
    toast({
      title: 'Community Created',
      description: `"${newCommunity.name}" has been created successfully!`,
    });
    
    if (onCreateCommunity) {
      onCreateCommunity();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Faith Communities</h2>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">New Community</span>
          <span className="sm:hidden">New</span>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <div className="mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={loadCommunities}
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search communities..."
            className="pl-9"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Button onClick={handleSearch} disabled={isLoading} className="sm:w-auto w-full">
          <Search className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Search</span>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>My Communities</span>
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            <span>Discover</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : myCommunities.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {(searchQuery ? filteredCommunities : myCommunities).map((community) => (
                <motion.div
                  key={community.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card
                    className="cursor-pointer hover:shadow-md transition-shadow h-full"
                    onClick={() => onSelect(community)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap justify-between gap-2">
                        <CardTitle className="text-foreground text-lg mr-2">{community.name}</CardTitle>
                        {community.is_private && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 shrink-0">
                            <Shield className="h-3 w-3 mr-1" />
                            Private
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="line-clamp-2 mt-1">
                        {community.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <Badge variant="outline" className="bg-muted/50">
                          <Users className="h-3 w-3 mr-1" />
                          {community.member_count} members
                        </Badge>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          Created {format(new Date(community.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button variant="ghost" size="sm" className="ml-auto" onClick={(e) => {
                        e.stopPropagation();
                        onSelect(community);
                      }}>
                        <span className="hidden sm:inline">Open</span>
                        <span className="sm:hidden">View</span>
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="bg-muted/20 border-dashed">
              <CardContent className="py-12 flex flex-col items-center justify-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Communities Yet</h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  You're not a member of any faith communities yet. Join existing ones or create your own!
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button variant="outline" onClick={() => setActiveTab('all')}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Find Communities
                  </Button>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create New
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : allCommunities.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {(searchQuery ? filteredCommunities : allCommunities)
                .filter(c => !myCommunities.some(myC => myC.id === c.id)) // Filter out communities the user is already in
                .map((community) => (
                <motion.div
                  key={community.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card
                    className="cursor-pointer hover:shadow-md transition-shadow h-full"
                    onClick={() => onSelect(community)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap justify-between gap-2">
                        <CardTitle className="text-foreground text-lg mr-2">{community.name}</CardTitle>
                        {community.is_private && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 shrink-0">
                            <Shield className="h-3 w-3 mr-1" />
                            Private
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="line-clamp-2 mt-1">
                        {community.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <Badge variant="outline" className="bg-muted/50">
                          <Users className="h-3 w-3 mr-1" />
                          {community.member_count} members
                        </Badge>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          Created {format(new Date(community.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button variant="ghost" size="sm" className="ml-auto" onClick={(e) => {
                        e.stopPropagation();
                        onSelect(community);
                      }}>
                        <span className="hidden sm:inline">View Details</span>
                        <span className="sm:hidden">View</span>
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="bg-muted/20 border-dashed">
              <CardContent className="py-12 flex flex-col items-center justify-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Communities Found</h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  {searchQuery ? `No communities match "${searchQuery}"` : "No public communities available yet"}
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Community
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <CreateCommunityDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCommunityCreated={handleCreateCommunity}
      />
    </div>
  );
}

export default CommunityList;