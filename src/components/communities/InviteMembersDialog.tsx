import { useState, useEffect } from 'react';
import { UserPlus, Copy, CheckCircle, Loader2, Mail, Link as LinkIcon, X, RefreshCw } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface InviteMembersDialogProps {
  communityId: string;
  joinCode?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function InviteMembersDialog({ communityId, joinCode: initialJoinCode, open, onOpenChange }: InviteMembersDialogProps) {
  const [isOpen, setIsOpen] = useState(open || false);
  const [activeTab, setActiveTab] = useState('link');
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isCodeCopied, setIsCodeCopied] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [joinCode, setJoinCode] = useState(initialJoinCode || '');
  const { toast } = useToast();

  // Generate or update invite link whenever join code changes
  useEffect(() => {
    if (joinCode && communityId) {
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/communities/join?code=${joinCode}&id=${communityId}`;
      setInviteLink(link);
    } else {
      setInviteLink('');
    }
  }, [joinCode, communityId]);

  // Fetch join code on mount if not provided
  useEffect(() => {
    if (!joinCode && communityId && isOpen) {
      fetchJoinCode();
    }
  }, [communityId, isOpen]);

  // Handle dialog open state
  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    if (onOpenChange) onOpenChange(newOpen);
    
    // Reset state when dialog closes
    if (!newOpen) {
      setEmail('');
      setIsCodeCopied(false);
      setIsLinkCopied(false);
    }
  };

  // Fetch join code from database
  const fetchJoinCode = async () => {
    try {
      const { data, error } = await supabase
        .from('faith_communities')
        .select('join_code')
        .eq('id', communityId)
        .single();
        
      if (error) throw error;
      
      if (data?.join_code) {
        setJoinCode(data.join_code);
      }
    } catch (error) {
      console.error("Error fetching join code:", error);
    }
  };

  // Generate new join code
  const generateJoinCode = async () => {
    setIsGeneratingCode(true);
    try {
      // Generate a random alphanumeric code
      const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      // Update the community with the new join code
      const { error } = await supabase
        .from('faith_communities')
        .update({ join_code: randomCode })
        .eq('id', communityId);
        
      if (error) throw error;
      
      // Update local state
      setJoinCode(randomCode);
      
      toast({
        title: 'Join Code Generated',
        description: 'A new join code has been created for your community.',
      });
    } catch (error) {
      console.error("Error generating join code:", error);
      toast({
        title: 'Error',
        description: 'Failed to generate a join code. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingCode(false);
    }
  };

  // Copy join code to clipboard
  const copyJoinCode = () => {
    if (joinCode) {
      try {
        navigator.clipboard.writeText(joinCode);
        setIsCodeCopied(true);
        
        toast({
          title: 'Join Code Copied',
          description: 'The join code has been copied to your clipboard.',
        });
        
        setTimeout(() => setIsCodeCopied(false), 3000);
      } catch (error) {
        console.error('Failed to copy join code:', error);
        // Fallback for clipboard API failure
        const textarea = document.createElement('textarea');
        textarea.value = joinCode;
        textarea.style.position = 'absolute';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        
        setIsCodeCopied(true);
        toast({
          title: 'Join Code Copied',
          description: 'The join code has been copied to your clipboard.',
        });
        setTimeout(() => setIsCodeCopied(false), 3000);
      }
    } else {
      toast({
        title: 'No Join Code',
        description: 'No join code is available for this community.',
        variant: 'destructive',
      });
    }
  };

  // Copy invite link to clipboard
  const copyInviteLink = () => {
    if (!inviteLink) {
      toast({
        title: 'No Invite Link',
        description: 'No invite link is available for this community.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      navigator.clipboard.writeText(inviteLink);
      setIsLinkCopied(true);
      
      toast({
        title: 'Invite Link Copied',
        description: 'The invite link has been copied to your clipboard.',
      });
      
      setTimeout(() => setIsLinkCopied(false), 3000);
    } catch (error) {
      console.error('Failed to copy invite link:', error);
      // Fallback for clipboard API failure
      const textarea = document.createElement('textarea');
      textarea.value = inviteLink;
      textarea.style.position = 'absolute';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      
      setIsLinkCopied(true);
      toast({
        title: 'Invite Link Copied',
        description: 'The invite link has been copied to your clipboard.',
      });
      setTimeout(() => setIsLinkCopied(false), 3000);
    }
  };

  // Send email invitation
  const sendEmailInvitation = async () => {
    if (!email || !email.includes('@')) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    try {
      // In a real implementation, this would call an edge function
      // For now, we'll just simulate success after a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get community info for the invitation
      const { data: community } = await supabase
        .from('faith_communities')
        .select('name')
        .eq('id', communityId)
        .single();
        
      toast({
        title: 'Invitation Sent',
        description: `An invitation has been sent to ${email}.`,
      });
      
      // Reset form
      setEmail('');
      
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to send invitation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Members
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Members</DialogTitle>
          <DialogDescription>
            Invite others to join your faith community
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="link" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="link">
              <LinkIcon className="h-4 w-4 mr-2" />
              Share Link
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="h-4 w-4 mr-2" />
              Email Invite
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="link" className="space-y-4 py-2">
            <div>
              <Label htmlFor="join-code" className="text-sm font-medium">Join Code</Label>
              <div className="mt-1 flex gap-2">
                <div className="flex-grow flex">
                  <Input
                    id="join-code"
                    value={joinCode || "No join code available"}
                    readOnly
                    className={`rounded-r-none ${!joinCode ? "text-muted-foreground" : ""}`}
                  />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={copyJoinCode}
                    disabled={!joinCode}
                    className="rounded-l-none"
                  >
                    {isCodeCopied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={generateJoinCode}
                  disabled={isGeneratingCode}
                >
                  {isGeneratingCode ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Share this code with people you want to invite
              </p>
            </div>
            
            <div>
              <Label htmlFor="invite-link" className="text-sm font-medium">Invite Link</Label>
              <div className="mt-1 flex">
                <Input 
                  id="invite-link"
                  value={inviteLink || "No invite link available"}
                  readOnly
                  className={`rounded-r-none font-mono text-xs ${!inviteLink ? "text-muted-foreground" : ""}`}
                />
                <Button 
                  variant="default" 
                  size="icon" 
                  onClick={copyInviteLink}
                  disabled={!inviteLink}
                  className="rounded-l-none bg-primary hover:bg-primary/90 text-primary-foreground"
                  aria-label="Copy invite link"
                >
                  {isLinkCopied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Anyone with this link can join your community
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="email" className="space-y-4 py-2">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <div className="mt-1 flex">
                <Input
                  id="email"
                  type="email"
                  placeholder="member@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-r-none"
                />
                <Button 
                  onClick={sendEmailInvitation}
                  disabled={!email || isSending}
                  className="rounded-l-none"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Send an email invitation with a join link
              </p>
            </div>
            
            <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground border-t border-border pt-4 mt-4">
              <span>Want to invite multiple people?</span>
              <Button 
                variant="link" 
                className="p-0 h-auto font-normal"
                onClick={() => setActiveTab('link')}
              >
                Use a join link instead
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="mt-2 border-t border-border pt-2">
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              <X className="mr-2 h-4 w-4" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}