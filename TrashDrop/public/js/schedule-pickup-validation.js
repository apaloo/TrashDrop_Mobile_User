/**
 * TrashDrop Schedule Pickup Validation
 * Adds validation to the Schedule Pickup form
 */

document.addEventListener('DOMContentLoaded', function() {
    // Mark all notes/comments/description fields as optional
    const optionalFields = ['notes', 'comments', 'description', 'additional-notes', 'remarks'];
    
    // Find and mark all optional field labels
    optionalFields.forEach(field => {
        const fieldLabel = document.querySelector(`label[for="${field}"]`);
        if (fieldLabel) {
            fieldLabel.classList.add('optional-field');
        }
    });
    
    // Also find fields with 'optional' in the label text
    document.querySelectorAll('label').forEach(label => {
        if (label.textContent.toLowerCase().includes('optional')) {
            label.classList.add('optional-field');
        }
    });
    
    // Initialize validation indicators
    FormValidator.markRequiredFields();
    
    // Add event listener to the submit button
    const submitButton = document.getElementById('schedule-pickup-btn');
    if (submitButton) {
        const originalOnClick = submitButton.onclick;
        
        submitButton.onclick = function(e) {
            e.preventDefault();
            
            // Validate form before submission
            if (!validateSchedulePickupForm()) {
                return false;
            }
            
            // If original click handler exists, call it
            if (typeof originalOnClick === 'function') {
                return originalOnClick.call(this, e);
            }
            
            // Otherwise use default submission
            schedulePickup();
            return true;
        };
    }
});

/**
 * Validate the schedule pickup form
 * @return {boolean} - Whether form is valid
 */
function validateSchedulePickupForm() {
    // Define fields to validate
    const fieldsConfig = {
        'location': {
            required: true,
            label: 'Address',
            errorMessage: 'Please enter a pickup address'
        },
        'frequency': {
            required: true,
            label: 'Pickup Frequency',
            errorMessage: 'Please select a pickup frequency'
        },
        'start-date': {
            required: true,
            label: 'Start Date',
            errorMessage: 'Please select a start date',
            validationFn: function(value) {
                // Check if date is not in the past
                const selectedDate = new Date(value);
                const today = new Date();
                today.setHours(0, 0, 0, 0); // Set to beginning of day
                
                return selectedDate >= today;
            }
        },
        'preferred-time': {
            required: true,
            label: 'Preferred Time',
            errorMessage: 'Please select a preferred time'
        },
        'bags-count': {
            required: true,
            label: 'Number of Bags',
            errorMessage: 'Please select the number of bags'
        },
        'waste-general': {
            required: true,
            label: 'Waste Type',
            errorMessage: 'Please select a waste type'
        },
        'notes': {
            required: false,
            label: 'Additional Notes'
        }
    };
    
    // Add validation to the map
    const mapElement = document.getElementById('pickup-map');
    if (mapElement) {
        const latInput = document.getElementById('latitude');
        const lngInput = document.getElementById('longitude');
        
        // Check if location coordinates are valid
        fieldsConfig['pickup-map'] = {
            required: true,
            label: 'Map Location',
            errorMessage: 'Please select a valid location on the map',
            validationFn: function() {
                const lat = parseFloat(latInput?.value);
                const lng = parseFloat(lngInput?.value);
                return !isNaN(lat) && !isNaN(lng);
            }
        };
    }
    
    // Run validation
    return FormValidator.validateForm(fieldsConfig);
}

/**
 * Submit the pickup schedule request
 */
function schedulePickup() {
    // Get form values
    const location = document.getElementById('location').value;
    const latitude = document.getElementById('latitude').value;
    const longitude = document.getElementById('longitude').value;
    const frequency = document.getElementById('frequency').value;
    const startDate = document.getElementById('start-date').value;
    const preferredTime = document.getElementById('preferred-time').value;
    const bagsCount = document.getElementById('bags-count').value;
    const wasteType = document.querySelector('input[name="waste-type"]:checked').value;
    const notes = document.getElementById('notes').value;
    
    // Disable submit button to prevent double submission
    const submitButton = document.getElementById('schedule-pickup-btn');
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
    
    // Create pickup schedule data
    const scheduleData = {
        location,
        coordinates: `POINT(${longitude} ${latitude})`,
        frequency,
        start_date: startDate,
        preferred_time: preferredTime,
        bags_count: bagsCount,
        waste_type: wasteType,
        notes,
        status: 'active',
        created_at: new Date().toISOString()
    };
    
    // For demo purposes, store in localStorage
    console.log('Creating schedule:', scheduleData);
    
    // Store in localStorage for demonstration
    const schedules = JSON.parse(localStorage.getItem('pickup_schedules') || '[]');
    schedules.push(scheduleData);
    localStorage.setItem('pickup_schedules', JSON.stringify(schedules));
    
    // Show success message
    alert('Pickup schedule created successfully!');
    
    // Redirect to dashboard
    setTimeout(() => {
        window.location.href = '/dashboard';
    }, 1000);
}
