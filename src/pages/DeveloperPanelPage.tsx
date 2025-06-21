import { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Users, 
  Bell, 
  Database, 
  Loader2, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  UserPlus,
  Trash2,
  AlertCircle,
  Youtube,
  FileText
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { createTestNotification } from '@/lib/notifications';
import { AutoSermonProcessor } from '@/components/ui/AutoSermonProcessor';

const DeveloperPanelPage = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isGeneratingNotification, setIsGeneratingNotification] = useState(false);
  const [isTriggeringBatch, setIsTriggeringBatch] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasCheckedAdmin, setHasCheckedAdmin] = useState(false);
  const { toast } = useToast();

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // Get user profile to check if they're an admin
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();
          
        if (!error && profile) {
          setIsAdmin(profile.is_admin === true || user.email === 'tiuni65@gmail.com');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      } finally {
        setHasCheckedAdmin(true);
      }
    };
    
    checkAdmin();
  }, []);

  // Only try to load users when the users tab is active and the user is admin
  useEffect(() => {
    if (activeTab === 'users' && isAdmin && hasCheckedAdmin) {
      loadUsers();
    }
  }, [activeTab, isAdmin, hasCheckedAdmin]);

  const loadUsers = async () => {
    if (!isAdmin) {
      setLoadError('You do not have administrator privileges.');
      return;
    }

    setIsLoadingUsers(true);
    setLoadError(null);
    
    try {
      // Query the profiles table directly (no admin functions)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, display_name, created_at, last_active');
        
      if (profilesError) {
        throw profilesError;
      }
      
      // Format the data to match what the UI expects
      setUsers(profiles.map((profile: any) => ({
        id: profile.id,
        email: profile.display_name || profile.first_name || `User ${profile.id.slice(0, 8)}`,
        created_at: profile.created_at,
        last_sign_in_at: profile.last_active,
        confirmed_at: profile.created_at, // Assume confirmed since they have a profile
      })));
      
    } catch (error: any) {
      console.error('Error loading users:', error);
      setLoadError(error.message || 'Failed to load users. You may not have access to user data.');
      setUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleCreateUser = async () => {
    if (!isAdmin) {
      toast({
        title: 'Permission Denied',
        description: 'You do not have administrator privileges.',
        variant: 'destructive',
      });
      return;
    }

    if (!newUserEmail || !newUserPassword) {
      toast({
        title: 'Error',
        description: 'Email and password are required',
        variant: 'destructive',
      });
      return;
    }

    setIsCreatingUser(true);
    try {
      // Show message about limited functionality in development
      toast({
        title: 'Limited Functionality',
        description: 'User creation requires server-side admin privileges. This feature is not available in the client-side environment.',
        variant: 'default',
      });

      // Reset form
      setNewUserEmail('');
      setNewUserPassword('');
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser || !isAdmin) return;

    setIsDeleting(true);
    try {
      toast({
        title: 'Limited Functionality',
        description: 'User deletion requires server-side admin privileges. This feature is not available in the client-side environment.',
        variant: 'default',
      });

      setSelectedUser(null);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGenerateTestNotification = async () => {
    setIsGeneratingNotification(true);
    try {
      const result = await createTestNotification();
      
      if (result) {
        toast({
          title: 'Success',
          description: 'Test notification created successfully',
        });
      } else {
        throw new Error('Failed to create test notification');
      }
    } catch (error) {
      console.error('Error creating test notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to create test notification',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingNotification(false);
    }
  };

  const handleTriggerBatchNotifications = async () => {
    setIsTriggeringBatch(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase configuration');
      }
      
      // Get the current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('You must be logged in to trigger notifications');
      }

      const apiUrl = `${supabaseUrl}/functions/v1/generate-notifications`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'batch',
          force: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP error! status: ${response.status} - ${errorData.error || ''}`);
      }

      const result = await response.json();
      
      toast({
        title: 'Success',
        description: 'Batch notifications triggered successfully',
      });
      
      return result;
    } catch (error: any) {
      console.error('Error triggering notifications:', error);
      toast({
        title: 'Error',
        description: `Error triggering notifications: ${error.message}`,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsTriggeringBatch(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Developer Panel</h1>
          <p className="text-muted-foreground">
            Advanced tools and settings for development and testing
          </p>
        </div>
        
        {!hasCheckedAdmin ? (
          <Card className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </Card>
        ) : !isAdmin ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You do not have administrator privileges. This panel is only available to administrators.
            </AlertDescription>
          </Alert>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Users</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span>Notifications</span>
              </TabsTrigger>
              <TabsTrigger value="sermons" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>Sermons</span>
              </TabsTrigger>
              <TabsTrigger value="database" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span>Database</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="users" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <span>User Management</span>
                  </CardTitle>
                  <CardDescription>
                    View user profiles in the system (limited to profile data)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">User List</h3>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={loadUsers}
                          disabled={isLoadingUsers}
                        >
                          {isLoadingUsers ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                          )}
                          Refresh
                        </Button>
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" disabled>
                              <UserPlus className="h-4 w-4 mr-2" />
                              Create User
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Create New User</DialogTitle>
                              <DialogDescription>
                                User creation requires server-side admin privileges
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4 py-4">
                              <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                  This feature is not available in the client-side environment. 
                                  User creation requires server-side admin privileges.
                                </AlertDescription>
                              </Alert>
                            </div>
                            
                            <DialogFooter>
                              <Button disabled>
                                Not Available
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                    
                    {loadError && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{loadError}</AlertDescription>
                      </Alert>
                    )}
                    
                    {isLoadingUsers ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : users.length > 0 ? (
                      <div className="border rounded-md overflow-hidden">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Display Name</TableHead>
                                <TableHead>Created At</TableHead>
                                <TableHead>Last Active</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {users.map((user) => (
                                <TableRow key={user.id}>
                                  <TableCell className="font-medium">{user.email}</TableCell>
                                  <TableCell>
                                    {user.created_at ? new Date(user.created_at).toLocaleString() : 'N/A'}
                                  </TableCell>
                                  <TableCell>
                                    {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}
                                  </TableCell>
                                  <TableCell>
                                    {user.confirmed_at ? (
                                      <span className="flex items-center text-green-600">
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Active
                                      </span>
                                    ) : (
                                      <span className="flex items-center text-amber-600">
                                        <AlertTriangle className="h-4 w-4 mr-1" />
                                        Unknown
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      disabled
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 border rounded-md">
                        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">No Users Found</h3>
                        <p className="text-muted-foreground mb-4">
                          There are no user profiles in the system or you don't have permission to view them.
                        </p>
                        <Button onClick={loadUsers}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Retry
                        </Button>
                      </div>
                    )}
                    
                    <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900">
                      <AlertDescription>
                        <p className="text-blue-800 dark:text-blue-300 text-sm font-medium">
                          Client-Side Limitations
                        </p>
                        <p className="text-blue-700 dark:text-blue-400 text-sm mt-1">
                          This interface can only display user profile data. Administrative functions like 
                          user creation and deletion require server-side admin privileges and are not 
                          available in the client-side environment.
                        </p>
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    <span>Notification Testing</span>
                  </CardTitle>
                  <CardDescription>
                    Generate test notifications and trigger notification processes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Generate Test Notification</h3>
                    <p className="text-muted-foreground">
                      Create a single test notification for the current user
                    </p>
                    <Button 
                      onClick={handleGenerateTestNotification}
                      disabled={isGeneratingNotification}
                    >
                      {isGeneratingNotification ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Bell className="mr-2 h-4 w-4" />
                          Generate Test Notification
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-lg font-medium">Trigger Batch Notifications</h3>
                    <p className="text-muted-foreground">
                      Trigger the notification generation process for all users
                    </p>
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-300">
                      <div className="flex items-start">
                        <AlertTriangle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Warning</p>
                          <p className="text-sm mt-1">
                            This will generate notifications for all users in the system. Use with caution.
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="outline"
                      onClick={handleTriggerBatchNotifications}
                      disabled={isTriggeringBatch}
                      className="border-amber-500 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30"
                    >
                      {isTriggeringBatch ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Triggering...
                        </>
                      ) : (
                        <>
                          <Bell className="mr-2 h-4 w-4" />
                          Trigger Batch Notifications
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="sermons" className="space-y-6">
              <AutoSermonProcessor />
            </TabsContent>
            
            <TabsContent value="database" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    <span>Database Management</span>
                  </CardTitle>
                  <CardDescription>
                    View and manage database tables and records
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">Database Management</h3>
                    <p className="text-muted-foreground mb-4">
                      Database management features are coming soon.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DeveloperPanelPage;