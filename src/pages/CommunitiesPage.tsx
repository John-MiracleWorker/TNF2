import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, UserPlus } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { CommunityList } from '@/components/communities/CommunityList';
import { CommunityDetail } from '@/components/communities/CommunityDetail';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { type FaithCommunity } from '@/lib/communities';

const CommunitiesPage = () => {
  const [selectedCommunity, setSelectedCommunity] = useState<FaithCommunity | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleSelectCommunity = (community: FaithCommunity) => {
    setSelectedCommunity(community);
  };

  const handleBackToList = () => {
    setSelectedCommunity(null);
  };

  const handleCommunityUpdate = () => {
    // This would be used to refresh the community list after changes
    // We'll implement this when we have the backend functionality
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-full overflow-x-hidden">
        {!selectedCommunity && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Faith Communities</h1>
              <p className="text-muted-foreground">
                Connect with other believers, share prayer requests, and grow together
              </p>
            </div>
            
            <Button 
              onClick={() => setIsCreateDialogOpen(true)}
              className="w-full sm:w-auto"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Create Community</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </div>
        )}
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          {selectedCommunity ? (
            <CommunityDetail 
              community={selectedCommunity} 
              onBack={handleBackToList}
              onUpdate={handleCommunityUpdate}
            />
          ) : (
            <CommunityList 
              onSelect={handleSelectCommunity}
              onCreateCommunity={() => setIsCreateDialogOpen(true)}
            />
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default CommunitiesPage;