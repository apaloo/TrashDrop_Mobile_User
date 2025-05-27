/**
 * TrashDrop Order Bags Validation
 * Adds validation to the Order Trash Bags modal form
 */

document.addEventListener('DOMContentLoaded', function() {
    // Mark all notes/comments/description fields as optional
    const optionalFields = ['delivery-notes', 'notes', 'comments', 'description', 'additional-notes', 'remarks'];
    
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
    
    // Initialize validation indicators for required fields
    FormValidator.markRequiredFields();
    
    // Add validation to the submit button
    const submitButton = document.getElementById('submit-order-bags');
    if (submitButton) {
        // We'll use this to override the existing click handler
        // Store the original event handler first
        const originalSubmitOrderBags = window.submitOrderBags;
        
        if (typeof originalSubmitOrderBags === 'function') {
            // Override the submit function with our validation
            window.submitOrderBags = function(event) {
                // Run validation before proceeding with submission
                if (!validateOrderBagsForm()) {
                    return false;
                }
                
                // If validation passes, proceed with the original submission logic
                return originalSubmitOrderBags.call(this, event);
            };
        }
    }
    
    // Setup validation triggers
    setupValidationTriggers();
});

/**
 * Setup event listeners for form fields that trigger validation
 */
function setupValidationTriggers() {
    // Address selection
    const addressSelect = document.getElementById('delivery-address');
    if (addressSelect) {
        addressSelect.addEventListener('change', function() {
            FormValidator.highlightField(this, !this.value);
            updateFormValidity();
        });
    }
    
    // Bag type checkboxes
    const bagTypeCheckboxes = [
        document.getElementById('general-bags'),
        document.getElementById('recycling-bags'),
        document.getElementById('organic-bags'),
        document.getElementById('hazardous-bags')
    ];
    
    bagTypeCheckboxes.forEach(checkbox => {
        if (checkbox) {
            checkbox.addEventListener('change', function() {
                validateBagSelection();
                updateFormValidity();
            });
        }
    });
    
    // Terms agreement
    const termsCheckbox = document.getElementById('agree-terms');
    if (termsCheckbox) {
        termsCheckbox.addEventListener('change', function() {
            FormValidator.highlightField(this.parentElement, !this.checked);
            updateFormValidity();
        });
    }
}

/**
 * Validate the order bags form
 * @return {boolean} - Whether form is valid
 */
function validateOrderBagsForm() {
    // Check delivery address
    const addressValid = validateDeliveryAddress();
    
    // Check bag selection
    const bagSelectionValid = validateBagSelection();
    
    // Check terms agreement
    const termsValid = validateTermsAgreement();
    
    // Show overall validation message if any field is invalid
    if (!addressValid || !bagSelectionValid || !termsValid) {
        const missingFields = [];
        
        if (!addressValid) missingFields.push('Delivery Address');
        if (!bagSelectionValid) missingFields.push('Bag Selection');
        if (!termsValid) missingFields.push('Terms Agreement');
        
        FormValidator.showValidationError(missingFields);
        return false;
    }
    
    return true;
}

/**
 * Validate delivery address selection
 * @return {boolean} - Whether address is selected
 */
function validateDeliveryAddress() {
    const addressSelect = document.getElementById('delivery-address');
    
    if (!addressSelect || !addressSelect.value) {
        FormValidator.highlightField(addressSelect, true, 'Please select a delivery address');
        return false;
    }
    
    FormValidator.highlightField(addressSelect, false);
    return true;
}

/**
 * Validate that at least one bag type is selected
 * @return {boolean} - Whether at least one bag is selected
 */
function validateBagSelection() {
    const bagTypeContainer = document.querySelector('.row.g-2');
    const generalBags = document.getElementById('general-bags');
    const recyclingBags = document.getElementById('recycling-bags');
    const organicBags = document.getElementById('organic-bags');
    const hazardousBags = document.getElementById('hazardous-bags');
    
    const hasBagSelected = generalBags.checked || recyclingBags.checked || 
                          organicBags.checked || hazardousBags.checked;
    
    if (!hasBagSelected) {
        FormValidator.highlightField(bagTypeContainer, true, 'Please select at least one bag type');
        return false;
    }
    
    FormValidator.highlightField(bagTypeContainer, false);
    return true;
}

/**
 * Validate terms agreement
 * @return {boolean} - Whether terms are agreed to
 */
function validateTermsAgreement() {
    const termsCheckbox = document.getElementById('agree-terms');
    const termsContainer = termsCheckbox.parentElement;
    
    if (!termsCheckbox.checked) {
        FormValidator.highlightField(termsContainer, true, 'Please agree to the terms and conditions');
        return false;
    }
    
    FormValidator.highlightField(termsContainer, false);
    return true;
}

/**
 * Update form validity and submit button state
 * This is called whenever a form field changes
 */
function updateFormValidity() {
    const addressValid = !!document.getElementById('delivery-address').value;
    
    const generalBags = document.getElementById('general-bags');
    const recyclingBags = document.getElementById('recycling-bags');
    const organicBags = document.getElementById('organic-bags');
    const hazardousBags = document.getElementById('hazardous-bags');
    
    const hasBagSelected = generalBags.checked || recyclingBags.checked || 
                          organicBags.checked || hazardousBags.checked;
                          
    const termsAgreed = document.getElementById('agree-terms').checked;
    
    // Update the submit button state
    const submitButton = document.getElementById('submit-order-bags');
    if (submitButton) {
        submitButton.disabled = !(addressValid && hasBagSelected && termsAgreed);
    }
}
