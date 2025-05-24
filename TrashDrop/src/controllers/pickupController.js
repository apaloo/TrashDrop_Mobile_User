const supabase = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a new on-demand pickup request
 */
exports.createPickupRequest = async (req, res) => {
  try {
    const { location, locationId, coordinates, fee = 5, wasteType, points = 0 } = req.body;
    const userId = req.user.id;
    
    if (!location || !coordinates) {
      return res.status(400).json({ error: 'Location and coordinates are required' });
    }

    const pickupId = uuidv4();
    
    // Start a transaction by using supabase's upsert capabilities
    // First, create the pickup request
    const { data, error } = await supabase
      .from('pickup_requests')
      .insert({
        id: pickupId,
        location,
        location_id: locationId, // Store the reference to the saved location
        coordinates: `POINT(${coordinates.longitude} ${coordinates.latitude})`,
        fee,
        waste_type: wasteType, // Store the waste type
        status: 'pending',
        collector_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error creating pickup request:', error);
      return res.status(500).json({ error: 'Failed to create pickup request' });
    }

    // If points are awarded (for recycling or plastic waste), create a points record
    if (points > 0) {
      const pointsId = uuidv4();
      const { pointsData, pointsError } = await supabase
        .from('fee_points')
        .insert({
          id: pointsId,
          points: points,
          request_id: pickupId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (pointsError) {
        console.error('Error awarding points:', pointsError);
        // We don't want to fail the whole request if just the points part fails
        // So we'll just log it and continue
      }
    }

    return res.status(201).json({ 
      message: 'Pickup request created successfully',
      requestId: pickupId,
      pointsAwarded: points > 0 ? points : null
    });
  } catch (error) {
    console.error('Server error creating pickup request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get all pickup requests for the authenticated user
 */
exports.getUserPickupRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const { data, error } = await supabase
      .from('pickup_requests')
      .select('*')
      .eq('collector_id', userId);

    if (error) {
      console.error('Error fetching pickup requests:', error);
      return res.status(500).json({ error: 'Failed to fetch pickup requests' });
    }

    return res.status(200).json({ requests: data });
  } catch (error) {
    console.error('Server error fetching pickup requests:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update the status of a pickup request
 */
exports.updatePickupStatus = async (req, res) => {
  try {
    const { requestId, status } = req.body;
    const userId = req.user.id;
    
    if (!requestId || !status) {
      return res.status(400).json({ error: 'Request ID and status are required' });
    }

    // Validate status
    const validStatuses = ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    // Prepare update data
    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };

    // Add timestamps based on status
    if (status === 'accepted') {
      updateData.accepted_at = new Date().toISOString();
    } else if (status === 'completed') {
      updateData.disposed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('pickup_requests')
      .update(updateData)
      .eq('id', requestId);

    if (error) {
      console.error('Error updating pickup status:', error);
      return res.status(500).json({ error: 'Failed to update pickup status' });
    }

    return res.status(200).json({ 
      message: 'Pickup status updated successfully' 
    });
  } catch (error) {
    console.error('Server error updating pickup status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get pickup request details by ID
 */
exports.getPickupRequestById = async (req, res) => {
  try {
    const { requestId } = req.params;
    
    if (!requestId) {
      return res.status(400).json({ error: 'Request ID is required' });
    }

    const { data, error } = await supabase
      .from('pickup_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (error) {
      console.error('Error fetching pickup request:', error);
      return res.status(500).json({ error: 'Failed to fetch pickup request' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Pickup request not found' });
    }

    return res.status(200).json({ request: data });
  } catch (error) {
    console.error('Server error fetching pickup request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Schedule a recurring pickup
 */
exports.scheduleRecurringPickup = async (req, res) => {
  try {
    const { 
      location, 
      coordinates, 
      fee = 5, 
      frequency, 
      startDate 
    } = req.body;
    
    const userId = req.user.id;
    
    if (!location || !coordinates || !frequency || !startDate) {
      return res.status(400).json({ 
        error: 'Location, coordinates, frequency, and start date are required' 
      });
    }

    // For now, store recurring info in the same table
    // We'll add a field to indicate it's recurring
    const pickupId = uuidv4();
    
    const { data, error } = await supabase
      .from('pickup_requests')
      .insert({
        id: pickupId,
        location,
        coordinates: `POINT(${coordinates.longitude} ${coordinates.latitude})`,
        fee,
        status: 'scheduled',
        collector_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Custom fields for recurring pickups
        recurring: true,
        frequency,
        next_pickup_date: startDate
      });

    if (error) {
      console.error('Error scheduling recurring pickup:', error);
      return res.status(500).json({ error: 'Failed to schedule recurring pickup' });
    }

    return res.status(201).json({ 
      message: 'Recurring pickup scheduled successfully',
      requestId: pickupId
    });
  } catch (error) {
    console.error('Server error scheduling recurring pickup:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get all upcoming scheduled pickups
 */
exports.getScheduledPickups = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const { data, error } = await supabase
      .from('pickup_requests')
      .select('*')
      .eq('status', 'scheduled');

    if (error) {
      console.error('Error fetching scheduled pickups:', error);
      return res.status(500).json({ error: 'Failed to fetch scheduled pickups' });
    }

    return res.status(200).json({ scheduledPickups: data });
  } catch (error) {
    console.error('Server error fetching scheduled pickups:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
