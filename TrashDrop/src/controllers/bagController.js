const supabase = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');

/**
 * Register a new scanned bag
 */
exports.registerBag = async (req, res) => {
  try {
    const { bagId, requestId, type } = req.body;
    const userId = req.user.id;
    
    if (!bagId || !requestId) {
      return res.status(400).json({ error: 'Bag ID and request ID are required' });
    }

    // Validate that the request ID exists and belongs to the user
    const { data: requestData, error: requestError } = await supabase
      .from('pickup_requests')
      .select('*')
      .eq('id', requestId)
      .single();
    
    if (requestError || !requestData) {
      console.error('Error validating pickup request:', requestError);
      return res.status(404).json({ error: 'Pickup request not found' });
    }
    
    // Insert the bag into the database
    const { data, error } = await supabase
      .from('bags')
      .insert({
        id: bagId,
        request_id: requestId,
        type: type || 'general',
        scanned_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error registering bag:', error);
      return res.status(500).json({ error: 'Failed to register bag' });
    }

    // Award points based on bag type
    let pointsAwarded = 0;
    let reason = '';
    
    // Define points for different waste types
    switch (type) {
      case 'recycling':
        pointsAwarded = 5;
        reason = 'Recycling waste';
        break;
      case 'plastic':
        pointsAwarded = 10;
        reason = 'Plastic waste segregation';
        break;
      case 'glass':
        pointsAwarded = 8;
        reason = 'Glass recycling';
        break;
      case 'paper':
        pointsAwarded = 5;
        reason = 'Paper recycling';
        break;
      case 'organic':
        pointsAwarded = 7;
        reason = 'Organic waste composting';
        break;
      case 'hazardous':
        pointsAwarded = 12;
        reason = 'Proper hazardous waste disposal';
        break;
      default:
        pointsAwarded = 2;
        reason = 'General waste disposal';
    }
    
    // Award points if applicable
    if (pointsAwarded > 0) {
      const pointsId = uuidv4();
      const { data: pointsData, error: pointsError } = await supabase
        .from('fee_points')
        .insert({
          id: pointsId,
          points: pointsAwarded,
          request_id: requestId,
          reason: reason,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (pointsError) {
        console.error('Error awarding points for bag:', pointsError);
        // Continue even if points award fails
      }
    }

    return res.status(201).json({ 
      message: 'Bag registered successfully',
      bagId,
      pointsAwarded: pointsAwarded > 0 ? pointsAwarded : null
    });
  } catch (error) {
    console.error('Server error registering bag:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get all bags for a specific pickup request
 */
exports.getBagsByRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.id;
    
    if (!requestId) {
      return res.status(400).json({ error: 'Request ID is required' });
    }

    // Fetch bags for the specified request
    const { data, error } = await supabase
      .from('bags')
      .select('*')
      .eq('request_id', requestId);

    if (error) {
      console.error('Error fetching bags:', error);
      return res.status(500).json({ error: 'Failed to fetch bags' });
    }

    return res.status(200).json({ bags: data });
  } catch (error) {
    console.error('Server error fetching bags:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get all bags for the authenticated user
 */
exports.getUserBags = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Join bags with pickup_requests to get bags associated with the user's requests
    const { data, error } = await supabase
      .from('bags')
      .select(`
        *,
        pickup_requests:request_id (*)
      `)
      .eq('pickup_requests.collector_id', userId);

    if (error) {
      console.error('Error fetching user bags:', error);
      return res.status(500).json({ error: 'Failed to fetch user bags' });
    }

    return res.status(200).json({ bags: data });
  } catch (error) {
    console.error('Server error fetching user bags:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Verify a bag by ID
 */
exports.verifyBag = async (req, res) => {
  try {
    const { bagId } = req.params;
    
    if (!bagId) {
      return res.status(400).json({ error: 'Bag ID is required' });
    }

    // Check if the bag exists
    const { data, error } = await supabase
      .from('bags')
      .select(`
        *,
        pickup_requests:request_id (*)
      `)
      .eq('id', bagId)
      .single();

    if (error || !data) {
      console.error('Error verifying bag:', error);
      return res.status(404).json({ error: 'Bag not found' });
    }

    return res.status(200).json({ 
      verified: true,
      bag: data
    });
  } catch (error) {
    console.error('Server error verifying bag:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
