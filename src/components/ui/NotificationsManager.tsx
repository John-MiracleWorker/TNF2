import { useState, useEffect } from 'react';
import { Bell, Loader2, XCircle, Info, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { NotificationsList } from '@/components/ui/NotificationsList';
import { getUnreadNotificationCount, requestNotificationPermission, checkNotificationPermission, subscribeToPushNotifications, fixNotificationIssues, triggerNotificationsGeneration } from '@/lib/notifications';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface NotificationsManagerProps {
  className?: string;
}

export function NotificationsManager({ className }: NotificationsManagerProps = {}) {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFixing, setIsFixing] = useState<boolean>(false);
  const [permissionStatus, setPermissionStatus] = useState<string>('default');
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    loadNotificationCount();
    checkPermissionStatus();
    
    // Set up automatic refresh every 60 seconds
    const interval = setInterval(loadNotificationCount, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadNotificationCount = async () => {
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading unread notification count:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkPermissionStatus = () => {
    const status = checkNotificationPermission();
    setPermissionStatus(status);
  };

  const handleRequestPermission = async () => {
    try {
      const granted = await requestNotificationPermission();
      if (granted) {
        toast({
          title: 'Notifications Enabled',
          description: 'You will now receive notifications from TrueNorth.',
        });
        setPermissionStatus('granted');
        
        // Also manually trigger a notification generation to ensure the system works
        try {
          await triggerNotificationsGeneration('batch', true);
        } catch (error) {
          console.error('Error triggering notifications:', error);
        }
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
    }
  };

  const handleFixIssues = async () => {
    setIsFixing(true);
    try {
      // This will attempt to fix common notification issues
      const result = await fixNotificationIssues();
      
      if (result.success) {
        toast({
          title: 'Notification System Fixed',
          description: 'Notification issues have been resolved.',
        });
        
        // Refresh permission status
        checkPermissionStatus();
        
        // Manually trigger notifications to test
        await triggerNotificationsGeneration('test', true);
        
        // Refresh notification count
        await loadNotificationCount();
      } else {
        toast({
          title: 'Some Issues Remain',
          description: `Fixed ${result.fixed.length} issues, but ${result.remaining.length} issues remain.`,
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Error fixing notification issues:', error);
      toast({
        title: 'Error',
        description: 'Failed to fix notification issues.',
        variant: 'destructive',
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("relative", className)}
            onClick={() => loadNotificationCount()}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
            {!isLoading && unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 px-1.5 h-5 min-w-5 flex items-center justify-center rounded-full"
              >
                {unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <Card>
            <div className="p-2 border-b flex items-center justify-between">
              <h3 className="font-medium text-sm">Notifications</h3>
              {permissionStatus !== 'granted' && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-xs"
                  onClick={handleRequestPermission}
                >
                  <Bell className="h-3 w-3 mr-1" />
                  Enable Notifications
                </Button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              <NotificationsList limit={5} onNotificationsUpdated={loadNotificationCount} />
            </div>
            <div className="p-2 border-t flex justify-between items-center">
              <Button 
                variant="link" 
                size="sm" 
                className="h-8 p-0 text-xs" 
                onClick={() => {
                  setDialogOpen(true);
                }}
              >
                <Info className="h-3 w-3 mr-1" />
                Settings & Help
              </Button>
              {permissionStatus !== 'granted' ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-xs"
                  onClick={handleFixIssues}
                  disabled={isFixing}
                >
                  {isFixing ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <XCircle className="h-3 w-3 mr-1 text-red-500" />
                  )}
                  Fix Issues
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-xs"
                  onClick={async () => {
                    await triggerNotificationsGeneration('test', true);
                    toast({
                      title: 'Notifications Refreshed',
                      description: 'Testing notification generation.',
                    });
                  }}
                >
                  <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                  Refresh
                </Button>
              )}
            </div>
          </Card>
        </PopoverContent>
      </Popover>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notification Settings</DialogTitle>
            <DialogDescription>
              Configure how you receive notifications from TrueNorth
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-1">Notification Status</h4>
              
              {permissionStatus === 'granted' ? (
                <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900">
                  <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />
                  <AlertDescription>
                    Notifications are enabled. You'll receive updates about your spiritual journey.
                  </AlertDescription>
                </Alert>
              ) : permissionStatus === 'denied' ? (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    Notifications are blocked by your browser settings. To enable them, you need to change your browser settings.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900">
                  <Info className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                  <AlertDescription>
                    Notifications are not enabled. Enable them to receive updates about your spiritual journey.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            
            {permissionStatus !== 'granted' && (
              <div className="space-y-2">
                <h4 className="font-medium">Fix Notification Issues</h4>
                <Button 
                  className="w-full" 
                  onClick={handleFixIssues}
                  disabled={isFixing || permissionStatus === 'denied'}
                >
                  {isFixing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Bell className="mr-2 h-4 w-4" />
                  )}
                  {permissionStatus === 'denied' ? 'Browser Blocked Notifications' : 'Enable Notifications'}
                </Button>
                
                {permissionStatus === 'denied' && (
                  <p className="text-xs text-muted-foreground">
                    You need to enable notifications in your browser settings for this site.
                  </p>
                )}
              </div>
            )}

            <div className="text-sm text-muted-foreground border-t pt-4">
              <p>
                For more detailed notification settings, please visit the Notifications page in your profile settings.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setDialogOpen(false)} variant="outline">
              Close
            </Button>
            <Button onClick={() => window.location.href = '/notifications'}>
              Notification Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}