import { supabase } from './supabase';
import { FaithCommunity, CommunityMember, CommunityPrayerCircle, CommunityPrayerRequest, CommunityChallenge } from './types';

/**
 * Get all faith communities the current user is a member of
 */
export async function getUserCommunities(): Promise<FaithCommunity[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await supabase
      .from('faith_communities')
      .select(`
        *,
        members:community_members(*)
      `)
      .eq('members.user_id', user.id);
    
    if (error) {
      console.error('Error fetching user communities:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getUserCommunities:', error);
    throw error;
  }
}

/**
 * Get all public faith communities
 */
export async function getPublicCommunities(): Promise<FaithCommunity[]> {
  try {
    const { data, error } = await supabase
      .from('faith_communities')
      .select('*')
      .eq('is_private', false);
    
    if (error) {
      console.error('Error fetching public communities:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getPublicCommunities:', error);
    throw error;
  }
}

/**
 * Get a specific faith community by ID
 */
export async function getCommunityById(id: string): Promise<FaithCommunity | null> {
  try {
    const { data, error } = await supabase
      .from('faith_communities')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching community:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in getCommunityById:', error);
    throw error;
  }
}

/**
 * Create a new faith community
 */
export async function createFaithCommunity(community: Partial<FaithCommunity>): Promise<FaithCommunity> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Ensure created_by is set to the current user
    const newCommunity = {
      ...community,
      created_by: user.id
    };
    
    // Remove metadata if it's undefined to avoid schema errors
    if (newCommunity.metadata === undefined) {
      delete newCommunity.metadata;
    }
    
    // Generate a random join code if it's a private community and no code is provided
    if (newCommunity.is_private && !newCommunity.join_code) {
      newCommunity.join_code = Math.random().toString(36).substring(2, 10).toUpperCase();
    }
    
    const { data, error } = await supabase
      .from('faith_communities')
      .insert([newCommunity])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating faith community:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in createFaithCommunity:', error);
    throw error;
  }
}

/**
 * Update a faith community
 */
export async function updateFaithCommunity(id: string, updates: Partial<FaithCommunity>): Promise<FaithCommunity> {
  try {
    // Remove metadata if it's undefined to avoid schema errors
    if (updates.metadata === undefined) {
      delete updates.metadata;
    }
    
    const { data, error } = await supabase
      .from('faith_communities')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating faith community:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in updateFaithCommunity:', error);
    throw error;
  }
}

/**
 * Delete a faith community
 */
export async function deleteFaithCommunity(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('faith_communities')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting faith community:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteFaithCommunity:', error);
    throw error;
  }
}

/**
 * Get community members
 */
export async function getCommunityMembers(communityId: string): Promise<CommunityMember[]> {
  try {
    const { data, error } = await supabase
      .from('community_members')
      .select(`
        *,
        profiles(id, display_name, first_name, last_name, profile_image_url)
      `)
      .eq('community_id', communityId);
    
    if (error) {
      console.error('Error fetching community members:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getCommunityMembers:', error);
    throw error;
  }
}

/**
 * Join a community
 */
export async function joinCommunity(communityId: string, joinCode?: string): Promise<CommunityMember> {
  try {
    // Get the current authenticated user
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      throw new Error('User not authenticated');
    }

    // Check if the community is private and requires a join code
    const { data: community, error: communityError } = await supabase
      .from('faith_communities')
      .select('is_private, join_code')
      .eq('id', communityId)
      .single();
    
    if (communityError) {
      throw communityError;
    }

    if (community.is_private && (!joinCode || joinCode !== community.join_code)) {
      throw new Error('Invalid join code for private community');
    }

    // Check if already a member
    const { data: existingMembership } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', communityId)
      .eq('user_id', user.data.user.id)
      .single();

    if (existingMembership) {
      throw new Error('You are already a member of this community');
    }

    // Join the community
    const { data, error } = await supabase
      .from('community_members')
      .insert([
        {
          community_id: communityId,
          user_id: user.data.user.id,
          role: 'member'
        }
      ])
      .select()
      .single();
    
    if (error) {
      console.error('Error joining community:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in joinCommunity:', error);
    throw error;
  }
}

/**
 * Leave a community
 */
export async function leaveCommunity(communityId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const { error } = await supabase
      .from('community_members')
      .delete()
      .eq('community_id', communityId)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error leaving community:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error in leaveCommunity:', error);
    throw error;
  }
}

/**
 * Check if user is a member of a community
 */
export async function isCommunityMember(communityId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return false;
    }
    
    const { data, error } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
      console.error('Error checking community membership:', error);
      throw error;
    }
    
    return !!data;
  } catch (error) {
    console.error('Error in isCommunityMember:', error);
    return false;
  }
}

/**
 * Get community prayer circles
 */
export async function getCommunityPrayerCircles(communityId: string): Promise<CommunityPrayerCircle[]> {
  try {
    const { data, error } = await supabase
      .from('community_prayer_circles')
      .select('*')
      .eq('community_id', communityId);
    
    if (error) {
      console.error('Error fetching prayer circles:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getCommunityPrayerCircles:', error);
    throw error;
  }
}

/**
 * Create a prayer circle
 */
export async function createPrayerCircle(circle: Partial<CommunityPrayerCircle>): Promise<CommunityPrayerCircle> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const newCircle = {
      ...circle,
      created_by: user.id
    };
    
    const { data, error } = await supabase
      .from('community_prayer_circles')
      .insert([newCircle])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating prayer circle:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in createPrayerCircle:', error);
    throw error;
  }
}

