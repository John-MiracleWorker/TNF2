import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, AlertTriangle, HelpCircle } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { NotificationsList } from '@/components/ui/NotificationsList';
import { NotificationsManager } from '@/components/ui/NotificationsManager';
import { NotificationsTroubleshooter } from '@/components/ui/NotificationsTroubleshooter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent 
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const NotificationsPage = () => {
  const [showDiagnostics, setShowDiagnostics] = useState(true);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Notifications</h1>
            <p className="text-muted-foreground">
              Stay updated on your spiritual journey
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  <span>Help</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>About Notifications</DialogTitle>
                  <DialogDescription>
                    Understanding how TrueNorth notifications work
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p>TrueNorth provides several types of notifications to keep you engaged with your spiritual journey:</p>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Types of Notifications</h4>
                    <ul className="list-disc ml-5 space-y-1 text-sm">
                      <li><strong>Prayer Updates:</strong> When someone prays for your request or a prayer is answered</li>
                      <li><strong>Scripture Reminders:</strong> Prompts to practice memory verses</li>
                      <li><strong>Habit Reminders:</strong> Reminders for your spiritual habits</li>
                      <li><strong>Reading Plan Updates:</strong> Reminders about your Bible reading plans</li>
                      <li><strong>Achievement Alerts:</strong> Notifications when you earn achievements</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Notification Delivery</h4>
                    <ul className="list-disc ml-5 space-y-1 text-sm">
                      <li><strong>In-app notifications:</strong> Always shown in the notifications panel</li>
                      <li><strong>Push notifications:</strong> Delivered to your device even when the app is closed</li>
                      <li><strong>Email notifications:</strong> Coming soon for important updates</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Troubleshooting</h4>
                    <p className="text-sm">If you're not receiving notifications:</p>
                    <ul className="list-disc ml-5 space-y-1 text-sm">
                      <li>Check that you've granted notification permissions in your browser</li>
                      <li>Ensure notifications are enabled in your profile settings</li>
                      <li>Try using the "Diagnostics" tool to identify specific issues</li>
                    </ul>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button 
              variant={showDiagnostics ? "secondary" : "outline"} 
              size="sm"
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="flex items-center gap-2"
            >
              {showDiagnostics ? (
                <>
                  <Bell className="h-4 w-4" />
                  <span>Hide Diagnostics</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  <span>Diagnostics</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {showDiagnostics && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            <NotificationsTroubleshooter />
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Settings Card */}
          <motion.div
            className="md:col-span-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="p-6">
              <div className="space-y-6">
                <div className="flex flex-col items-center text-center">
                  <div className="bg-primary/5 p-4 rounded-full mb-3">
                    <Bell className="h-8 w-8 text-primary/70" />
                  </div>
                  <h3 className="text-lg font-semibold">Notification Settings</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">
                    Manage your preferences and notification delivery settings
                  </p>
                </div>
                
                <div className="space-y-1">
                  <NotificationsManager className="w-full" />
                </div>
              </div>
            </Card>
          </motion.div>
          
          {/* Notifications List */}
          <motion.div
            className="md:col-span-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card className="p-6">
              <Tabs defaultValue="all">
                <TabsList className="mb-4">
                  <TabsTrigger value="all">All Notifications</TabsTrigger>
                  <TabsTrigger value="unread">Unread</TabsTrigger>
                </TabsList>
                <TabsContent value="all" className="notifications-list">
                  <NotificationsList onlyUnread={false} limit={20} />
                </TabsContent>
                <TabsContent value="unread" className="notifications-list">
                  <NotificationsList onlyUnread={true} limit={20} />
                </TabsContent>
              </Tabs>
            </Card>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NotificationsPage;