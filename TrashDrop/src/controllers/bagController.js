const supabase = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');

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

/**
 * Order new bags for delivery
 */
exports.orderBags = async (req, res) => {
  try {
    const { address_id, notes, bags } = req.body;
    const userId = req.user.id;
    
    if (!address_id || !bags || !Array.isArray(bags) || bags.length === 0) {
      return res.status(400).json({ error: 'Address ID and at least one bag type are required' });
    }
    
    // Validate each bag entry has type and quantity
    for (const bag of bags) {
      if (!bag.type || !bag.quantity || bag.quantity < 1) {
        return res.status(400).json({ error: 'Each bag must have a valid type and quantity' });
      }
    }

    // Generate tracking ID (format: TD-YYYYMMDD-XXXX)
    const date = dayjs().format('YYYYMMDD');
    const randomPart = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
    const trackingId = `TD-${date}-${randomPart}`;
    
    // Create the order
    const { data: orderData, error: orderError } = await supabase
      .from('bag_orders')
      .insert({
        id: uuidv4(),
        user_id: userId,
        address_id,
        notes: notes || null,
        tracking_id: trackingId,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        estimated_delivery: dayjs().add(3, 'day').toISOString() // 3 days from now
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating bag order:', orderError);
      return res.status(500).json({ error: 'Failed to create bag order' });
    }
    
    // Insert each bag type ordered
    const bagItems = bags.map(bag => ({
      id: uuidv4(),
      order_id: orderData.id,
      type: bag.type,
      quantity: bag.quantity,
      created_at: new Date().toISOString()
    }));
    
    const { error: bagItemsError } = await supabase
      .from('bag_order_items')
      .insert(bagItems);

    if (bagItemsError) {
      console.error('Error creating bag order items:', bagItemsError);
      // Try to delete the order if bag items insertion fails
      await supabase.from('bag_orders').delete().eq('id', orderData.id);
      return res.status(500).json({ error: 'Failed to create bag order items' });
    }

    // Calculate the total number of bags ordered
    const totalBags = bags.reduce((sum, bag) => sum + bag.quantity, 0);
    
    // Update user's available bag count
    const { data: userData, error: userError } = await supabase
      .from('user_profiles')
      .select('available_bags')
      .eq('user_id', userId)
      .single();
    
    if (!userError && userData) {
      // Add to user's available bags
      const currentBags = userData.available_bags || 0;
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ available_bags: currentBags + totalBags })
        .eq('user_id', userId);
      
      if (updateError) {
        console.error('Error updating user bag count:', updateError);
        // Not critical, continue
      }
    }

    // Return the order details
    return res.status(201).json({
      message: 'Bag order placed successfully',
      orderId: orderData.id,
      trackingId: trackingId,
      estimatedDelivery: orderData.estimated_delivery
    });
  } catch (error) {
    console.error('Server error ordering bags:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get bag orders for the authenticated user
 */
exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all orders for the user
    const { data: orders, error: ordersError } = await supabase
      .from('bag_orders')
      .select(`
        *,
        bag_order_items(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching user bag orders:', ordersError);
      return res.status(500).json({ error: 'Failed to fetch bag orders' });
    }

    return res.status(200).json({ orders });
  } catch (error) {
    console.error('Server error fetching user bag orders:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get order details by tracking ID
 */
exports.getOrderByTracking = async (req, res) => {
  try {
    const { trackingId } = req.params;
    const userId = req.user.id;
    
    if (!trackingId) {
      return res.status(400).json({ error: 'Tracking ID is required' });
    }

    // Get the order with items
    const { data: order, error: orderError } = await supabase
      .from('bag_orders')
      .select(`
        *,
        bag_order_items(*)
      `)
      .eq('tracking_id', trackingId)
      .eq('user_id', userId)
      .single();

    if (orderError || !order) {
      console.error('Error fetching order by tracking ID:', orderError);
      return res.status(404).json({ error: 'Order not found' });
    }

    return res.status(200).json({ order });
  } catch (error) {
    console.error('Server error fetching order by tracking:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get the user's available bag count
 */
exports.getBagCount = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get the user's profile
    const { data: userData, error: userError } = await supabase
      .from('user_profiles')
      .select('available_bags')
      .eq('user_id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user bag count:', userError);
      return res.status(500).json({ error: 'Failed to fetch bag count' });
    }

    return res.status(200).json({ count: userData?.available_bags || 0 });
  } catch (error) {
    console.error('Server error fetching bag count:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
