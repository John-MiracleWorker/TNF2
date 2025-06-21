import { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Save, LogOut, CreditCard, Loader2, ToggleLeft, ToggleRight, Bell, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';
import { AuthContext } from '@/App';
import { getProfile, updateProfile, getUserPreferences, updateUserPreferences, signOut } from '@/lib/supabase';
import { getUserSubscription, isSubscriptionActive, createCustomerPortalSession, toggleDevProSimulation } from '@/lib/stripe';
import { UserProfile, UserPreferences } from '@/lib/types';
import { 
  sendTestNotification, 
  requestNotificationPermission, 
  checkNotificationPermission, 
  sendTestPushNotification 
} from '@/lib/notifications';
import { format } from 'date-fns';

const ProfilePage = () => {
  const { session } = useContext(AuthContext);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [localPreferences, setLocalPreferences] = useState<UserPreferences | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [isDevelopmentMode, setIsDevelopmentMode] = useState(false);
  const [simulateProEnabled, setSimulateProEnabled] = useState(false);
  const [isTestingNotification, setIsTestingNotification] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<string>('default');
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const bibleTranslations = [
    { value: 'NIV', label: 'New International Version' },
    { value: 'ESV', label: 'English Standard Version' },
    { value: 'KJV', label: 'King James Version' },
    { value: 'NASB', label: 'New American Standard Bible' },
    { value: 'NLT', label: 'New Living Translation' },
  ];
  
  const themes = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ];
  
  const notificationFrequencies = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'custom', label: 'Custom Schedule' }
  ];
  
  const daysOfWeek = [
    { value: 'sunday', label: 'Sunday' },
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' }
  ];

  useEffect(() => {
    if (session?.user?.id) {
      loadUserData();
    }
    
    // Check if this is a development environment
    const isDevEnvironment = window.location.hostname === 'localhost' || 
                             window.location.hostname.includes('stackblitz.io') ||
                             window.location.hostname.includes('127.0.0.1');
    setIsDevelopmentMode(isDevEnvironment);
    
    // Check if pro simulation is enabled
    setSimulateProEnabled(localStorage.getItem('simulate_pro_subscription') === 'true');
    
    // Check notification permission status
    checkPermissionStatus();
  }, [session]);

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      // Load profile, preferences, and subscription in parallel
      const [profileData, preferencesData, subscriptionData] = await Promise.all([
        getProfile(session!.user!.id),
        getUserPreferences(session!.user!.id),
        getUserSubscription()
      ]);
      
      setProfile(profileData || {
        id: session!.user!.id,
        first_name: '',
        last_name: '',
        display_name: '',
        bio: '',
      });
      
      setLocalPreferences(preferencesData || {
        id: session!.user!.id,
        notification_preferences: {
          prayer_reminders: true,
          bible_reading: true,
          journal_prompts: true
        },
        theme: 'light',
        verse_translation: 'NIV',
      });
      
      setSubscription(subscriptionData);
    } catch (error) {
      console.error('Error loading user data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user profile',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    
    setIsSaving(true);
    try {
      const updatedProfile = await updateProfile(profile);
      setProfile(updatedProfile);
      
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!localPreferences) return;
    
    setIsSaving(true);
    try {
      const updatedPreferences = await updateUserPreferences(localPreferences);
      
      // Update local state
      setLocalPreferences(updatedPreferences);
      
      // Apply theme change immediately
      applyTheme(updatedPreferences.theme);
      
      toast({
        title: 'Success',
        description: 'Preferences updated successfully',
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to update preferences',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Function to apply theme changes immediately
  const applyTheme = (theme: string) => {
    const root = window.document.documentElement;
    
    root.classList.remove('light', 'dark');
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  };

  const handleManageSubscription = async () => {
    setIsPortalLoading(true);
    try {
      const { url } = await createCustomerPortalSession();
      if (url) {
        window.open(url, '_blank');
      }
    } catch (error: any) {
      console.error('Error creating customer portal session:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to open billing portal',
        variant: 'destructive',
      });
    } finally {
      setIsPortalLoading(false);
    }
  };

  const handleToggleProSimulation = () => {
    toggleDevProSimulation(!simulateProEnabled);
    setSimulateProEnabled(!simulateProEnabled);
    toast({
      title: simulateProEnabled ? 'Pro Simulation Disabled' : 'Pro Simulation Enabled',
      description: simulateProEnabled ? 
        'You are now in normal mode' : 
        'You now have simulated Pro features for development',
    });
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: 'Error',
        description: 'Failed to sign out',
        variant: 'destructive',
      });
    }
  };

  const updateNotificationPreference = (key: keyof UserPreferences['notification_preferences'], value: any) => {
    if (!localPreferences) return;
    
    setLocalPreferences({
      ...localPreferences,
      notification_preferences: {
        ...localPreferences.notification_preferences,
        [key]: value
      }
    });
  };

  const getInitials = () => {
    if (!profile) return 'U';
    
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`;
    } else if (profile.first_name) {
      return profile.first_name[0];
    } else if (session?.user?.email) {
      return session.user.email[0].toUpperCase();
    }
    
    return 'U';
  };

  // Helper function to toggle a day selection for custom schedule
  const toggleCustomDay = (day: string) => {
    if (!localPreferences) return;
    
    const currentDays = localPreferences.notification_preferences.custom_days || [];
    const newDays = currentDays.includes(day) 
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
      
    updateNotificationPreference('custom_days', newDays);
  };

  // Helper to check if a day is selected
  const isDaySelected = (day: string): boolean => {
    return localPreferences?.notification_preferences.custom_days?.includes(day) || false;
  };

  const formatDate = (timestamp: number | null | undefined) => {
    if (!timestamp) return 'N/A';
    return format(new Date(timestamp * 1000), 'MMMM d, yyyy');
  };
  
  // Check notification permission status
  const checkPermissionStatus = () => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission('not-supported');
    }
  };

  // Request notification permission
  const handleRequestPermission = async () => {
    setIsTestingNotification(true);
    try {
      const granted = await requestNotificationPermission();
      
      // Update permission state
      setNotificationPermission(Notification.permission);
      
      if (granted) {
        toast({
          title: 'Permission Granted',
          description: 'You will now receive notifications from TrueNorth.',
        });
      } else {
        toast({
          title: 'Permission Denied',
          description: 'Please enable notifications in your browser settings.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: 'Error',
        description: 'Failed to request notification permission.',
        variant: 'destructive',
      });
    } finally {
      setIsTestingNotification(false);
    }
  };
  
  // Handle sending a test notification
  const handleSendTestNotification = async () => {
    setIsTestingNotification(true);
    try {
      if (notificationPermission !== 'granted') {
        // Request permission first
        const granted = await requestNotificationPermission();
        setNotificationPermission(Notification.permission);
        
        if (!granted) {
          toast({
            title: 'Permission Denied',
            description: 'Please enable notifications in your browser settings.',
            variant: 'destructive',
          });
          setIsTestingNotification(false);
          return;
        }
      }
      
      // Try local notification first to verify permissions
      const localSuccess = await sendTestNotification();
      
      if (!localSuccess) {
        throw new Error('Failed to send local test notification');
      }
      
      // Now try the server-generated notification
      const success = await sendTestPushNotification();
      
      if (!success) {
        throw new Error('Failed to send push notification');
      }
      
      toast({
        title: 'Test Notification Sent',
        description: 'You should receive notifications shortly.',
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: 'Notification Error',
        description: 'Failed to send test notification. Check browser permissions.',
        variant: 'destructive',
      });
    } finally {
      setIsTestingNotification(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Your Profile</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6">
          {/* Profile Card */}
          <div className="w-full md:w-1/3">
            <Card>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profile?.profile_image_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <CardTitle className="text-xl">
                  {profile?.display_name || profile?.first_name ? 
                    `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 
                    session?.user?.email?.split('@')[0]
                  }
                </CardTitle>
                <CardDescription>{session?.user?.email}</CardDescription>
                
                {isSubscriptionActive(subscription?.subscription_status) && (
                  <Badge className="bg-gold text-navy mt-2 dark:bg-secondary dark:text-secondary-foreground">
                    TrueNorth Pro
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="text-center">
                {profile?.bio && (
                  <p className="text-muted-foreground mb-4">{profile.bio}</p>
                )}
                <Button 
                  variant="outline" 
                  className="w-full border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </div>
          
          {/* Settings Tabs */}
          <div className="w-full md:w-2/3">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>
                  Manage your profile and application preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="profile" className="w-full">
                  <TabsList className="grid grid-cols-3 mb-4">
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="preferences">Preferences</TabsTrigger>
                    <TabsTrigger value="subscription">Subscription</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="profile" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="first_name">First Name</Label>
                        <Input
                          id="first_name"
                          value={profile?.first_name || ''}
                          onChange={e => setProfile(prev => ({ ...prev!, first_name: e.target.value }))}
                          placeholder="First name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last_name">Last Name</Label>
                        <Input
                          id="last_name"
                          value={profile?.last_name || ''}
                          onChange={e => setProfile(prev => ({ ...prev!, last_name: e.target.value }))}
                          placeholder="Last name"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="display_name">Display Name</Label>
                      <Input
                        id="display_name"
                        value={profile?.display_name || ''}
                        onChange={e => setProfile(prev => ({ ...prev!, display_name: e.target.value }))}
                        placeholder="How you want to be addressed"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        value={session?.user?.email || ''}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={profile?.bio || ''}
                        onChange={e => setProfile(prev => ({ ...prev!, bio: e.target.value }))}
                        placeholder="Tell us a little about yourself"
                        rows={4}
                      />
                    </div>
                    
                    <Button 
                      onClick={handleSaveProfile}
                      disabled={isLoading || isSaving}
                      className="w-full mt-2"
                    >
                      {isSaving ? 'Saving...' : 'Save Profile'}
                      {!isSaving && <Save className="ml-2 h-4 w-4" />}
                    </Button>
                  </TabsContent>
                  
                  <TabsContent value="preferences" className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Application Preferences</h3>
                      
                      <div className="space-y-2">
                        <Label htmlFor="theme">Theme</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {themes.map(theme => (
                            <Button
                              key={theme.value}
                              id={theme.value === 'light' ? 'theme' : `theme-${theme.value}`}
                              variant={localPreferences?.theme === theme.value ? "default" : "outline"}
                              onClick={() => {
                                // Update local state
                                setLocalPreferences(prev => {
                                  if (!prev) return null;
                                  return { ...prev, theme: theme.value };
                                });
                                
                                // Apply theme immediately
                                applyTheme(theme.value);
                              }}
                              className="w-full justify-center"
                            >
                              {theme.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="translation">Preferred Bible Translation</Label>
                        <Select
                          value={localPreferences?.verse_translation || 'NIV'}
                          onValueChange={value => setLocalPreferences(prev => prev ? ({ ...prev, verse_translation: value }) : null)}
                        >
                          <SelectTrigger id="translation">
                            <SelectValue placeholder="Select translation" />
                          </SelectTrigger>
                          <SelectContent>
                            {bibleTranslations.map(translation => (
                              <SelectItem key={translation.value} value={translation.value}>
                                {translation.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium flex items-center space-x-2">
                        <Bell className="h-4 w-4 text-muted-foreground" />
                        <span>Notification Settings</span>
                      </h3>
                      
                      <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900">
                        <AlertDescription className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">Notification Permission: {
                              notificationPermission === 'granted' ? 'Enabled' :
                              notificationPermission === 'denied' ? 'Blocked' : 
                              notificationPermission === 'not-supported' ? 'Not Supported' : 'Not Enabled'
                            }</p>
                            <p className="text-sm mt-1">
                              {notificationPermission === 'granted' ? 
                                'You will receive notifications from TrueNorth' :
                                'Enable notifications to receive important updates'
                              }
                            </p>
                          </div>
                          
                          {notificationPermission !== 'granted' && notificationPermission !== 'not-supported' && (
                            <Button 
                              size="sm"
                              variant="outline" 
                              className="shrink-0"
                              onClick={handleRequestPermission}
                              disabled={isTestingNotification || notificationPermission === 'denied'}
                            >
                              {isTestingNotification ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Bell className="h-4 w-4 mr-2" />
                              )}
                              Enable Notifications
                            </Button>
                          )}
                        </AlertDescription>
                      </Alert>
                      
                      {notificationPermission === 'denied' && (
                        <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300">
                          <AlertDescription>
                            <p>Notifications are blocked in your browser settings. To enable notifications:</p>
                            <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                              <li>Click the lock/info icon in your browser's address bar</li>
                              <li>Find "Notifications" or "Site Settings"</li>
                              <li>Change the setting from "Block" to "Allow"</li>
                            </ol>
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="space-y-3">
                        <div className="space-y-3 border-b border-border pb-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="notification_frequency">Notification Frequency</Label>
                              <p className="text-sm text-muted-foreground">
                                How often would you like to receive notifications?
                              </p>
                            </div>
                            <Select
                              value={localPreferences?.notification_preferences.frequency || 'daily'}
                              onValueChange={(value: 'daily' | 'weekly' | 'monthly' | 'custom') => 
                                updateNotificationPreference('frequency', value)
                              }
                            >
                              <SelectTrigger id="notification_frequency" className="w-[180px]">
                                <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                              <SelectContent>
                                {notificationFrequencies.map(freq => (
                                  <SelectItem key={freq.value} value={freq.value}>
                                    {freq.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {localPreferences?.notification_preferences.frequency === 'custom' && (
                            <div className="mt-4 space-y-2">
                              <Label>Custom Schedule</Label>
                              <p className="text-sm text-muted-foreground">
                                Select which days of the week you'd like to receive notifications:
                              </p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {daysOfWeek.map(day => (
                                  <Button
                                    key={day.value}
                                    type="button"
                                    size="sm"
                                    variant={isDaySelected(day.value) ? "default" : "outline"}
                                    className={isDaySelected(day.value) 
                                      ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                                      : ""}
                                    onClick={() => toggleCustomDay(day.value)}
                                  >
                                    {day.label}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="mt-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <Label htmlFor="quiet_hours" className="flex items-center">
                                  <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                                  <span>Quiet Hours</span>
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                  Don't send notifications during these hours:
                                </p>
                              </div>
                              <Switch
                                id="quiet_hours"
                                checked={localPreferences?.notification_preferences.quiet_hours?.enabled || false}
                                onCheckedChange={value => {
                                  if (!localPreferences?.notification_preferences.quiet_hours) {
                                    updateNotificationPreference('quiet_hours', {
                                      enabled: value,
                                      start: '22:00',
                                      end: '08:00'
                                    });
                                  } else {
                                    updateNotificationPreference('quiet_hours', {
                                      ...localPreferences.notification_preferences.quiet_hours,
                                      enabled: value
                                    });
                                  }
                                }}
                              />
                            </div>
                            
                            {localPreferences?.notification_preferences.quiet_hours?.enabled && (
                              <div className="grid grid-cols-2 gap-4 mt-3">
                                <div>
                                  <Label htmlFor="quiet_start">From</Label>
                                  <Input
                                    id="quiet_start"
                                    type="time"
                                    value={localPreferences.notification_preferences.quiet_hours?.start || '22:00'}
                                    onChange={e => {
                                      updateNotificationPreference('quiet_hours', {
                                        ...localPreferences.notification_preferences.quiet_hours,
                                        start: e.target.value
                                      });
                                    }}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="quiet_end">To</Label>
                                  <Input
                                    id="quiet_end"
                                    type="time"
                                    value={localPreferences.notification_preferences.quiet_hours?.end || '08:00'}
                                    onChange={e => {
                                      updateNotificationPreference('quiet_hours', {
                                        ...localPreferences.notification_preferences.quiet_hours,
                                        end: e.target.value
                                      });
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Test notification button */}
                          <div className="mt-6 pt-4 border-t border-border">
                            <Button
                              variant="outline"
                              className="w-full border-primary text-foreground hover:bg-muted"
                              onClick={handleSendTestNotification}
                              disabled={isTestingNotification || notificationPermission !== 'granted'}
                            >
                              {isTestingNotification ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Sending Test Notification...
                                </>
                              ) : (
                                <>
                                  <Bell className="mr-2 h-4 w-4" />
                                  Send Test Notification
                                </>
                              )}
                            </Button>
                            <p className="text-xs text-muted-foreground mt-2">
                              This will send a test notification to your device to verify your notification settings.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="prayer_reminders">Prayer Reminders</Label>
                            <p className="text-sm text-muted-foreground">
                              Receive reminders about your prayer requests
                            </p>
                          </div>
                          <Switch
                            id="prayer_reminders"
                            checked={localPreferences?.notification_preferences.prayer_reminders || false}
                            onCheckedChange={value => updateNotificationPreference('prayer_reminders', value)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="bible_reading">Bible Reading</Label>
                            <p className="text-sm text-muted-foreground">
                              Get notifications for daily Bible reading
                            </p>
                          </div>
                          <Switch
                            id="bible_reading"
                            checked={localPreferences?.notification_preferences.bible_reading || false}
                            onCheckedChange={value => updateNotificationPreference('bible_reading', value)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="journal_prompts">Journal Prompts</Label>
                            <p className="text-sm text-muted-foreground">
                              Receive suggested journal prompts
                            </p>
                          </div>
                          <Switch
                            id="journal_prompts"
                            checked={localPreferences?.notification_preferences.journal_prompts || false}
                            onCheckedChange={value => updateNotificationPreference('journal_prompts', value)}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleSavePreferences}
                      disabled={isLoading || isSaving}
                      className="w-full mt-2"
                    >
                      {isSaving ? 'Saving...' : 'Save Preferences'}
                      {!isSaving && <Save className="ml-2 h-4 w-4" />}
                    </Button>
                  </TabsContent>
                  
                  <TabsContent value="subscription" className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Subscription Details</h3>
                      
                      {isLoading ? (
                        <div className="py-8 text-center">
                          <Loader2 className="h-8 w-8 text-muted-foreground animate-spin mx-auto mb-4" />
                          <p>Loading subscription details...</p>
                        </div>
                      ) : subscription && isSubscriptionActive(subscription.subscription_status) ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 dark:bg-green-950/30 dark:border-green-900">
                          <div className="flex items-center mb-4">
                            <Badge className="bg-gold text-navy dark:bg-secondary dark:text-secondary-foreground">
                              Active Subscription
                            </Badge>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <span className="text-sm text-muted-foreground">Plan:</span>
                              <p className="font-medium">TrueNorth Pro</p>
                            </div>
                            
                            <div>
                              <span className="text-sm text-muted-foreground">Status:</span>
                              <p className="font-medium capitalize">{subscription.subscription_status}</p>
                            </div>
                            
                            <div>
                              <span className="text-sm text-muted-foreground">Current period:</span>
                              <p className="font-medium">
                                {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                              </p>
                            </div>
                            
                            {subscription.payment_method_brand && (
                              <div>
                                <span className="text-sm text-muted-foreground">Payment method:</span>
                                <p className="font-medium capitalize">
                                  {subscription.payment_method_brand} •••• {subscription.payment_method_last4}
                                </p>
                              </div>
                            )}
                            
                            {subscription.cancel_at_period_end && (
                              <div className="bg-amber-50 border border-amber-200 rounded p-3 mt-2 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-300">
                                <p>
                                  Your subscription will end on {formatDate(subscription.current_period_end)}
                                </p>
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-6">
                            <Button 
                              variant="outline" 
                              className="w-full border-primary text-foreground hover:bg-muted"
                              onClick={handleManageSubscription}
                              disabled={isPortalLoading}
                            >
                              {isPortalLoading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Loading...
                                </>
                              ) : (
                                <>
                                  <CreditCard className="mr-2 h-4 w-4" />
                                  Manage Subscription
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-card border border-border rounded-lg p-4 text-center">
                          <p className="mb-4 text-foreground">You don't have an active subscription.</p>
                          <Button 
                            variant="secondary"
                            onClick={() => navigate('/pricing')}
                          >
                            View Pricing Plans
                          </Button>
                        </div>
                      )}
                      
                      {/* Development Mode Section - Only visible in development */}
                      {isDevelopmentMode && (
                        <div className="mt-8 border-t border-border pt-6">
                          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900">
                            <AlertDescription>
                              <div className="space-y-4">
                                <h4 className="font-semibold text-blue-800 dark:text-blue-300">Developer Mode</h4>
                                <p className="text-blue-700 dark:text-blue-400">
                                  This section is only visible in development environments. 
                                  You can use it to simulate a Pro subscription for testing.
                                </p>
                                
                                <div className="flex items-center justify-between">
                                  <div className="space-y-0.5">
                                    <Label htmlFor="simulate_pro" className="font-medium text-blue-800 dark:text-blue-300">Simulate Pro Subscription</Label>
                                    <p className="text-sm text-blue-600 dark:text-blue-400">
                                      Toggle to simulate having a Pro subscription
                                    </p>
                                  </div>
                                  <Button
                                    variant="outline"
                                    onClick={handleToggleProSimulation}
                                    className={
                                      simulateProEnabled 
                                        ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-950/30 dark:text-green-300 dark:border-green-900" 
                                        : "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
                                    }
                                  >
                                    {simulateProEnabled ? (
                                      <>
                                        <ToggleRight className="mr-2 h-4 w-4" /> 
                                        Pro Simulation ON
                                      </>
                                    ) : (
                                      <>
                                        <ToggleLeft className="mr-2 h-4 w-4" />
                                        Pro Simulation OFF
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </AlertDescription>
                          </Alert>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;