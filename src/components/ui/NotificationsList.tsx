import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  CheckCircle, 
  RefreshCw, 
  Loader2, 
  BellOff,
  AlertTriangle,
  MessageSquare,
  Heart,
  BookOpen,
  Calendar,
  Award,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { markNotificationAsRead, markAllNotificationsAsRead, triggerNotificationsGeneration } from '@/lib/notifications';
import { Notification } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface NotificationsListProps {
  onlyUnread?: boolean;
  limit?: number;
}

export function NotificationsList({ onlyUnread = true, limit = 10 }: NotificationsListProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [isTriggeringNotifications, setIsTriggeringNotifications] = useState(false);
  const componentRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadNotifications();
    
    // Set up an event listener to handle refresh requests
    const handleRefresh = () => {
      loadNotifications(true);
    };
    
    const component = componentRef.current;
    if (component) {
      component.addEventListener('refresh', handleRefresh);
    }
    
    return () => {
      if (component) {
        component.removeEventListener('refresh', handleRefresh);
      }
    };
  }, [onlyUnread, limit]);

  const loadNotifications = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (onlyUnread) {
        query = query.eq('is_read', false);
      }

      if (limit) {
        // Get one extra to check if there are more
        query = query.limit(limit + 1);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Check if there are more notifications
      setHasMore(data && data.length > limit);
      
      // Slice to the actual limit
      setNotifications(data ? data.slice(0, limit) : []);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notifications',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleMarkAsRead = async (notification: Notification) => {
    if (!notification.id || notification.is_read) return;

    try {
      await markNotificationAsRead(notification.id);
      
      // Update local state to mark as read
      setNotifications(prev => 
        prev.map(n => 
          n.id === notification.id ? { ...n, is_read: true } : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read',
        variant: 'destructive',
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      
      // Update local state to mark all as read
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
      
      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark all notifications as read',
        variant: 'destructive',
      });
    }
  };
  
  // Function to trigger notification generation manually
  const handleTriggerNotifications = async () => {
    setIsTriggeringNotifications(true);
    
    try {
      const result = await triggerNotificationsGeneration('batch', true);
      
      if (result && result.success) {
        toast({
          title: 'Notifications Generated',
          description: 'New notifications have been created for you.',
        });
        
        // Refresh the list after a short delay
        setTimeout(() => loadNotifications(), 1500);
      } else {
        throw new Error('Failed to generate notifications');
      }
    } catch (error) {
      console.error('Error triggering notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate notifications. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsTriggeringNotifications(false);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    handleMarkAsRead(notification);
    
    // Navigate to the action link if provided
    if (notification.action_link) {
      navigate(notification.action_link);
    }
  };
  
  // Get icon for notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'prayer':
      case 'prayer_support':
      case 'prayer_answered':
        return <Heart className="h-5 w-5 text-rose-500" />;
      case 'devotional':
        return <BookOpen className="h-5 w-5 text-blue-500" />;
      case 'chat':
        return <MessageSquare className="h-5 w-5 text-green-500" />;
      case 'habit_reminder':
        return <Calendar className="h-5 w-5 text-amber-500" />;
      case 'achievement':
      case 'verse_progress':
        return <Award className="h-5 w-5 text-purple-500" />;
      case 'alert':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'test':
        return <Bell className="h-5 w-5 text-gray-500" />;
      default:
        return <Bell className="h-5 w-5 text-primary" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div ref={componentRef} className="py-12 text-center">
        <div className="flex flex-col items-center">
          <div className="rounded-full bg-muted p-3 mb-4">
            <BellOff className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No notifications</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {onlyUnread 
              ? "You don't have any unread notifications at this time."
              : "You don't have any notifications yet. Check back later!"
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline" 
              onClick={() => loadNotifications(true)}
              className="flex items-center"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            
            <Button
              onClick={handleTriggerNotifications}
              disabled={isTriggeringNotifications}
              className="flex items-center"
            >
              {isTriggeringNotifications ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Bell className="mr-2 h-4 w-4" />
              )}
              Generate Notifications
            </Button>
          </div>
          {onlyUnread && (
            <Button 
              variant="link"
              onClick={() => navigate('/notifications')}
              className="mt-2"
            >
              View all notifications
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={componentRef} className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-foreground">{notifications.length} Notification{notifications.length !== 1 ? 's' : ''}</h3>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadNotifications(true)}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          {(onlyUnread && notifications.length > 0) && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleMarkAllAsRead}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleTriggerNotifications}
            disabled={isTriggeringNotifications}
          >
            {isTriggeringNotifications ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      
      <AnimatePresence>
        <div className="space-y-2">
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className={`
                flex items-start p-3 rounded-lg cursor-pointer transition-colors
                ${notification.is_read 
                  ? 'bg-muted/40 hover:bg-muted/60' 
                  : 'bg-muted/70 hover:bg-muted'
                }
                ${notification.is_read ? '' : 'border-l-4 border-primary'}
              `}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="mr-3 mt-0.5">
                {getNotificationIcon(notification.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h4 className={`font-medium truncate ${notification.is_read ? 'text-foreground/80' : 'text-foreground'}`}>
                    {notification.title}
                  </h4>
                  <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                    {notification.created_at && format(new Date(notification.created_at), 'MMM d, h:mm a')}
                  </span>
                </div>
                <p className={`text-sm ${notification.is_read ? 'text-muted-foreground' : 'text-foreground/80'}`}>
                  {notification.message}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>
      
      {hasMore && (
        <div className="pt-2 text-center">
          <Button 
            variant="link" 
            onClick={() => navigate('/notifications')}
          >
            View all notifications
          </Button>
        </div>
      )}
    </div>
  );
}