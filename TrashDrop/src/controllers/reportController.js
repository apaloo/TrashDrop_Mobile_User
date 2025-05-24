const { supabase } = require('../config/supabaseClient');
const { v4: uuidv4 } = require('uuid');

/**
 * Creates a new illegal dumping report
 * @param {Object} reportData - Data for the report
 * @returns {Promise<Object>} - Created report
 */
const createReport = async (reportData) => {
  try {
    const user = await supabase.auth.getUser();
    const userId = user.data.user.id;
    
    const reportId = uuidv4();
    
    const { data, error } = await supabase
      .from('authority_assignments')
      .insert({
        id: reportId,
        location: reportData.location,
        coordinates: `POINT(${reportData.longitude} ${reportData.latitude})`,
        type: 'dumping',
        priority: reportData.priority || 'medium',
        payment: reportData.payment || '0',
        estimated_time: reportData.estimatedTime || '1h',
        distance: reportData.distance || '0km',
        authority: reportData.authority || 'local',
        status: 'pending',
        collector_id: null,
        authusers_id: userId,
        completed_at: null,
        created_at: new Date().toISOString()
      });
      
    if (error) throw error;
    
    // If photos are provided, add them to assignment_photos
    if (reportData.photos && reportData.photos.length > 0) {
      for (const photoUrl of reportData.photos) {
        const { photoError } = await supabase
          .from('assignment_photos')
          .insert({
            id: uuidv4(),
            assignment_id: reportId,
            photo_url: photoUrl,
            created_at: new Date().toISOString()
          });
          
        if (photoError) console.error('Error adding photo:', photoError);
      }
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Error creating report:', error);
    return { data: null, error };
  }
};

/**
 * Gets all reports for the current user
 * @returns {Promise<Array>} - List of reports
 */
const getUserReports = async () => {
  try {
    const user = await supabase.auth.getUser();
    const userId = user.data.user.id;
    
    const { data, error } = await supabase
      .from('authority_assignments')
      .select(`
        *,
        assignment_photos (*)
      `)
      .eq('authusers_id', userId)
      .eq('type', 'dumping')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error getting user reports:', error);
    return { data: null, error };
  }
};

/**
 * Gets a specific report by ID
 * @param {string} reportId - ID of the report
 * @returns {Promise<Object>} - Report data
 */
const getReportById = async (reportId) => {
  try {
    const { data, error } = await supabase
      .from('authority_assignments')
      .select(`
        *,
        assignment_photos (*)
      `)
      .eq('id', reportId)
      .eq('type', 'dumping')
      .single();
      
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error getting report:', error);
    return { data: null, error };
  }
};

/**
 * Updates a report's status
 * @param {string} reportId - ID of the report
 * @param {string} status - New status
 * @returns {Promise<Object>} - Updated report
 */
const updateReportStatus = async (reportId, status) => {
  try {
    const { data, error } = await supabase
      .from('authority_assignments')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', reportId)
      .eq('type', 'dumping');
      
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error updating report status:', error);
    return { data: null, error };
  }
};

module.exports = {
  createReport,
  getUserReports,
  getReportById,
  updateReportStatus
};
