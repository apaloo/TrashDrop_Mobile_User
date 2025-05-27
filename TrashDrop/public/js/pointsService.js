/* Points & Rewards Supabase Service */
import supabase from './supabaseClient.js';

async function getUser() {
  // Returns supabase user or null
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user || null;
  } catch {
    return null;
  }
}

export async function getUserPoints() {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('fee_points')
    .select('points')
    .eq('user_id', user.id);

  if (error) throw error;
  const totalPoints = data.reduce((sum, row) => sum + row.points, 0);

  // Determine user level from user_levels table
  const { data: levels } = await supabase
    .from('user_levels')
    .select('*')
    .order('threshold', { ascending: true });

  let userLevel = 'Newbie';
  let nextLevel = null;
  if (levels && levels.length) {
    for (let i = 0; i < levels.length; i++) {
      if (totalPoints >= levels[i].threshold) {
        userLevel = levels[i].level_name;
        nextLevel = levels[i + 1] || null;
      }
    }
  }

  const progress = nextLevel ? Math.round((totalPoints / nextLevel.threshold) * 100) : 100;
  return {
    totalPoints,
    userLevel,
    nextLevel: nextLevel ? {
      level: nextLevel.level_name,
      threshold: nextLevel.threshold,
      current: totalPoints,
      progress,
    } : { level: userLevel, threshold: totalPoints, current: totalPoints, progress: 100 },
  };
}

export async function getAvailableRewards() {
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .eq('active', true)
    .order('points_cost');
  if (error) throw error;
  return data;
}

export async function getPointsHistory(limit = 50) {
  const user = await getUser();
  const { data, error } = await supabase
    .from('fee_points')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function redeemReward(rewardId) {
  const user = await getUser();
  const { data, error } = await supabase.rpc('redeem_reward', {
    p_user_id: user.id,
    p_reward_id: rewardId,
  });
  if (error) throw error;
  return data;
}
