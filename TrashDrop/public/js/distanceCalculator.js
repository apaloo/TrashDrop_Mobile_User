/**
 * TrashDrop Distance Calculator
 * Utility for calculating distances between coordinates and estimating arrival times
 */

const DistanceCalculator = {
    /**
     * Calculate distance between two coordinates in miles
     * Uses the Haversine formula to calculate great-circle distance between two points
     * 
     * @param {number} lat1 - Latitude of the first point
     * @param {number} lon1 - Longitude of the first point
     * @param {number} lat2 - Latitude of the second point
     * @param {number} lon2 - Longitude of the second point
     * @returns {number} Distance in miles
     */
    calculateDistance: function(lat1, lon1, lat2, lon2) {
        // Earth's radius in miles
        const R = 3958.8;
        
        // Convert latitude and longitude from degrees to radians
        const φ1 = this.toRadians(lat1);
        const φ2 = this.toRadians(lat2);
        const Δφ = this.toRadians(lat2 - lat1);
        const Δλ = this.toRadians(lon2 - lon1);
        
        // Haversine formula
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        
        // Distance in miles
        const distance = R * c;
        
        return parseFloat(distance.toFixed(1));
    },
    
    /**
     * Estimate arrival time based on distance and average speed
     * 
     * @param {number} distanceInMiles - Distance in miles
     * @param {number} speedMph - Average speed in miles per hour (default: 15mph for urban traffic)
     * @returns {number} Estimated time in minutes
     */
    estimateArrivalTime: function(distanceInMiles, speedMph = 15) {
        // Calculate time in hours (distance / speed)
        const timeInHours = distanceInMiles / speedMph;
        
        // Convert to minutes
        const timeInMinutes = Math.round(timeInHours * 60);
        
        return timeInMinutes;
    },
    
    /**
     * Convert degrees to radians
     * 
     * @param {number} degrees - Angle in degrees
     * @returns {number} Angle in radians
     */
    toRadians: function(degrees) {
        return degrees * (Math.PI / 180);
    },
    
    /**
     * Parse coordinates from Supabase geography format
     * 
     * @param {string} coordinatesString - Coordinates in POINT(lon lat) format
     * @returns {object|null} Object with latitude and longitude or null
     */
    parseCoordinates: function(coordinatesString) {
        try {
            // Handle POINT format: 'POINT(longitude latitude)'
            const match = coordinatesString.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
            if (match) {
                return {
                    longitude: parseFloat(match[1]),
                    latitude: parseFloat(match[2])
                };
            }
            return null;
        } catch (error) {
            console.error('Error parsing coordinates:', error);
            return null;
        }
    },
    
    /**
     * Format distance for display
     * 
     * @param {number} distance - Distance in miles
     * @returns {string} Formatted distance string
     */
    formatDistance: function(distance) {
        if (distance < 0.1) {
            return 'Nearby';
        }
        
        return `${distance} mile${distance !== 1 ? 's' : ''} away`;
    },
    
    /**
     * Format estimated time for display
     * 
     * @param {number} minutes - Time in minutes
     * @returns {string} Formatted time string
     */
    formatTime: function(minutes) {
        if (minutes < 1) {
            return 'Less than a minute';
        } else if (minutes === 1) {
            return '1 minute';
        } else if (minutes < 60) {
            return `${minutes} minutes`;
        } else {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            
            if (remainingMinutes === 0) {
                return `${hours} hour${hours !== 1 ? 's' : ''}`;
            } else {
                return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} min`;
            }
        }
    },
    
    /**
     * Check if collector has arrived (within threshold distance)
     * 
     * @param {number} distanceInMiles - Distance in miles
     * @param {number} threshold - Threshold distance in miles (default: 0.1)
     * @returns {boolean} True if collector has arrived, false otherwise
     */
    hasCollectorArrived: function(distanceInMiles, threshold = 0.1) {
        return distanceInMiles <= threshold;
    }
};

// Make it globally available
window.DistanceCalculator = DistanceCalculator;
