const supabase = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');

/**
 * Get total points for a user
 */
exports.getUserPoints = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's total points from the view
    const { data: pointsData, error: pointsError } = await supabase
      .from('user_total_points')
      .select('total_points')
      .eq('user_id', userId)
      .single();
    
    if (pointsError && pointsError.code !== 'PGRST116') { // PGRST116 is "Results contain 0 rows"
      console.error('Error fetching user points:', pointsError);
      return res.status(500).json({ error: 'Failed to fetch user points' });
    }
    
    const totalPoints = pointsData ? pointsData.total_points : 0;
    
    // Get user's level information
    const { data: levelsData, error: levelsError } = await supabase
      .from('user_levels')
      .select('*')
      .order('points_threshold', { ascending: true });
      
    if (levelsError) {
      console.error('Error fetching user levels:', levelsError);
      return res.status(500).json({ error: 'Failed to fetch user levels' });
    }
    
    // Determine current level and next level
    const currentLevelData = determineUserLevel(totalPoints, levelsData);
    const nextLevelData = getNextLevel(totalPoints, levelsData);
    
    return res.status(200).json({ 
      totalPoints,
      userLevel: currentLevelData.name,
      currentLevel: currentLevelData,
      nextLevel: nextLevelData
    });
  } catch (error) {
    console.error('Server error fetching user points:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Award points to a user
 */
exports.awardPoints = async (req, res) => {
  try {
    const { requestId, points, reason } = req.body;
    
    if (!requestId || !points) {
      return res.status(400).json({ error: 'Request ID and points are required' });
    }
    
    // Validate that the request exists
    const { data: requestData, error: requestError } = await supabase
      .from('pickup_requests')
      .select('*')
      .eq('id', requestId)
      .single();
    
    if (requestError || !requestData) {
      console.error('Error validating pickup request:', requestError);
      return res.status(404).json({ error: 'Pickup request not found' });
    }
    
    // Insert points into the database
    const pointsId = uuidv4();
    const { data, error } = await supabase
      .from('fee_points')
      .insert({
        id: pointsId,
        points: points,
        request_id: requestId,
        reason: reason || 'General reward',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error awarding points:', error);
      return res.status(500).json({ error: 'Failed to award points' });
    }
    
    return res.status(201).json({ 
      message: 'Points awarded successfully',
      pointsId,
      points
    });
  } catch (error) {
    console.error('Server error awarding points:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get points history for a user
 */
exports.getPointsHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's points history with related data
    const { data, error } = await supabase
      .from('points_history')
      .select(`
        *,
        pickup_requests(*),
        rewards(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) {
      console.error('Error fetching points history:', error);
      return res.status(500).json({ error: 'Failed to fetch points history' });
    }
    
    // Format the response
    const formattedHistory = data.map(item => ({
      id: item.id,
      points: item.points,
      transaction_type: item.transaction_type,
      reason: item.reason,
      created_at: item.created_at,
      pickup_request: item.pickup_requests,
      reward: item.rewards
    }));
    
    return res.status(200).json({ pointsHistory: formattedHistory || [] });
  } catch (error) {
    console.error('Server error fetching points history:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get available rewards
 */
exports.getAvailableRewards = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's total points from the view
    const { data: pointsData, error: pointsError } = await supabase
      .from('user_total_points')
      .select('total_points')
      .eq('user_id', userId)
      .single();
    
    if (pointsError && pointsError.code !== 'PGRST116') { // PGRST116 is "Results contain 0 rows"
      console.error('Error fetching user points:', pointsError);
      return res.status(500).json({ error: 'Failed to fetch user points' });
    }
    
    const totalPoints = pointsData ? pointsData.total_points : 0;
    
    // Get all active rewards
    const { data: rewards, error: rewardsError } = await supabase
      .from('rewards')
      .select('*')
      .eq('active', true)
      .order('points_cost', { ascending: true });
    
    if (rewardsError) {
      console.error('Error fetching rewards:', rewardsError);
      return res.status(500).json({ error: 'Failed to fetch rewards' });
    }
    
    // Get user's level information
    const { data: levelsData, error: levelsError } = await supabase
      .from('user_levels')
      .select('*')
      .order('points_threshold', { ascending: true });
      
    if (levelsError) {
      console.error('Error fetching user levels:', levelsError);
      return res.status(500).json({ error: 'Failed to fetch user levels' });
    }
    
    // Determine current level and next level
    const currentLevelData = determineUserLevel(totalPoints, levelsData);
    const nextLevelData = getNextLevel(totalPoints, levelsData);
    
    // Mark rewards as available or locked based on user's points
    const availableRewards = rewards.map(reward => ({
      ...reward,
      available: reward.points_cost <= totalPoints
    }));
    
    return res.status(200).json({ 
      totalPoints, 
      userLevel: currentLevelData.name,
      currentLevel: currentLevelData,
      availableRewards,
      nextLevel: nextLevelData
    });
  } catch (error) {
    console.error('Server error fetching available rewards:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Redeem a reward
 */
exports.redeemReward = async (req, res) => {
  try {
    const userId = req.user.id;
    const { rewardId } = req.body;
    
    if (!rewardId) {
      return res.status(400).json({ error: 'Reward ID is required' });
    }
    
    // Get the reward details
    const { data: reward, error: rewardError } = await supabase
      .from('rewards')
      .select('*')
      .eq('id', rewardId)
      .eq('active', true)
      .single();
    
    if (rewardError || !reward) {
      console.error('Error fetching reward:', rewardError);
      return res.status(404).json({ error: 'Reward not found or inactive' });
    }
    
    // Get user's total points from the view
    const { data: pointsData, error: pointsError } = await supabase
      .from('user_total_points')
      .select('total_points')
      .eq('user_id', userId)
      .single();
    
    if (pointsError && pointsError.code !== 'PGRST116') { // PGRST116 is "Results contain 0 rows"
      console.error('Error fetching user points:', pointsError);
      return res.status(500).json({ error: 'Failed to fetch user points' });
    }
    
    const totalPoints = pointsData ? pointsData.total_points : 0;
    
    // Check if user has enough points
    if (totalPoints < reward.points_cost) {
      return res.status(400).json({
        error: 'Not enough points to redeem this reward',
        pointsRequired: reward.points_cost,
        totalPoints
      });
    }
    
    // Create redemption record in the database
    const { data: redemption, error: redemptionError } = await supabase
      .from('rewards_redemption')
      .insert({
        user_id: userId,
        reward_id: rewardId,
        points_spent: reward.points_cost,
        status: 'pending'
      })
      .select()
      .single();
    
    if (redemptionError) {
      console.error('Error creating redemption record:', redemptionError);
      return res.status(500).json({ error: 'Failed to redeem reward' });
    }
    
    // Points will be deducted automatically via the database trigger we created
    
    // Get updated points after the transaction
    const { data: updatedPoints, error: updatedPointsError } = await supabase
      .from('user_total_points')
      .select('total_points')
      .eq('user_id', userId)
      .single();
      
    if (updatedPointsError && updatedPointsError.code !== 'PGRST116') {
      console.error('Error fetching updated points:', updatedPointsError);
    }
    
    const pointsRemaining = updatedPoints ? updatedPoints.total_points : (totalPoints - reward.points_cost);
    
    // Get user's level information
    const { data: levelsData, error: levelsError } = await supabase
      .from('user_levels')
      .select('*')
      .order('points_threshold', { ascending: true });
      
    if (levelsError) {
      console.error('Error fetching user levels:', levelsError);
    }
    
    // Determine current level and next level after redemption
    const nextLevelData = levelsData ? getNextLevel(pointsRemaining, levelsData) : null;
    
    return res.status(200).json({
      success: true,
      message: 'Reward redeemed successfully',
      redemption,
      pointsRemaining,
      nextLevel: nextLevelData
    });
  } catch (error) {
    console.error('Server error redeeming reward:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper functions

/**
 * Determine user level based on points and levels data from the database
 * @param {number} points - User's total points
 * @param {Array} levelsData - Array of user_levels data from the database
 */
function determineUserLevel(points, levelsData) {
  if (!levelsData || !Array.isArray(levelsData) || levelsData.length === 0) {
    // Fallback to hardcoded levels if database data is unavailable
    if (points >= 1000) return { name: 'Eco Champion', points_threshold: 1000 };
    if (points >= 500) return { name: 'Eco Warrior', points_threshold: 500 };
    if (points >= 100) return { name: 'Eco Guardian', points_threshold: 100 };
    return { name: 'Eco Starter', points_threshold: 0 };
  }

  // Sort levels by threshold in descending order
  const sortedLevels = [...levelsData].sort((a, b) => b.points_threshold - a.points_threshold);
  
  // Find the highest level that the user qualifies for
  for (const level of sortedLevels) {
    if (points >= level.points_threshold) {
      return level;
    }
  }
  
  // If no level is found (shouldn't happen if we have a level with threshold 0)
  return sortedLevels[sortedLevels.length - 1];
}

/**
 * Get next level information based on current points
 * @param {number} points - User's total points
 * @param {Array} levelsData - Array of user_levels data from the database
 */
function getNextLevel(points, levelsData) {
  if (!levelsData || !Array.isArray(levelsData) || levelsData.length === 0) {
    // Fallback to hardcoded levels if database data is unavailable
    if (points >= 1000) {
      // Already at highest level
      return {
        level: 'Max Level Reached',
        threshold: 1000,
        current: points,
        progress: 100
      };
    } else if (points >= 500) {
      // Next level is Eco Champion
      const progress = Math.min(100, Math.round(((points - 500) / 500) * 100));
      return {
        level: 'Eco Champion',
        threshold: 1000,
        current: points,
        progress
      };
    } else if (points >= 100) {
      // Next level is Eco Warrior
      const progress = Math.min(100, Math.round(((points - 100) / 400) * 100));
      return {
        level: 'Eco Warrior',
        threshold: 500,
        current: points,
        progress
      };
    } else {
      // Next level is Eco Guardian
      const progress = Math.min(100, Math.round((points / 100) * 100));
      return {
        level: 'Eco Guardian',
        threshold: 100,
        current: points,
        progress
      };
    }
  }
  
  // Sort levels by threshold in ascending order
  const sortedLevels = [...levelsData].sort((a, b) => a.points_threshold - b.points_threshold);
  
  // Find the user's current level and the next level
  let currentLevel = null;
  let nextLevel = null;
  
  for (let i = 0; i < sortedLevels.length; i++) {
    if (points >= sortedLevels[i].points_threshold) {
      currentLevel = sortedLevels[i];
      nextLevel = sortedLevels[i + 1] || null;
    }
  }
  
  // If there is no next level (user is at max level)
  if (!nextLevel) {
    return {
      level: 'Max Level Reached',
      threshold: currentLevel.points_threshold,
      current: points,
      progress: 100
    };
  }
  
  // Calculate progress to the next level
  const pointsToNextLevel = nextLevel.points_threshold - currentLevel.points_threshold;
  const pointsEarnedSinceLastLevel = points - currentLevel.points_threshold;
  const progress = Math.min(100, Math.round((pointsEarnedSinceLastLevel / pointsToNextLevel) * 100));
  
  return {
    level: nextLevel.name,
    threshold: nextLevel.points_threshold,
    current: points,
    progress: progress
  };
}

/**
 * Get available rewards based on points
 */
function getAvailableRewards(points) {
  const allRewards = [
    {
      id: 'reward-1',
      name: 'Reusable Water Bottle',
      description: 'Eco-friendly reusable water bottle made from recycled materials',
      pointsCost: 50,
      category: 'merchandise',
      image: '/images/rewards/water-bottle.jpg'
    },
    {
      id: 'reward-2',
      name: 'TrashDrop T-Shirt',
      description: 'Show your environmental commitment with this organic cotton T-shirt',
      pointsCost: 100,
      category: 'merchandise',
      image: '/images/rewards/tshirt.jpg'
    },
    {
      id: 'reward-3',
      name: 'Plant a Tree Certificate',
      description: 'We plant a tree on your behalf and send you a certificate',
      pointsCost: 150,
      category: 'impact',
      image: '/images/rewards/tree-certificate.jpg'
    },
    {
      id: 'reward-4',
      name: '5% Grocery Discount',
      description: 'Receive a 5% discount on your next grocery purchase at partner stores',
      pointsCost: 200,
      category: 'discount',
      image: '/images/rewards/grocery-discount.jpg'
    },
    {
      id: 'reward-5',
      name: 'Free Waste Pickup',
      description: 'Get one free waste pickup service',
      pointsCost: 300,
      category: 'service',
      image: '/images/rewards/free-pickup.jpg'
    },
    {
      id: 'reward-6',
      name: 'Premium Eco Kit',
      description: 'Complete kit with reusable items: bottle, containers, bags, and utensils',
      pointsCost: 500,
      category: 'merchandise',
      image: '/images/rewards/eco-kit.jpg'
    },
    {
      id: 'reward-7',
      name: 'Community Garden Donation',
      description: 'Donate to a community garden project in your neighborhood',
      pointsCost: 750,
      category: 'impact',
      image: '/images/rewards/garden-donation.jpg'
    },
    {
      id: 'reward-8',
      name: 'Eco Ambassador Status',
      description: 'Become an official TrashDrop Eco Ambassador with special perks',
      pointsCost: 1000,
      category: 'status',
      image: '/images/rewards/ambassador.jpg'
    }
  ];
  
  // Return rewards that the user can afford
  return allRewards.filter(reward => reward.pointsCost <= points);
}