/**
 * Get community prayer requests
 */
export async function getCommunityPrayerRequests(communityId: string): Promise<CommunityPrayerRequest[]> {
  try {
    // First check if the profiles table exists and has the necessary columns
    const { data: profilesCheck, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name, first_name')
      .limit(1);
    
    if (profilesError) {
      console.warn('Error checking profiles table:', profilesError);
      // If there's an error with the profiles table, just fetch the prayer requests without the join
      const { data, error } = await supabase
        .from('community_prayer_requests')
        .select('*')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching community prayer requests:', error);
        throw error;
      }
      
      return data || [];
    }
    
    // If profiles table exists, try to join with it
    try {
      const { data, error } = await supabase
        .from('community_prayer_requests')
        .select(`
          *,
          user_profile:profiles(display_name, first_name)
        `)
        .eq('community_id', communityId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching community prayer requests with profiles:', error);
        throw error;
      }
      
      return data || [];
    } catch (joinError) {
      console.warn('Error joining with profiles, falling back to basic query:', joinError);
      // Fallback to basic query without the join
      const { data, error } = await supabase
        .from('community_prayer_requests')
        .select('*')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching community prayer requests (fallback):', error);
        throw error;
      }
      
      return data || [];
    }
  } catch (error) {
    console.error('Error in getCommunityPrayerRequests:', error);
    throw error;
  }
}

/**
 * Create a community prayer request
 */
export async function createCommunityPrayerRequest(request: Partial<CommunityPrayerRequest>): Promise<CommunityPrayerRequest> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const newRequest = {
      ...request,
      user_id: user.id
    };
    
    const { data, error } = await supabase
      .from('community_prayer_requests')
      .insert([newRequest])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating community prayer request:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in createCommunityPrayerRequest:', error);
    throw error;
  }
}

/**
 * Pray for a community prayer request
 */
export async function prayForCommunityRequest(prayerId: string): Promise<{ success: boolean; prayer_count: number }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Check if user has already prayed for this request
    const { data: existingPrayer, error: checkError } = await supabase
      .from('community_prayer_interactions')
      .select('id')
      .eq('prayer_id', prayerId)
      .eq('user_id', user.id)
      .limit(1);
    
    if (checkError) {
      throw checkError;
    }
    
    // If already prayed, just return
    if (existingPrayer && existingPrayer.length > 0) {
      return { success: true, prayer_count: 0 };
    }
    
    // Add prayer interaction
    const { error: interactionError } = await supabase
      .from('community_prayer_interactions')
      .insert({
        prayer_id: prayerId,
        user_id: user.id
      });
    
    if (interactionError) {
      throw interactionError;
    }
    
    // Get updated prayer count
    const { data: updatedRequest, error: updateError } = await supabase
      .from('community_prayer_requests')
      .select('prayer_count')
      .eq('id', prayerId)
      .single();
    
    if (updateError) {
      throw updateError;
    }
    
    return { success: true, prayer_count: updatedRequest?.prayer_count || 1 };
  } catch (error) {
    console.error('Error praying for community request:', error);
    throw error;
  }
}

/**
 * Get community challenges
 */
export async function getCommunityChallenge(communityId: string): Promise<CommunityChallenge[]> {
  try {
    const { data, error } = await supabase
      .from('community_challenges')
      .select('*')
      .eq('community_id', communityId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching community challenges:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getCommunityChallenge:', error);
    throw error;
  }
}

/**
 * Create a community challenge
 */
export async function createCommunityChallenge(challenge: Partial<CommunityChallenge>): Promise<CommunityChallenge> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const newChallenge = {
      ...challenge,
      created_by: user.id
    };
    
    const { data, error } = await supabase
      .from('community_challenges')
      .insert([newChallenge])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating community challenge:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in createCommunityChallenge:', error);
    throw error;
  }
}

/**
 * Join a community challenge
 */
export async function joinCommunityChallenge(challengeId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const { error } = await supabase
      .from('challenge_participants')
      .insert([
        {
          challenge_id: challengeId,
          user_id: user.id,
          current_progress: 0,
          completed: false
        }
      ]);
    
    if (error) {
      console.error('Error joining community challenge:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error in joinCommunityChallenge:', error);
    throw error;
  }
}

/**
 * Update challenge progress
 */
export async function updateChallengeProgress(challengeId: string, progress: number): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Get the challenge to check target value
    const { data: challenge, error: challengeError } = await supabase
      .from('community_challenges')
      .select('target_value')
      .eq('id', challengeId)
      .single();
    
    if (challengeError) {
      throw challengeError;
    }
    
    // Check if challenge is completed
    const completed = progress >= challenge.target_value;
    const completedAt = completed ? new Date().toISOString() : null;
    
    const { error } = await supabase
      .from('challenge_participants')
      .update({
        current_progress: progress,
        completed,
        completed_at: completedAt
      })
      .eq('challenge_id', challengeId)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error updating challenge progress:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error in updateChallengeProgress:', error);
    throw error;
  }
}

/**
 * Generate community recommendations using AI
 */
export async function generateCommunityRecommendations(userPreferences: any): Promise<any> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-community-recommendations`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userPreferences })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error generating community recommendations:', error);
    throw error;
  }
}