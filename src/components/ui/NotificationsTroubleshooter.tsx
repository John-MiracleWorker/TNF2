import { useState, useEffect } from 'react';
import { 
  Bell, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Info, 
  Loader2, 
  RefreshCw, 
  Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { checkNotificationStatus, enableNotifications, sendTestNotificationWithDiagnostics } from '@/lib/notifications-helper';
import { useToast } from '@/hooks/use-toast';

export function NotificationsTroubleshooter() {
  const [status, setStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFixing, setIsFixing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setIsLoading(true);
    try {
      const result = await checkNotificationStatus();
      setStatus(result);
    } catch (error) {
      console.error('Error checking notification status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFixIssues = async () => {
    setIsFixing(true);
    try {
      const result = await enableNotifications();
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Notification issues have been fixed!',
        });
        await checkStatus();
      } else {
        toast({
          title: 'Could Not Fix',
          description: `Unable to fix issues: ${result.reason}`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fixing notification issues:', error);
      toast({
        title: 'Error',
        description: 'Failed to fix notification issues',
        variant: 'destructive',
      });
    } finally {
      setIsFixing(false);
    }
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    try {
      const results = await sendTestNotificationWithDiagnostics();
      setTestResults(results);
      
      if (results.success) {
        toast({
          title: 'Test Successful',
          description: 'A notification has been sent. Check your device for the notification.',
        });
      } else {
        toast({
          title: 'Test Failed',
          description: results.finalStatus,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error testing notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to test notifications',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusOverview = () => {
    if (!status) return null;
    
    // Calculate overall health
    let healthScore = 0;
    let totalPoints = 0;
    
    // Browser support - 20 points
    if (status.browserSupport) {
      healthScore += 20;
    }
    totalPoints += 20;
    
    // Permission - 30 points
    if (status.permission === 'granted') {
      healthScore += 30;
    }
    totalPoints += 30;
    
    // Service worker - 20 points
    if (status.serviceWorker.active) {
      healthScore += 20;
    } else if (status.serviceWorker.registered) {
      healthScore += 10;
    }
    totalPoints += 20;
    
    // Push subscription - 20 points
    if (status.pushSubscription.subscribed) {
      healthScore += 20;
    }
    totalPoints += 20;
    
    // User preferences - 10 points
    if (status.userPreferences.enabled) {
      healthScore += 10;
    }
    totalPoints += 10;
    
    const healthPercentage = (healthScore / totalPoints) * 100;
    
    let statusLabel = 'Needs Setup';
    let statusColor = 'text-red-500 bg-red-50 dark:bg-red-950/30 dark:text-red-400';
    
    if (healthPercentage >= 90) {
      statusLabel = 'Excellent';
      statusColor = 'text-green-500 bg-green-50 dark:bg-green-950/30 dark:text-green-400';
    } else if (healthPercentage >= 70) {
      statusLabel = 'Good';
      statusColor = 'text-green-500 bg-green-50 dark:bg-green-950/30 dark:text-green-400';
    } else if (healthPercentage >= 40) {
      statusLabel = 'Partial';
      statusColor = 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 dark:text-yellow-400';
    }
    
    return {
      healthPercentage,
      statusLabel,
      statusColor,
      workingFully: healthPercentage >= 90
    };
  };

  const overview = getStatusOverview();
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-foreground font-medium">Checking notification system status...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!status) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Unable to check notification status. Please refresh and try again.
            </AlertDescription>
          </Alert>
          <div className="flex justify-center mt-4">
            <Button onClick={checkStatus}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center">
            <Bell className="h-5 w-5 text-primary mr-2" />
            Notification System Status
          </CardTitle>
          <Button variant="outline" size="sm" onClick={checkStatus} className="h-8">
            <RefreshCw className="h-3.5 w-3.5 mr-2" />
            Refresh Status
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-4">
        {/* Overall Health */}
        {overview && (
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-medium">Notification System Health</h3>
              <div className="flex items-center mt-1">
                <Badge className={overview.statusColor}>
                  {overview.statusLabel}
                </Badge>
                {!overview.workingFully && (
                  <p className="text-xs ml-2 text-muted-foreground">
                    {overview.healthPercentage >= 40 ? 
                      'Some notifications may work' : 
                      'Notifications won\'t work properly'
                    }
                  </p>
                )}
              </div>
            </div>
            <div className="w-32 text-right">
              <span className="text-sm font-medium">{Math.round(overview.healthPercentage)}%</span>
              <Progress value={overview.healthPercentage} className="h-2 mt-1" />
            </div>
          </div>
        )}
        
        {/* Status Details */}
        <div className="space-y-3 border-b border-border pb-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              {status.browserSupport ? 
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" /> : 
                <XCircle className="h-4 w-4 text-red-500 mr-2" />
              }
              <span>Browser Support</span>
            </div>
            <Badge variant="outline" className={status.browserSupport ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}>
              {status.browserSupport ? 'Supported' : 'Not Supported'}
            </Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              {status.permission === 'granted' ? 
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" /> : 
                status.permission === 'denied' ?
                <XCircle className="h-4 w-4 text-red-500 mr-2" /> :
                <Info className="h-4 w-4 text-yellow-500 mr-2" />
              }
              <span>Notification Permission</span>
            </div>
            <Badge variant="outline" className={
              status.permission === 'granted' ? 'bg-green-50 text-green-700' : 
              status.permission === 'denied' ? 'bg-red-50 text-red-700' :
              'bg-yellow-50 text-yellow-700'
            }>
              {status.permission === 'granted' ? 'Granted' : 
               status.permission === 'denied' ? 'Denied' : 
               status.permission === 'not-supported' ? 'Not Supported' : 
               'Not Asked'}
            </Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              {status.serviceWorker.active ? 
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" /> : 
                status.serviceWorker.registered ?
                <Info className="h-4 w-4 text-yellow-500 mr-2" /> :
                <XCircle className="h-4 w-4 text-red-500 mr-2" />
              }
              <span>Service Worker</span>
            </div>
            <Badge variant="outline" className={
              status.serviceWorker.active ? 'bg-green-50 text-green-700' : 
              status.serviceWorker.registered ? 'bg-yellow-50 text-yellow-700' :
              'bg-red-50 text-red-700'
            }>
              {status.serviceWorker.active ? 'Active' : 
               status.serviceWorker.registered ? 'Registered' : 
               status.serviceWorker.supported ? 'Not Registered' : 
               'Not Supported'}
            </Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              {status.pushSubscription.subscribed ? 
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" /> : 
                <XCircle className="h-4 w-4 text-red-500 mr-2" />
              }
              <span>Push Subscription</span>
            </div>
            <Badge variant="outline" className={
              status.pushSubscription.subscribed ? 'bg-green-50 text-green-700' : 
              'bg-red-50 text-red-700'
            }>
              {status.pushSubscription.subscribed ? 'Subscribed' : 'Not Subscribed'}
            </Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              {status.userPreferences.enabled ? 
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" /> : 
                <Info className="h-4 w-4 text-yellow-500 mr-2" />
              }
              <span>Notification Settings</span>
            </div>
            <Badge variant="outline" className={
              status.userPreferences.enabled ? 'bg-green-50 text-green-700' : 
              'bg-yellow-50 text-yellow-700'
            }>
              {status.userPreferences.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        </div>
        
        {/* Test Results */}
        {testResults && (
          <div className="space-y-2 pt-2">
            <h3 className="text-sm font-medium">Test Results</h3>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {testResults.steps.map((step: any, index: number) => (
                <div key={index} className="flex items-start">
                  {step.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 shrink-0" />}
                  {step.status === 'warning' && <Info className="h-4 w-4 text-yellow-500 mt-0.5 mr-2 shrink-0" />}
                  {step.status === 'error' && <XCircle className="h-4 w-4 text-red-500 mt-0.5 mr-2 shrink-0" />}
                  <div>
                    <p className="text-sm font-medium">{step.step}</p>
                    <p className="text-xs text-muted-foreground">{step.message}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <Alert className={
              testResults.success ? 
              'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 
              'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
            }>
              <AlertDescription className="text-sm">
                {testResults.finalStatus}
              </AlertDescription>
            </Alert>
          </div>
        )}
        
        {/* If permission is denied, show special instructions */}
        {status.permission === 'denied' && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium">Notifications are blocked in your browser settings</p>
              <p className="mt-1 text-sm">To enable notifications:</p>
              <ol className="list-decimal list-inside mt-1 text-sm space-y-1">
                <li>Click the lock/site info icon in your browser's address bar</li>
                <li>Find "Notification" or "Site Settings" in the menu</li>
                <li>Change the permission from "Block" to "Allow"</li>
                <li>Refresh this page after changing the setting</li>
              </ol>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      
      <CardFooter className="flex flex-col sm:flex-row gap-2">
        {!overview?.workingFully && status.permission !== 'denied' && (
          <Button 
            onClick={handleFixIssues}
            disabled={isFixing}
            className="w-full sm:flex-1"
          >
            {isFixing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fixing Issues...
              </>
            ) : (
              <>
                <Settings className="mr-2 h-4 w-4" />
                Fix Issues
              </>
            )}
          </Button>
        )}
        
        <Button 
          variant="outline" 
          onClick={handleTestNotification}
          disabled={isTesting || status.permission !== 'granted'}
          className="w-full sm:flex-1"
        >
          {isTesting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Bell className="mr-2 h-4 w-4" />
              Test Notification
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}