/**
 * TrashDrop Request Pickup Validation
 * Adds validation to the Request Pickup form
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
    
    // Enhance the original submitPickupRequest function with validation
    const originalSubmitFunction = window.submitPickupRequest;
    
    if (typeof originalSubmitFunction === 'function') {
        // Store the original function reference
        window.originalSubmitPickupRequest = originalSubmitFunction;
        
        // Override with validation-enhanced version
        window.submitPickupRequest = function() {
            // Validate form fields
            if (!validatePickupRequestForm()) {
                return;
            }
            
            // If validation passes, call the original function
            window.originalSubmitPickupRequest();
        };
    }
    
    // Add event listener to the submit button
    const submitButton = document.getElementById('request-pickup-btn');
    if (submitButton) {
        // Remove inline onclick handler
        submitButton.removeAttribute('onclick');
        
        // Add event listener
        submitButton.addEventListener('click', function(e) {
            e.preventDefault();
            window.submitPickupRequest();
        });
    }
    
    // Initialize validation indicators
    FormValidator.markRequiredFields();
});

/**
 * Validate the pickup request form
 * @return {boolean} - Whether form is valid
 */
function validatePickupRequestForm() {
    // Define fields to validate
    const fieldsConfig = {
        'saved-location': {
            required: true,
            label: 'Pickup Location',
            errorMessage: 'Please select a location'
        },
        'bags-count': {
            required: true,
            label: 'Number of Bags',
            errorMessage: 'Please select the number of bags'
        },
        'priority': {
            required: true,
            label: 'Priority',
            errorMessage: 'Please select a priority level'
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
