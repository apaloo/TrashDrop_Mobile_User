/**
 * TrashDrop Request Pickup Validation
 * Handles form validation for the request pickup form
 */

document.addEventListener('DOMContentLoaded', function() {
    // Form elements
    const savedLocationSelect = document.getElementById('saved-location');
    const bagsCountSelect = document.getElementById('bags-count');
    const prioritySelect = document.getElementById('priority');
    const wasteTypeRadios = document.querySelectorAll('input[name="waste-type"]');
    const additionalNotesTextarea = document.getElementById('additional-notes');
    const requestButton = document.getElementById('request-pickup-btn');
    
    // Initialize validation
    initFormValidation();
    
    /**
     * Initialize form validation
     */
    function initFormValidation() {
        // Mark required fields with asterisks
        markRequiredFields();
        
        // Add validation to the request button
        if (requestButton) {
            requestButton.addEventListener('click', function(e) {
                if (!validateForm()) {
                    e.preventDefault();
                    e.stopPropagation();
                    showValidationErrors();
                }
                // If valid, the form submission will continue
            });
        }
    }
    
    /**
     * Mark required fields with red asterisks
     */
    function markRequiredFields() {
        document.querySelectorAll('label.form-label:not(.optional-field)').forEach(label => {
            if (!label.querySelector('.required-indicator')) {
                const requiredIndicator = document.createElement('span');
                requiredIndicator.className = 'required-indicator text-danger ms-1';
                requiredIndicator.textContent = '*';
                label.appendChild(requiredIndicator);
            }
        });
    }
    
    /**
     * Validate the entire form
     * @return {boolean} - Whether the form is valid
     */
    function validateForm() {
        let isValid = true;
        
        // Validate location selection
        if (savedLocationSelect && savedLocationSelect.value === "") {
            isValid = false;
            savedLocationSelect.classList.add('is-invalid');
        } else if (savedLocationSelect) {
            savedLocationSelect.classList.remove('is-invalid');
            savedLocationSelect.classList.add('is-valid');
        }
        
        // Validate bags count
        if (bagsCountSelect && bagsCountSelect.value === "") {
            isValid = false;
            bagsCountSelect.classList.add('is-invalid');
        } else if (bagsCountSelect) {
            bagsCountSelect.classList.remove('is-invalid');
            bagsCountSelect.classList.add('is-valid');
        }
        
        // Validate priority
        if (prioritySelect && prioritySelect.value === "") {
            isValid = false;
            prioritySelect.classList.add('is-invalid');
        } else if (prioritySelect) {
            prioritySelect.classList.remove('is-invalid');
            prioritySelect.classList.add('is-valid');
        }
        
        // Validate waste type selection
        let wasteTypeSelected = false;
        wasteTypeRadios.forEach(radio => {
            if (radio.checked) {
                wasteTypeSelected = true;
            }
        });
        
        if (!wasteTypeSelected) {
            isValid = false;
            document.querySelector('.waste-type-container').classList.add('was-validated');
        }
        
        // Additional notes is optional, so no validation needed
        
        return isValid;
    }
    
    /**
     * Show validation errors to the user
     */
    function showValidationErrors() {
        // Display an alert for validation errors
        const alertContainer = document.createElement('div');
        alertContainer.className = 'alert alert-danger alert-dismissible fade show mt-3';
        alertContainer.innerHTML = `
            <strong><i class="bi bi-exclamation-triangle-fill me-2"></i>Please correct the following:</strong>
            <ul class="mb-0 mt-2">
                ${savedLocationSelect && savedLocationSelect.value === "" ? '<li>Select a saved location</li>' : ''}
                ${bagsCountSelect && bagsCountSelect.value === "" ? '<li>Select number of bags</li>' : ''}
                ${prioritySelect && prioritySelect.value === "" ? '<li>Select priority level</li>' : ''}
                ${!document.querySelector('input[name="waste-type"]:checked') ? '<li>Select waste type</li>' : ''}
            </ul>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        // Remove any existing alerts first
        const existingAlert = document.querySelector('.alert-danger');
        if (existingAlert) {
            existingAlert.remove();
        }
        
        // Insert the alert at the top of the form
        document.querySelector('.form-section').prepend(alertContainer);
        
        // Scroll to the alert
        alertContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
});
