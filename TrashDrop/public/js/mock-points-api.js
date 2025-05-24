/**
 * Mock Points & Rewards API Implementation
 * This file provides client-side mock implementations of the points and rewards API
 * endpoints for development purposes. In production, these would be replaced with
 * actual API calls to the server.
 */

// Mock data for user points
const mockUserPoints = {
  totalPoints: 250,
  userLevel: 'Eco Guardian',
  nextLevel: {
    level: 'Eco Warrior',
    threshold: 500,
    current: 250,
    progress: 50
  }
};

// Mock data for rewards
const mockRewards = [
  {
    id: 'reward-1',
    name: 'Reusable Water Bottle',
    description: 'Eco-friendly reusable water bottle made from recycled materials',
    pointsCost: 50,
    category: 'merchandise',
    image: '/images/rewards/placeholder.jpg'
  },
  {
    id: 'reward-2',
    name: 'TrashDrop T-Shirt',
    description: 'Show your environmental commitment with this organic cotton T-shirt',
    pointsCost: 100,
    category: 'merchandise',
    image: '/images/rewards/placeholder.jpg'
  },
  {
    id: 'reward-3',
    name: 'Plant a Tree Certificate',
    description: 'We plant a tree on your behalf and send you a certificate',
    pointsCost: 150,
    category: 'impact',
    image: '/images/rewards/placeholder.jpg'
  },
  {
    id: 'reward-4',
    name: '5% Grocery Discount',
    description: 'Receive a 5% discount on your next grocery purchase at partner stores',
    pointsCost: 200,
    category: 'discount',
    image: '/images/rewards/placeholder.jpg'
  },
  {
    id: 'reward-5',
    name: 'Free Waste Pickup',
    description: 'Get one free waste pickup service',
    pointsCost: 300,
    category: 'service',
    image: '/images/rewards/placeholder.jpg'
  },
  {
    id: 'reward-6',
    name: 'Premium Eco Kit',
    description: 'Complete kit with reusable items: bottle, containers, bags, and utensils',
    pointsCost: 500,
    category: 'merchandise',
    image: '/images/rewards/placeholder.jpg'
  },
  {
    id: 'reward-7',
    name: 'Community Garden Donation',
    description: 'Donate to a community garden project in your neighborhood',
    pointsCost: 750,
    category: 'impact',
    image: '/images/rewards/placeholder.jpg'
  }
];

// Mock data for points history
const mockPointsHistory = generateMockPointsHistory();

// Function to generate mock points history
function generateMockPointsHistory() {
  const today = new Date();
  const history = [];
  
  // Generate entries for the past 30 days
  for (let i = 0; i < 10; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    const types = ['recycling', 'plastic', 'glass', 'paper', 'general'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const points = type === 'plastic' ? 10 : 
                  type === 'recycling' ? 5 :
                  type === 'glass' ? 8 :
                  type === 'paper' ? 5 : 2;
    
    const locations = ['123 Main St', '456 Oak Ave', '789 Pine Rd', 'Riverfront Park'];
    const location = locations[Math.floor(Math.random() * locations.length)];
    
    history.push({
      id: `history-${i}`,
      points: points,
      reason: `${type.charAt(0).toUpperCase() + type.slice(1)} waste disposal`,
      created_at: date.toISOString(),
      pickup_requests: {
        id: `request-${i}`,
        location: location,
        created_at: date.toISOString()
      }
    });
  }
  
  return history;
}

// Mock implementation of the Points API
const PointsAPI = {
  // Get user points
  async getUserPoints() {
    return new Promise((resolve) => {
      console.log('Using mock getUserPoints API');
      setTimeout(() => {
        resolve({
          success: true,
          ...mockUserPoints
        });
      }, 300);
    });
  },
  
  // Get available rewards
  async getAvailableRewards() {
    return new Promise((resolve) => {
      console.log('Using mock getAvailableRewards API');
      setTimeout(() => {
        // Filter rewards based on user's points
        const availableRewards = mockRewards.filter(reward => reward.pointsCost <= mockUserPoints.totalPoints);
        
        resolve({
          success: true,
          totalPoints: mockUserPoints.totalPoints,
          availableRewards: mockRewards,
          userLevel: mockUserPoints.userLevel,
          nextLevel: mockUserPoints.nextLevel
        });
      }, 300);
    });
  },
  
  // Get points history
  async getPointsHistory() {
    return new Promise((resolve) => {
      console.log('Using mock getPointsHistory API');
      setTimeout(() => {
        resolve({
          success: true,
          pointsHistory: mockPointsHistory
        });
      }, 300);
    });
  },
  
  // Redeem a reward
  async redeemReward(rewardId) {
    return new Promise((resolve) => {
      console.log(`Using mock redeemReward API for reward: ${rewardId}`);
      setTimeout(() => {
        // Find the reward
        const reward = mockRewards.find(r => r.id === rewardId);
        
        if (!reward) {
          resolve({
            success: false,
            error: 'Reward not found'
          });
          return;
        }
        
        if (reward.pointsCost > mockUserPoints.totalPoints) {
          resolve({
            success: false,
            error: 'Not enough points to redeem this reward'
          });
          return;
        }
        
        // Update mock points
        const newPoints = mockUserPoints.totalPoints - reward.pointsCost;
        mockUserPoints.totalPoints = newPoints;
        
        // Update next level progress
        mockUserPoints.nextLevel.current = newPoints;
        mockUserPoints.nextLevel.progress = Math.round(((newPoints - 250) / 250) * 100);
        
        resolve({
          success: true,
          message: 'Reward redeemed successfully',
          reward,
          pointsRemaining: newPoints
        });
      }, 500);
    });
  },
  
  // Award points
  async awardPoints(requestId, points, reason) {
    return new Promise((resolve) => {
      console.log(`Using mock awardPoints API: ${points} points for ${reason}`);
      setTimeout(() => {
        // Update mock points
        mockUserPoints.totalPoints += points;
        
        // Update next level progress
        mockUserPoints.nextLevel.current = mockUserPoints.totalPoints;
        mockUserPoints.nextLevel.progress = Math.min(100, Math.round(((mockUserPoints.totalPoints - 250) / 250) * 100));
        
        // Add to history
        const newHistoryItem = {
          id: `history-new-${Date.now()}`,
          points: points,
          reason: reason || 'Points awarded',
          created_at: new Date().toISOString(),
          pickup_requests: {
            id: requestId || `request-${Date.now()}`,
            location: '123 Main St',
            created_at: new Date().toISOString()
          }
        };
        
        mockPointsHistory.unshift(newHistoryItem);
        
        resolve({
          success: true,
          message: 'Points awarded successfully',
          pointsId: `point-${Date.now()}`,
          points: points
        });
      }, 300);
    });
  }
};

// Expose the API to the global scope
window.PointsAPI = PointsAPI;
