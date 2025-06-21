import { useState, useEffect } from 'react';
import { 
  Users, 
  Hand, 
  BookOpen, 
  Calendar, 
  Settings, 
  Bell, 
  MessageSquare,
  UserPlus,
  Copy,
  Clock,
  Lock,
  Globe,
  ChevronLeft,
  LogOut,
  ArrowRight,
  PlusCircle,
  Target,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { 
  type FaithCommunity,
  type CommunityMember,
  getCommunityMembers,
  leaveCommunity,
  updateFaithCommunity
} from '@/lib/communities';
import { PrayerRequestList } from './PrayerRequestList';
import { ReadingPlanList } from './ReadingPlanList';
import { ChallengeList } from './ChallengeList';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { InviteMembersDialog } from './InviteMembersDialog';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

interface CommunityDetailProps {
  community: FaithCommunity;
  onBack: () => void;
  onUpdate?: () => void;
}

export function CommunityDetail({ community, onBack, onUpdate }: CommunityDetailProps) {
  const [activeTab, setActiveTab] = useState('prayer');
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [editedCommunity, setEditedCommunity] = useState<FaithCommunity>({...community});
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (community.id) {
      loadCommunityData();
    }
  }, [community.id]);
  
  useEffect(() => {
    setEditedCommunity({...community});
  }, [community]);

  const loadCommunityData = async () => {
    setIsLoading(true);
    try {
      const memberData = await getCommunityMembers(community.id!);
      setMembers(memberData);
      
      // Determine current user's role
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const currentMember = memberData.find(m => m.user_id === data.user?.id);
        if (currentMember) {
          setUserRole(currentMember.role);
        }
      }
    } catch (error) {
      console.error('Error loading community data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load community data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyJoinCode = () => {
    if (community.join_code) {
      navigator.clipboard.writeText(community.join_code);
      toast({
        title: 'Copied!',
        description: 'Join code copied to clipboard',
      });
    }
  };

  const handleLeaveCommunity = async () => {
    if (!community.id) return;
    
    setIsLeaving(true);
    try {
      await leaveCommunity(community.id);
      toast({
        title: 'Left Community',
        description: 'You have successfully left this community',
      });
      onBack(); // Go back to community list
      if (onUpdate) onUpdate();
    } catch (error: any) {
      console.error('Error leaving community:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to leave community',
        variant: 'destructive',
      });
    } finally {
      setIsLeaving(false);
    }
  };

  const handleManageCommunity = () => {
    setIsManageDialogOpen(true);
  };

  const handleSaveCommunity = async () => {
    if (!editedCommunity.id) return;
    
    setIsSaving(true);
    try {
      // Create a clean update object with only the database columns
      const updateData = {
        name: editedCommunity.name,
        description: editedCommunity.description,
        image_url: editedCommunity.image_url,
        is_private: editedCommunity.is_private,
        member_limit: editedCommunity.member_limit,
        // Exclude computed/joined properties like members, member_count, etc.
      };
      
      await updateFaithCommunity(editedCommunity.id, updateData);
      
      toast({
        title: 'Community Updated',
        description: 'Community settings have been updated successfully',
      });
      
      // Update the community data
      if (onUpdate) onUpdate();
      setIsManageDialogOpen(false);
    } catch (error: any) {
      console.error('Error updating community:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update community settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Community Header - Made more responsive */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex items-start gap-2 w-full">
          <Button variant="outline" size="icon" onClick={onBack} className="shrink-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground truncate">{community.name}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant={community.is_private ? "outline" : "secondary"} className="whitespace-nowrap">
                {community.is_private ? (
                  <><Lock className="h-3 w-3 mr-1" /> Private</>
                ) : (
                  <><Globe className="h-3 w-3 mr-1" /> Public</>
                )}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {community.member_count || members.length} members
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
          {userRole === 'admin' && (
            <Button 
              variant="outline" 
              className="sm:whitespace-nowrap"
              onClick={handleManageCommunity}
            >
              <Settings className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Manage</span>
              <span className="sm:hidden">Manage</span>
            </Button>
          )}
          
          {userRole && (
            <Button 
              variant="outline" 
              className="text-destructive hover:bg-destructive/10 sm:whitespace-nowrap"
              onClick={handleLeaveCommunity}
              disabled={isLeaving}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isLeaving ? 'Leaving...' : 'Leave'}
            </Button>
          )}
        </div>
      </div>
      
      {/* Community Description - Made responsive */}
      {community.description && (
        <Card>
          <CardContent className="py-4">
            <p className="text-foreground break-words">{community.description}</p>
          </CardContent>
        </Card>
      )}
      
      {/* Join Code Card - Made more responsive */}
      {community.is_private && community.join_code && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-medium text-primary flex items-center">
                <Lock className="h-4 w-4 mr-2" />
                Community Join Code
              </h3>
              <p className="text-primary/80 text-sm mt-1">
                Share this code with others you'd like to invite
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="bg-background px-3 py-1.5 rounded border border-border font-mono text-lg overflow-x-auto max-w-[120px] sm:max-w-none">
                {community.join_code}
              </div>
              <Button variant="outline" size="icon" onClick={handleCopyJoinCode} className="shrink-0">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Tabs - Made more responsive */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="prayer" className="px-2 sm:px-4">
            <Hand className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Prayer</span>
          </TabsTrigger>
          <TabsTrigger value="reading" className="px-2 sm:px-4">
            <BookOpen className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Reading</span>
          </TabsTrigger>
          <TabsTrigger value="challenges" className="px-2 sm:px-4">
            <Target className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Challenges</span>
          </TabsTrigger>
          <TabsTrigger value="members" className="px-2 sm:px-4">
            <Users className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Members</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="prayer">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <CardTitle className="text-xl">Prayer Requests</CardTitle>
              </div>
              <CardDescription>
                Share and pray for community prayer requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PrayerRequestList communityId={community.id!} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="reading">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <CardTitle className="text-xl">Reading Plans</CardTitle>
              </div>
              <CardDescription>
                Synchronized reading plans for your community
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReadingPlanList communityId={community.id!} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="challenges">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <CardTitle className="text-xl">Community Challenges</CardTitle>
              </div>
              <CardDescription>
                Set spiritual goals and complete them together
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChallengeList communityId={community.id!} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="members">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <CardTitle className="text-xl">Members</CardTitle>
                <InviteMembersDialog 
                  communityId={community.id} 
                  joinCode={community.join_code}
                />
              </div>
              <CardDescription>
                Community members and roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : members.length > 0 ? (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarFallback>
                              {member.profiles?.display_name?.[0] || 
                               member.profiles?.first_name?.[0] || 
                               'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {member.profiles?.display_name || 
                               `${member.profiles?.first_name || ''} ${member.profiles?.last_name || ''}`.trim() || 
                               'User'}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center truncate">
                              <Clock className="h-3 w-3 mr-1 shrink-0" />
                              <span className="truncate">
                                Joined {member.joined_at && format(new Date(member.joined_at), 'MMM d, yyyy')}
                              </span>
                            </p>
                          </div>
                        </div>
                        <Badge variant={
                          member.role === 'admin' ? 'default' : 
                          member.role === 'moderator' ? 'secondary' : 
                          'outline'
                        } className="ml-2 shrink-0">
                          {member.role === 'admin' ? (
                            <><ShieldCheck className="h-3 w-3 mr-1" /> Admin</>
                          ) : member.role === 'moderator' ? (
                            <><ShieldCheck className="h-3 w-3 mr-1" /> Mod</>
                          ) : (
                            'Member'
                          )}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No members yet</h3>
                  <p className="text-muted-foreground">Invite others to join your community</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Manage Community Dialog */}
      <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Manage Community</DialogTitle>
            <DialogDescription>
              Update your community settings and details
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="community-name">Community Name</Label>
              <Input 
                id="community-name" 
                value={editedCommunity.name || ''} 
                onChange={e => setEditedCommunity(prev => ({...prev, name: e.target.value}))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="community-description">Description</Label>
              <Textarea 
                id="community-description" 
                value={editedCommunity.description || ''} 
                onChange={e => setEditedCommunity(prev => ({...prev, description: e.target.value}))}
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="community-image">Community Image URL (Optional)</Label>
              <Input 
                id="community-image" 
                value={editedCommunity.image_url || ''} 
                onChange={e => setEditedCommunity(prev => ({...prev, image_url: e.target.value}))}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            
            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="is-private"
                checked={editedCommunity.is_private}
                onCheckedChange={value => setEditedCommunity(prev => ({...prev, is_private: value}))}
              />
              <Label htmlFor="is-private">Private Community</Label>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="member-limit">Member Limit</Label>
              <Input 
                id="member-limit" 
                type="number"
                min={5}
                value={editedCommunity.member_limit || 50} 
                onChange={e => setEditedCommunity(prev => ({...prev, member_limit: parseInt(e.target.value)}))}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManageDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveCommunity}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}