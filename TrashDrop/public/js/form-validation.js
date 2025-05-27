/**
 * TrashDrop Form Validation Utility
 * Handles form validations across the application
 */

const FormValidator = {
    /**
     * Validates form fields and highlights missing required fields
     * @param {Object} fieldsConfig - Configuration of fields to validate
     * @return {boolean} - Whether the form is valid
     * 
     * Field config format:
     * {
     *   fieldId: {
     *     required: true/false,
     *     errorMessage: "Error message to show",
     *     validationFn: (value) => boolean - Custom validation function (optional)
     *   }
     * }
     */
    validateForm: function(fieldsConfig) {
        let isValid = true;
        const missingFields = [];
        
        // Clear previous validation
        this.clearValidation();
        
        // Check each field in config
        for (const fieldId in fieldsConfig) {
            const config = fieldsConfig[fieldId];
            const field = document.getElementById(fieldId);
            
            if (!field) continue;
            
            let fieldValue;
            let isFieldValid = true;
            
            // Get field value based on type
            if (field.type === 'radio' || field.type === 'checkbox') {
                // For radio buttons, check if any with the same name is checked
                const checkedField = document.querySelector(`input[name="${field.name}"]:checked`);
                fieldValue = checkedField ? checkedField.value : '';
                isFieldValid = !!checkedField;
            } else if (field.tagName === 'SELECT') {
                fieldValue = field.value;
                isFieldValid = field.selectedIndex > 0; // First option is usually placeholder
            } else {
                fieldValue = field.value.trim();
                isFieldValid = fieldValue !== '';
            }
            
            // Run custom validation if provided
            if (config.validationFn && isFieldValid) {
                isFieldValid = config.validationFn(fieldValue);
            }
            
            // Check if field is required and handle validation
            if (config.required && !isFieldValid) {
                isValid = false;
                missingFields.push(config.label || fieldId);
                this.highlightField(field, true, config.errorMessage);
            } else {
                this.highlightField(field, false);
            }
        }
        
        // Show error message if validation fails
        if (!isValid) {
            this.showValidationError(missingFields);
        }
        
        return isValid;
    },
    
    /**
     * Highlight a field as invalid
     * @param {HTMLElement} field - The field to highlight
     * @param {boolean} isInvalid - Whether the field is invalid
     * @param {string} errorMessage - Error message to display
     */
    highlightField: function(field, isInvalid, errorMessage = null) {
        // Handle different field types
        if (field.type === 'radio' || field.type === 'checkbox') {
            // For radio/checkbox, highlight the container
            const container = field.closest('.form-check') || 
                              field.closest('.form-group') || 
                              field.closest('.mb-3');
            
            if (container) {
                if (isInvalid) {
                    container.classList.add('border-danger', 'validation-error');
                    container.style.padding = '8px';
                    container.style.borderRadius = '4px';
                    container.style.border = '1px solid #dc3545';
                } else {
                    container.classList.remove('border-danger', 'validation-error');
                    container.style.padding = '';
                    container.style.border = '';
                }
                
                // Add error message if provided
                if (isInvalid && errorMessage) {
                    // Remove any existing error message
                    const existingError = container.querySelector('.validation-error-message');
                    if (existingError) existingError.remove();
                    
                    // Create new error message
                    const errorElement = document.createElement('div');
                    errorElement.className = 'validation-error-message text-danger small mt-1';
                    errorElement.innerHTML = `<i class="bi bi-exclamation-circle"></i> ${errorMessage}`;
                    container.appendChild(errorElement);
                }
            }
        } else {
            // For regular inputs, selects, textareas
            if (isInvalid) {
                field.classList.add('is-invalid', 'border-danger');
                
                // Add error message if provided
                if (errorMessage) {
                    // Check if error message element already exists
                    let errorElement = field.nextElementSibling;
                    if (!errorElement || !errorElement.classList.contains('invalid-feedback')) {
                        // Create error message element
                        errorElement = document.createElement('div');
                        errorElement.className = 'invalid-feedback';
                        field.parentNode.insertBefore(errorElement, field.nextSibling);
                    }
                    errorElement.textContent = errorMessage;
                }
            } else {
                field.classList.remove('is-invalid', 'border-danger');
            }
        }
        
        // Special handling for map container
        if (field.id === 'pickup-map' || field.id === 'dump-map' || field.id === 'map') {
            const mapContainer = field.closest('#map-container') || field.closest('.map-container');
            if (mapContainer) {
                if (isInvalid) {
                    mapContainer.classList.add('border-danger');
                    mapContainer.style.border = '1px solid #dc3545';
                } else {
                    mapContainer.classList.remove('border-danger');
                    mapContainer.style.border = '1px solid #dee2e6';
                }
            }
        }
    },
    
    /**
     * Show validation error message
     * @param {Array} missingFields - Array of missing field names
     */
    showValidationError: function(missingFields) {
        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('validation-toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'validation-toast-container';
            toastContainer.style.position = 'fixed';
            toastContainer.style.bottom = '20px';
            toastContainer.style.left = '50%';
            toastContainer.style.transform = 'translateX(-50%)';
            toastContainer.style.zIndex = '9999';
            document.body.appendChild(toastContainer);
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'toast align-items-center text-white bg-danger border-0';
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        
        // Toast content
        const toastContent = document.createElement('div');
        toastContent.className = 'd-flex';
        
        const toastBody = document.createElement('div');
        toastBody.className = 'toast-body';
        toastBody.innerHTML = `<strong>Please complete required fields:</strong><br>${missingFields.join(', ')}`;
        
        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'btn-close btn-close-white me-2 m-auto';
        closeButton.setAttribute('data-bs-dismiss', 'toast');
        closeButton.setAttribute('aria-label', 'Close');
        
        // Assemble toast
        toastContent.appendChild(toastBody);
        toastContent.appendChild(closeButton);
        toast.appendChild(toastContent);
        toastContainer.appendChild(toast);
        
        // Show toast
        const bsToast = new bootstrap.Toast(toast, { delay: 5000 });
        bsToast.show();
        
        // Scroll to first invalid field
        const firstInvalidField = document.querySelector('.is-invalid, .validation-error');
        if (firstInvalidField) {
            firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    },
    
    /**
     * Clear all validation styling
     */
    clearValidation: function() {
        // Clear invalid inputs
        document.querySelectorAll('.is-invalid, .border-danger').forEach(el => {
            el.classList.remove('is-invalid', 'border-danger');
        });
        
        // Clear validation error messages
        document.querySelectorAll('.validation-error-message, .invalid-feedback').forEach(el => {
            el.remove();
        });
        
        // Clear validation styling from containers
        document.querySelectorAll('.validation-error').forEach(el => {
            el.classList.remove('validation-error');
            el.style.padding = '';
            el.style.border = '';
        });
        
        // Reset map containers
        document.querySelectorAll('#map-container, .map-container').forEach(el => {
            el.style.border = '1px solid #dee2e6';
        });
    },
    
    /**
     * Add visual indicators for required fields
     */
    markRequiredFields: function() {
        // Add required indicator to form labels that aren't optional
        document.querySelectorAll('label.form-label').forEach(label => {
            // Skip labels that are explicitly marked as optional or contain 'optional' text
            if (label.classList.contains('optional-field') || 
                label.textContent.toLowerCase().includes('optional')) {
                // Ensure this label has the optional-field class
                label.classList.add('optional-field');
                return;
            }
            
            // Only add the asterisk if it doesn't already have one
            if (!label.querySelector('.required-indicator')) {
                const requiredIndicator = document.createElement('span');
                requiredIndicator.className = 'required-indicator text-danger ms-1';
                requiredIndicator.textContent = '*';
                label.appendChild(requiredIndicator);
            }
        });
        
        // Add "Optional" text to optional field labels
        document.querySelectorAll('label.optional-field').forEach(label => {
            if (!label.querySelector('.optional-text')) {
                const optionalText = document.createElement('span');
                optionalText.className = 'optional-text text-muted small ms-2';
                optionalText.textContent = '(Optional)';
                label.appendChild(optionalText);
            }
        });
        
        // Add required note to form headers if not already present
        const formSections = document.querySelectorAll('.form-section');
        if (formSections.length > 0 && !document.querySelector('.required-fields-note')) {
            const requiredNote = document.createElement('div');
            requiredNote.className = 'required-fields-note text-danger small mb-3';
            requiredNote.innerHTML = '<i class="bi bi-info-circle"></i> Fields marked with * are required';
            
            // Insert after the first h1 or h2 element
            const header = document.querySelector('h1, h2');
            if (header) {
                header.parentNode.insertBefore(requiredNote, header.nextSibling);
            } else {
                // If no header, insert at the beginning of the first form section
                formSections[0].insertBefore(requiredNote, formSections[0].firstChild);
            }
        }
    }
};

// Initialize validation on DOM load
document.addEventListener('DOMContentLoaded', function() {
    // Mark required fields when page loads
    FormValidator.markRequiredFields();
});
