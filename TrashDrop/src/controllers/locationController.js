/**
 * Location Management Controller
 * Handles all location-related operations for TrashDrop
 */

const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const { v4: uuidv4 } = require('uuid');

/**
 * Get all locations for a user
 */
exports.getUserLocations = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const { data, error } = await supabase
            .from('user_locations')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error fetching user locations:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch locations', 
            error: error.message 
        });
    }
};

/**
 * Get all disposal centers (public locations)
 */
exports.getDisposalCenters = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('disposal_centers')
            .select('*')
            .order('name', { ascending: true });
            
        if (error) throw error;
        
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error fetching disposal centers:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch disposal centers', 
            error: error.message 
        });
    }
};

/**
 * Add a new location for a user
 */
exports.addLocation = async (req, res) => {
    try {
        const userId = req.user.id;
        const { 
            location_name, 
            address, 
            coordinates, 
            location_type, 
            is_default,
            notes,
            pickup_instructions,
            last_pickup_date,
            photo_url
        } = req.body;
        
        // Validate required fields
        if (!location_name || !address || !coordinates) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields: name, address, and coordinates are required' 
            });
        }
        
        // If is_default is true, update existing default locations to false
        if (is_default) {
            await supabase
                .from('user_locations')
                .update({ is_default: false })
                .eq('user_id', userId);
        }
        
        // Generate a unique ID for offline sync capabilities
        const locationId = uuidv4();
        
        // Insert the new location
        const { data, error } = await supabase
            .from('user_locations')
            .insert({
                id: locationId,
                user_id: userId,
                location_name,
                address,
                coordinates,
                location_type: location_type || 'home',
                is_default: is_default || false,
                notes: notes || null,
                pickup_instructions: pickup_instructions || null,
                last_pickup_date: last_pickup_date || null,
                photo_url: photo_url || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
            
        if (error) throw error;
        
        res.status(201).json({ 
            success: true, 
            message: 'Location added successfully',
            data: { ...data, id: locationId }
        });
    } catch (error) {
        console.error('Error adding location:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to add location', 
            error: error.message 
        });
    }
};

/**
 * Update an existing location
 */
exports.updateLocation = async (req, res) => {
    try {
        const userId = req.user.id;
        const locationId = req.params.id;
        const { 
            location_name, 
            address, 
            coordinates, 
            location_type, 
            is_default,
            notes,
            pickup_instructions,
            last_pickup_date,
            photo_url 
        } = req.body;
        
        // Check if location exists and belongs to the user
        const { data: existingLocation, error: fetchError } = await supabase
            .from('user_locations')
            .select('*')
            .eq('id', locationId)
            .eq('user_id', userId)
            .single();
            
        if (fetchError || !existingLocation) {
            return res.status(404).json({ 
                success: false, 
                message: 'Location not found or does not belong to the user' 
            });
        }
        
        // If is_default is being set to true, update existing default locations to false
        if (is_default) {
            await supabase
                .from('user_locations')
                .update({ is_default: false })
                .eq('user_id', userId);
        }
        
        // Update the location
        const { data, error } = await supabase
            .from('user_locations')
            .update({
                location_name: location_name || existingLocation.location_name,
                address: address || existingLocation.address,
                coordinates: coordinates || existingLocation.coordinates,
                location_type: location_type || existingLocation.location_type,
                is_default: is_default !== undefined ? is_default : existingLocation.is_default,
                notes: notes !== undefined ? notes : existingLocation.notes,
                pickup_instructions: pickup_instructions !== undefined ? pickup_instructions : existingLocation.pickup_instructions,
                last_pickup_date: last_pickup_date !== undefined ? last_pickup_date : existingLocation.last_pickup_date,
                photo_url: photo_url !== undefined ? photo_url : existingLocation.photo_url,
                updated_at: new Date().toISOString()
            })
            .eq('id', locationId)
            .eq('user_id', userId);
            
        if (error) throw error;
        
        res.status(200).json({ 
            success: true, 
            message: 'Location updated successfully',
            data
        });
    } catch (error) {
        console.error('Error updating location:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update location', 
            error: error.message 
        });
    }
};

/**
 * Delete a location
 */
exports.deleteLocation = async (req, res) => {
    try {
        const userId = req.user.id;
        const locationId = req.params.id;
        
        // Check if location exists and belongs to the user
        const { data: existingLocation, error: fetchError } = await supabase
            .from('user_locations')
            .select('*')
            .eq('id', locationId)
            .eq('user_id', userId)
            .single();
            
        if (fetchError || !existingLocation) {
            return res.status(404).json({ 
                success: false, 
                message: 'Location not found or does not belong to the user' 
            });
        }
        
        // Delete the location
        const { error } = await supabase
            .from('user_locations')
            .delete()
            .eq('id', locationId)
            .eq('user_id', userId);
            
        if (error) throw error;
        
        res.status(200).json({ 
            success: true, 
            message: 'Location deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting location:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete location', 
            error: error.message 
        });
    }
};

/**
 * Set a location as default
 */
