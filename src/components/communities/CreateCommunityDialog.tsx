import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Loader2, ArrowRight, CheckCircle, BookOpen, Hand, Target, Users } from 'lucide-react';
import { createFaithCommunity, generateCommunityRecommendations } from '@/lib/communities';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface CreateCommunityDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCommunityCreated?: (community: any) => void;
}

export function CreateCommunityDialog({ open, onOpenChange, onCommunityCreated }: CreateCommunityDialogProps) {
  const [dialogOpen, setDialogOpen] = useState(open || false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    is_private: false,
    member_limit: 50,
    purpose: 'general',
    audience: 'general',
    activities: [] as string[],
    focus_area: 'general',
    meeting_frequency: 'weekly'
  });
  const [recommendations, setRecommendations] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedRecommendations, setSelectedRecommendations] = useState({
    readingPlan: true,
    prayerCircle: true,
    challenge: true
  });
  const { toast } = useToast();

  // Add useEffect to sync dialogOpen with open prop
  useEffect(() => {
    if (open !== undefined) {
      setDialogOpen(open);
    }
  }, [open]);

  const handleOpenChange = (newOpen: boolean) => {
    setDialogOpen(newOpen);
    onOpenChange?.(newOpen);
    
    if (!newOpen) {
      // Reset form when dialog closes
      setStep(1);
      setFormData({
        name: '',
        description: '',
        image_url: '',
        is_private: false,
        member_limit: 50,
        purpose: 'general',
        audience: 'general',
        activities: [],
        focus_area: 'general',
        meeting_frequency: 'weekly'
      });
      setRecommendations(null);
      setSelectedRecommendations({
        readingPlan: true,
        prayerCircle: true,
        challenge: true
      });
    }
  };

  const generateRecommendations = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Community name is required',
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      // Generate recommendations based on the community settings
      const result = await generateCommunityRecommendations({
        name: formData.name,
        description: formData.description,
        purpose: formData.purpose,
        audience: formData.audience,
        activities: formData.activities,
        focus_area: formData.focus_area,
        meeting_frequency: formData.meeting_frequency
      });
      
      setRecommendations(result);
      setStep(3);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate recommendations',
        variant: 'destructive'
      });
      
      // Even if we fail, let's move to the next step with mock recommendations
      setRecommendations({
        readingPlan: {
          title: "Foundations of Faith",
          description: "A 30-day journey through essential Christian teachings",
          passages: ["Romans 8:1-17", "Ephesians 2:1-10", "John 15:1-17"]
        },
        prayerCircle: {
          name: "Prayer Warriors",
          description: "Supporting each other through consistent prayer",
          focus: ["Personal growth", "Community needs", "Spiritual renewal"]
        },
        challenge: {
          name: "21 Days of Prayer",
          description: "Committing to daily prayer for 21 days",
          target: 21,
          type: "prayer"
        }
      });
      setStep(3);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Community name is required',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    
    try {
      // Create the community
      const community = await createFaithCommunity({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        image_url: formData.image_url.trim() || undefined,
        is_private: formData.is_private,
        member_limit: formData.member_limit,
        // Add additional metadata for recommendations
        metadata: {
          purpose: formData.purpose,
          audience: formData.audience,
          activities: formData.activities,
          focus_area: formData.focus_area,
          meeting_frequency: formData.meeting_frequency,
          recommendations: selectedRecommendations
        }
      });

      // If we have recommendations selected, we'd apply them here
      // This would involve additional API calls to create the plans, prayer circles, etc.

      toast({
        title: 'Success',
        description: 'Community created successfully!'
      });

      // Reset form
      setFormData({
        name: '',
        description: '',
        image_url: '',
        is_private: false,
        member_limit: 50,
        purpose: 'general',
        audience: 'general',
        activities: [],
        focus_area: 'general',
        meeting_frequency: 'weekly'
      });
      
      setDialogOpen(false);
      onCommunityCreated?.(community);
    } catch (error) {
      console.error('Error creating community:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create community',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Activity options for checkbox selection
  const activityOptions = [
    { value: 'bible_study', label: 'Bible Study', icon: BookOpen },
    { value: 'prayer', label: 'Prayer Groups', icon: Hand },
    { value: 'challenges', label: 'Spiritual Challenges', icon: Target },
    { value: 'discussion', label: 'Group Discussion', icon: Users },
  ];

  // Toggle activity selection
  const toggleActivity = (activity: string) => {
    setFormData(prev => ({
      ...prev,
      activities: prev.activities.includes(activity)
        ? prev.activities.filter(a => a !== activity)
        : [...prev.activities, activity]
    }));
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent className={step === 3 ? "sm:max-w-2xl" : "sm:max-w-md"}>
        <DialogHeader>
          <DialogTitle>
            {step === 1 && "Create New Faith Community"}
            {step === 2 && "Community Focus & Activities"}
            {step === 3 && "Community Recommendations"}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Community Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter community name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your community's purpose and values"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="image_url">Community Image URL</Label>
                <Input
                  id="image_url"
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_private"
                  checked={formData.is_private}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_private: checked }))}
                />
                <Label htmlFor="is_private">Private Community</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="member_limit">Member Limit</Label>
                <Input
                  id="member_limit"
                  type="number"
                  min="5"
                  max="500"
                  value={formData.member_limit}
                  onChange={(e) => setFormData(prev => ({ ...prev, member_limit: parseInt(e.target.value) || 50 }))}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                onClick={() => setStep(2)}
                disabled={!formData.name.trim()}
              >
                Next
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="purpose">Community Purpose</Label>
                <Select 
                  value={formData.purpose} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, purpose: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="general">General Faith Community</SelectItem>
                      <SelectItem value="bible_study">Bible Study Group</SelectItem>
                      <SelectItem value="prayer">Prayer Group</SelectItem>
                      <SelectItem value="discipleship">Discipleship Group</SelectItem>
                      <SelectItem value="outreach">Outreach & Service</SelectItem>
                      <SelectItem value="worship">Worship & Praise</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="audience">Target Audience</Label>
                <Select 
                  value={formData.audience} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, audience: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select audience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="general">General/Everyone</SelectItem>
                      <SelectItem value="new_believers">New Believers</SelectItem>
                      <SelectItem value="young_adults">Young Adults</SelectItem>
                      <SelectItem value="seniors">Seniors</SelectItem>
                      <SelectItem value="families">Families</SelectItem>
                      <SelectItem value="men">Men</SelectItem>
                      <SelectItem value="women">Women</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Community Activities</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {activityOptions.map((activity) => {
                    const ActivityIcon = activity.icon;
                    const isSelected = formData.activities.includes(activity.value);
                    return (
                      <Button
                        key={activity.value}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        className={`justify-start ${isSelected ? 'bg-primary text-primary-foreground' : ''}`}
                        onClick={() => toggleActivity(activity.value)}
                      >
                        <ActivityIcon className="mr-2 h-4 w-4" />
                        {activity.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Community Focus</Label>
                <RadioGroup 
                  value={formData.focus_area}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, focus_area: value }))}
                  className="grid grid-cols-1 gap-2 mt-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="general" id="focus-general" />
                    <Label htmlFor="focus-general">General Spiritual Growth</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="scripture" id="focus-scripture" />
                    <Label htmlFor="focus-scripture">Scripture Study & Memorization</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="prayer" id="focus-prayer" />
                    <Label htmlFor="focus-prayer">Prayer & Intercession</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="outreach" id="focus-outreach" />
                    <Label htmlFor="focus-outreach">Outreach & Service</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="accountability" id="focus-accountability" />
                    <Label htmlFor="focus-accountability">Accountability & Discipleship</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="frequency">Meeting Frequency</Label>
                <Select 
                  value={formData.meeting_frequency} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, meeting_frequency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-between space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={generateRecommendations}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    Generate Recommendations
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {step === 3 && recommendations && (
          <>
            <Tabs defaultValue="reading" className="w-full">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="reading" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span>Reading</span>
                </TabsTrigger>
                <TabsTrigger value="prayer" className="flex items-center gap-2">
                  <Hand className="h-4 w-4" />
                  <span>Prayer</span>
                </TabsTrigger>
                <TabsTrigger value="challenge" className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  <span>Challenge</span>
                </TabsTrigger>
              </TabsList>
              
              <div className="mt-4">
                <TabsContent value="reading">
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{recommendations.readingPlan.title}</CardTitle>
                          <CardDescription>{recommendations.readingPlan.description}</CardDescription>
                        </div>
                        <Switch 
                          checked={selectedRecommendations.readingPlan}
                          onCheckedChange={(checked) => 
                            setSelectedRecommendations(prev => ({...prev, readingPlan: checked}))
                          }
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-sm font-medium">Key Passages</h3>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {recommendations.readingPlan.passages.map((passage: string, index: number) => (
                              <Badge key={index} variant="outline" className="bg-primary/10 text-primary">
                                {passage}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="prayer">
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{recommendations.prayerCircle.name}</CardTitle>
                          <CardDescription>{recommendations.prayerCircle.description}</CardDescription>
                        </div>
                        <Switch 
                          checked={selectedRecommendations.prayerCircle}
                          onCheckedChange={(checked) => 
                            setSelectedRecommendations(prev => ({...prev, prayerCircle: checked}))
                          }
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-sm font-medium">Prayer Focus</h3>
                          <ul className="mt-2 space-y-1">
                            {recommendations.prayerCircle.focus.map((focus: string, index: number) => (
                              <li key={index} className="flex items-center">
                                <CheckCircle className="h-4 w-4 text-primary mr-2" />
                                {focus}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="challenge">
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{recommendations.challenge.name}</CardTitle>
                          <CardDescription>{recommendations.challenge.description}</CardDescription>
                        </div>
                        <Switch 
                          checked={selectedRecommendations.challenge}
                          onCheckedChange={(checked) => 
                            setSelectedRecommendations(prev => ({...prev, challenge: checked}))
                          }
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Target: {recommendations.challenge.target} days</span>
                          <Badge>{recommendations.challenge.type}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
            
            <div className="flex justify-between space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(2)}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Community'
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}