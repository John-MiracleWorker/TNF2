import { useState, useEffect } from 'react';
import { Wifi, Calendar, MessageSquare, Bell, Share, ThumbsUp, Info, Video } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { LiveStreamPlayer } from '@/components/livestream/LiveStreamPlayer';
import { LiveChat } from '@/components/livestream/LiveChat';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { format, addHours } from 'date-fns';

interface UpcomingStream {
  id: string;
  title: string;
  description: string;
  scheduledStartTime: Date;
  thumbnail?: string;
}

interface PastStream {
  id: string;
  title: string;
  description: string;
  publishedAt: Date;
  thumbnail: string;
}

const LiveStreamPage = () => {
  // Your YouTube channel ID
  const channelId = 'UCBLfKRb1HYpQmB9-Dz9UEvg'; // Replace with your actual channel ID
  const platform = 'youtube' as const;
  
  const [isNotificationEnabled, setIsNotificationEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'about' | 'past-streams'>('upcoming');
  const [pastStreams, setPastStreams] = useState<PastStream[]>([]); // Placeholder for past streams
  const [useRealChat, setUseRealChat] = useState(true); // State to toggle real YouTube chat

  // Example upcoming streams - in production, this would be fetched from an API
  const upcomingStreams: UpcomingStream[] = [
    {
      id: '1',
      title: 'Sunday Worship & Bible Study',
      description: 'Join us for our weekly Sunday service followed by an in-depth Bible study on the Book of Romans.',
      scheduledStartTime: addHours(new Date(), 52), // Next Sunday
      thumbnail: 'https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1'
    },
    {
      id: '2',
      title: 'Prayer & Worship Night',
      description: 'A special evening of prayer, worship, and fellowship. Bring your prayer requests and join us in seeking God together.',
      scheduledStartTime: addHours(new Date(), 76), // Next Wednesday
      thumbnail: 'https://images.pexels.com/photos/5505399/pexels-photo-5505399.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1'
    },
    {
      id: '3',
      title: 'Q&A: Faith in the Modern World',
      description: 'Live Q&A session addressing your questions about how to navigate faith in today\'s complex world.',
      scheduledStartTime: addHours(new Date(), 100), // Next Friday
      thumbnail: 'https://images.pexels.com/photos/5119214/pexels-photo-5119214.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1'
    }
  ];

  // Placeholder for fetching past streams from YouTube Data API
  // In a real application, you would fetch the API key from Supabase
  // and make API calls here.
  useEffect(() => {
    const fetchPastStreams = async () => {
      // Replace with actual API fetching logic using YouTube Data API
      // and your Supabase stored API key
      console.log('Fetching past streams for channel:', channelId);
      // Example placeholder data:
      const dummyPastStreams: PastStream[] = [
        { id: 'past1', title: 'Archived Service 1', description: 'A recording of a previous service.', publishedAt: new Date('2023-10-20T10:00:00Z'), thumbnail: 'https://images.pexels.com/photos/1112048/pexels-photo-1112048.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' },
        { id: 'past2', title: 'Archived Bible Study', description: 'Previous week\'s Bible study session.', publishedAt: new Date('2023-10-18T19:00:00Z'), thumbnail: 'https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' },
      ];
      setPastStreams(dummyPastStreams);
    };

    fetchPastStreams();
  }, [channelId]); // Refetch if channelId changes



  const toggleNotification = () => {
    // In a real application, this would register for push notifications
    setIsNotificationEnabled(!isNotificationEnabled);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Live Stream</h1>
          <p className="text-muted-foreground">
            Join our live services, Bible studies, and special events
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column - Live Stream */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stream Player */}
            <LiveStreamPlayer 
              channelId={channelId}
              platform={platform}
              height={480}
            />
            
            {/* Stream Details */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl">Sunday Worship Service</CardTitle>
                    <CardDescription className="flex items-center mt-1">
                      <Wifi className="h-3.5 w-3.5 text-green-500 mr-1" />
                      Streaming live now
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={toggleNotification}>
                      <Bell className={`h-4 w-4 mr-2 ${isNotificationEnabled ? 'text-secondary' : ''}`} />
                      {isNotificationEnabled ? 'Notifications On' : 'Notify Me'}
                    </Button>
                    <Button variant="outline" size="sm">
                      <Share className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <p className="text-foreground mb-4">
                  Join us for our weekly Sunday worship service as we explore scripture together and strengthen our faith community. Today's message focuses on finding peace in troubled times.
                </p>
                
                <div className="flex items-center justify-between py-2 border-t border-b">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-muted-foreground mr-1" />
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(), 'MMMM d, yyyy')}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <ThumbsUp className="h-4 w-4 text-muted-foreground mr-1" />
                      <span className="text-sm text-muted-foreground">423 likes</span>
                    </div>
                  </div>
                  <Button variant="secondary" size="sm">
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Like
                  </Button>
                </div>
                
                {/* Chat Type Toggle */}
                <div className="mt-4 flex justify-end">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setUseRealChat(!useRealChat)}
                  >
                    {useRealChat ? 'Use Simulated Chat' : 'Use YouTube Chat'}
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Upcoming Streams, Past Streams, and About */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as \'upcoming\' | \'about\' | \'past-streams\')}>
              <Card>
                <CardHeader className="pb-2">
                  <TabsList>
                    <TabsTrigger value="upcoming" className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      Upcoming
                    </TabsTrigger>
                    <TabsTrigger value="about" className="flex items-center">
                      <Info className="h-4 w-4 mr-2" />
                      About
                    </TabsTrigger>\n
                    <TabsTrigger value=\"past-streams\" className=\"flex items-center\">\n
                      <Video className=\"h-4 w-4 mr-2\" />\n
                      Past Streams\n
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>
                
                <CardContent>
                  <TabsContent value="upcoming" className="mt-0 space-y-4">
                    {upcomingStreams.map((stream) => (
                      <div key={stream.id} className="flex gap-4 border-b pb-4 last:border-0 last:pb-0">
                        {stream.thumbnail && (
                          <div className="w-32 h-20 rounded-md overflow-hidden shrink-0 hidden sm:block">
                            <img 
                              src={stream.thumbnail} 
                              alt={stream.title}
                              className="w-full h-full object-cover" 
                            />
                          </div>
                        )}
                        <div className="flex-grow">
                          <h3 className="font-medium text-foreground">{stream.title}</h3>
                          <p className="text-muted-foreground text-sm line-clamp-2 mt-1">{stream.description}</p>
                          <div className="flex items-center mt-2">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground mr-1" />
                            <span className="text-xs text-muted-foreground">
                              {format(stream.scheduledStartTime, 'EEE, MMM d • h:mm a')}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0">
                          <Button variant="outline" size="sm">
                            <Bell className="h-4 w-4 mr-2" />
                            Remind Me
                          </Button>
                        </div>
                      </div>
                    ))}
                  </TabsContent>

 <TabsContent value="past-streams" className="mt-0 space-y-4">
 <h2 className="text-2xl font-bold mb-4">Past Streams</h2>
                    {pastStreams.map((stream) => (
 <div key={stream.id} className="flex gap-4 border-b pb-4 last:border-0 last:pb-0">
 {stream.thumbnail && (
 <div className="w-32 h-20 rounded-md overflow-hidden shrink-0 hidden sm:block">
 <img
 src={stream.thumbnail}
 alt={stream.title}
 className="w-full h-full object-cover"
 />
 </div>
 )}
 <div className="flex-grow">
 <h3 className="font-medium text-foreground">{stream.title}</h3>
 <p className="text-muted-foreground text-sm line-clamp-2 mt-1">{stream.description}</p>
 <div className="flex items-center mt-2">
 <Calendar className="h-3.5 w-3.5 text-muted-foreground mr-1" />
 <span className="text-xs text-muted-foreground">
 {format(stream.publishedAt, 'MMM d, yyyy')}
 </span>
 </div>
 </div>
                        <div className="shrink-0">
 <Button variant="outline" size="sm" onClick={() => window.open(`https://www.youtube.com/watch?v=${stream.id}`, '_blank')}>
 <Video className="h-4 w-4 mr-2" />
 Watch Again
 </Button>
 </div>
                      </div>
 ))}
 </TabsContent>
                  
                  <TabsContent value="about" className="mt-0">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium text-lg text-foreground mb-2">About Our Channel</h3>
                        <p className="text-muted-foreground">
                          Welcome to our faith community's live stream channel. We broadcast weekly services, Bible studies, prayer meetings, and special events to help you stay connected to your faith journey wherever you are.
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-medium text-foreground">Regular Schedule</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="font-medium">Sunday Worship</span>
                            <span className="text-muted-foreground">10:00 AM EST</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium">Wednesday Bible Study</span>
                            <span className="text-muted-foreground">7:00 PM EST</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium">Friday Prayer & Worship</span>
                            <span className="text-muted-foreground">8:00 PM EST</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t">
                        <Button 
                          variant="secondary"
                          className="w-full"
                          onClick={() => window.open(`https://www.youtube.com/channel/${channelId}`, '_blank')}
                        >
                          Visit Channel
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </CardContent>
              </Card>
            </Tabs>
          </div>
          
          {/* Side Column - Chat */}
          <div className="lg:col-span-1 space-y-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-bold text-foreground flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-primary" />
                Live Chat
              </h2>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                Active
              </Badge>
            </div>
            
            <LiveChat 
              channelId={channelId}
              platform={platform}
              height={700}
              showHeader={false}
              useRealEmbed={useRealChat} // Use the state to toggle real YouTube chat
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LiveStreamPage;