exports.setDefaultLocation = async (req, res) => {
    try {
        const userId = req.user.id;
        const locationId = req.params.id;
        
        // Check if location exists and belongs to the user
        const { data: existingLocation, error: fetchError } = await supabase
            .from('user_locations')
            .select('*')
            .eq('id', locationId)
            .eq('user_id', userId)
            .single();
            
        if (fetchError || !existingLocation) {
            return res.status(404).json({ 
                success: false, 
                message: 'Location not found or does not belong to the user' 
            });
        }
        
        // First, set all locations to non-default
        await supabase
            .from('user_locations')
            .update({ is_default: false })
            .eq('user_id', userId);
        
        // Then set the selected location as default
        const { data, error } = await supabase
            .from('user_locations')
            .update({ 
                is_default: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', locationId)
            .eq('user_id', userId);
            
        if (error) throw error;
        
        res.status(200).json({ 
            success: true, 
            message: 'Default location set successfully',
            data
        });
    } catch (error) {
        console.error('Error setting default location:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to set default location', 
            error: error.message 
        });
    }
};

/**
 * Upload a location photo
 */
exports.uploadLocationPhoto = async (req, res) => {
    try {
        const userId = req.user.id;
        const locationId = req.params.id;
        const { photo_data } = req.body;
        
        if (!photo_data) {
            return res.status(400).json({
                success: false,
                message: 'No photo data provided'
            });
        }
        
        // Check if location exists and belongs to the user
        const { data: existingLocation, error: fetchError } = await supabase
            .from('user_locations')
            .select('*')
            .eq('id', locationId)
            .eq('user_id', userId)
            .single();
            
        if (fetchError || !existingLocation) {
            return res.status(404).json({ 
                success: false, 
                message: 'Location not found or does not belong to the user' 
            });
        }
        
        // Generate a unique filename
        const filename = `location_photos/${userId}/${locationId}/${Date.now()}.jpg`;
        
        // Upload the photo to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase
            .storage
            .from('user_uploads')
            .upload(filename, Buffer.from(photo_data, 'base64'), {
                contentType: 'image/jpeg'
            });
            
        if (uploadError) {
            throw uploadError;
        }
        
        // Get the public URL for the uploaded photo
        const { data: urlData } = supabase
            .storage
            .from('user_uploads')
            .getPublicUrl(filename);
        
        const photo_url = urlData.publicUrl;
        
        // Update the location with the new photo URL
        const { data, error } = await supabase
            .from('user_locations')
            .update({ 
                photo_url,
                updated_at: new Date().toISOString()
            })
            .eq('id', locationId)
            .eq('user_id', userId);
            
        if (error) throw error;
        
        res.status(200).json({ 
            success: true, 
            message: 'Location photo uploaded successfully',
            photo_url,
            data
        });
    } catch (error) {
        console.error('Error uploading location photo:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to upload location photo', 
            error: error.message 
        });
    }
};

/**
 * Sync offline locations
 */
exports.syncLocations = async (req, res) => {
    try {
        const userId = req.user.id;
        const { locations } = req.body;
        
        if (!locations || !Array.isArray(locations) || locations.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No locations to sync'
            });
        }
        
        const results = {
            created: [],
            updated: [],
            errors: []
        };
        
        // Process each location
        for (const location of locations) {
            try {
                if (location._isDeleted) {
                    // Handle deletion
                    if (location.id) {
                        const { error } = await supabase
                            .from('user_locations')
                            .delete()
                            .eq('id', location.id)
                            .eq('user_id', userId);
                            
                        if (error) throw error;
                    }
                } else if (location._isNew || !location.id) {
                    // Handle new location
                    const newId = location.id || uuidv4();
                    
                    const { data, error } = await supabase
                        .from('user_locations')
                        .insert({
                            id: newId,
                            user_id: userId,
                            location_name: location.location_name,
                            address: location.address,
                            coordinates: location.coordinates,
                            location_type: location.location_type || 'home',
                            is_default: location.is_default || false,
                            notes: location.notes || null,
                            pickup_instructions: location.pickup_instructions || null,
                            last_pickup_date: location.last_pickup_date || null,
                            photo_url: location.photo_url || null,
                            created_at: location.created_at || new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        });
                        
                    if (error) throw error;
                    results.created.push({ ...data, id: newId });
                } else {
                    // Handle update
                    const { data: existingLocation, error: fetchError } = await supabase
                        .from('user_locations')
                        .select('*')
                        .eq('id', location.id)
                        .eq('user_id', userId)
                        .single();
                        
                    if (fetchError || !existingLocation) continue;
                    
                    const { data, error } = await supabase
                        .from('user_locations')
                        .update({
                            location_name: location.location_name || existingLocation.location_name,
                            address: location.address || existingLocation.address,
                            coordinates: location.coordinates || existingLocation.coordinates,
                            location_type: location.location_type || existingLocation.location_type,
                            is_default: location.is_default !== undefined ? location.is_default : existingLocation.is_default,
                            notes: location.notes !== undefined ? location.notes : existingLocation.notes,
                            pickup_instructions: location.pickup_instructions !== undefined ? location.pickup_instructions : existingLocation.pickup_instructions,
                            last_pickup_date: location.last_pickup_date !== undefined ? location.last_pickup_date : existingLocation.last_pickup_date,
                            photo_url: location.photo_url !== undefined ? location.photo_url : existingLocation.photo_url,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', location.id)
                        .eq('user_id', userId);
                        
                    if (error) throw error;
                    results.updated.push(data);
                }
            } catch (error) {
                console.error(`Error syncing location ${location.id || 'new'}:`, error);
                results.errors.push({
                    location: location.id || 'new',
                    error: error.message
                });
            }
        }
        
        // Get the latest state of all locations
        const { data: allLocations, error: fetchError } = await supabase
            .from('user_locations')
            .select('*')
            .eq('user_id', userId);
            
        if (fetchError) throw fetchError;
        
        res.status(200).json({
            success: true,
            message: 'Locations synchronized successfully',
            results,
            locations: allLocations
        });
    } catch (error) {
        console.error('Error syncing locations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to sync locations',
            error: error.message
        });
    }
};
