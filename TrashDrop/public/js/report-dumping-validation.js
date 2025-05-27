/**
 * TrashDrop Report Dumping Validation
 * Adds validation to the Report Dumping form
 */

document.addEventListener('DOMContentLoaded', function() {
    // Explicitly mark the description field as optional
    const descriptionLabel = document.querySelector('label[for="description"]');
    if (descriptionLabel) {
        descriptionLabel.classList.add('optional-field');
        // Also add '(Optional)' text if not already there
        if (!descriptionLabel.textContent.includes('Optional')) {
            descriptionLabel.textContent += ' (Optional)';
        }
    }
    
    // Mark other comment/note fields as optional
    const optionalFields = ['comments', 'notes', 'additional-notes', 'remarks'];
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
    
    // Make sure description field is also removed from required fields
    const descriptionField = document.getElementById('description');
    if (descriptionField) {
        descriptionField.removeAttribute('required');
    }
    
    // Add event listener to the submit button
    const submitButton = document.getElementById('submit-report');
    if (submitButton) {
        submitButton.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Run validation before proceeding with submission
            if (!validateReportDumpingForm()) {
                return false;
            }
            
            // If validation passes, proceed with the original submission logic
            submitReport();
            return true;
        });
    }
    
    // Initialize validation indicators
    FormValidator.markRequiredFields();
    
    // Setup click handlers for trash type and size selection
    setupTrashTypeSelectors();
    setupSizeSelectors();
});

/**
 * Setup click handlers for trash type selection
 */
function setupTrashTypeSelectors() {
    const trashTypeButtons = document.querySelectorAll('.trash-type-btn');
    
    // Apply visual selection styling when buttons are clicked
    trashTypeButtons.forEach(button => {
        // First, add the click event handler
        button.addEventListener('click', function(e) {
            e.preventDefault(); // Prevent default button behavior
            
            // Remove selected class from all buttons
            trashTypeButtons.forEach(btn => {
                btn.classList.remove('selected');
            });
            
            // Add selected class to clicked button
            this.classList.add('selected');
            
            // Store the selected waste type in a hidden input or data attribute
            const wasteType = this.getAttribute('data-trash-type');
            const wasteTypeInput = document.getElementById('selected-waste-type') || document.createElement('input');
            if (!wasteTypeInput.id) {
                wasteTypeInput.type = 'hidden';
                wasteTypeInput.id = 'selected-waste-type';
                document.querySelector('form') ? document.querySelector('form').appendChild(wasteTypeInput) : document.body.appendChild(wasteTypeInput);
            }
            wasteTypeInput.value = wasteType;
            
            // Remove validation error styling if present
            const wasteTypesContainer = document.querySelector('.waste-types');
            if (wasteTypesContainer) {
                FormValidator.highlightField(wasteTypesContainer, false);
                wasteTypesContainer.classList.remove('field-error');
                
                // Remove any error message if present
                const errorMsg = wasteTypesContainer.querySelector('.error-message');
                if (errorMsg) {
                    errorMsg.remove();
                }
            }
        });
    });
    
    // Check if there's already a pre-selected waste type and highlight it
    const selectedWasteType = document.getElementById('selected-waste-type')?.value;
    if (selectedWasteType) {
        const buttonToSelect = document.querySelector(`.trash-type-btn[data-trash-type="${selectedWasteType}"]`);
        if (buttonToSelect) {
            buttonToSelect.classList.add('selected');
        }
    }
}

/**
 * Setup click handlers for size selection
 */
function setupSizeSelectors() {
    const sizeButtons = document.querySelectorAll('.size-option');
    sizeButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove selected class from all buttons
            sizeButtons.forEach(btn => {
                btn.classList.remove('selected');
            });
            
            // Add selected class to clicked button
            this.classList.add('selected');
            
            // Remove validation error styling if present
            const sizeContainer = document.querySelector('.d-flex.justify-content-between.mb-3');
            if (sizeContainer) {
                FormValidator.highlightField(sizeContainer, false);
            }
        });
    });
}

/**
 * Validate the report dumping form
 * @return {boolean} - Whether form is valid
 */
function validateReportDumpingForm() {
    // Check photos - this is the only manual validation since it's unique
    const photosValid = validatePhotos();
    
    // Check map location
    const mapValid = validateMapLocation();
    
    // Check waste type
    const wasteTypeValid = validateWasteType();
    
    // Check size
    const sizeValid = validateSize();
    
    // Check priority
    const priorityValid = validatePriority();
    
    // Show overall validation message if any field is invalid
    if (!photosValid || !mapValid || !wasteTypeValid || !sizeValid || !priorityValid) {
        const missingFields = [];
        
        if (!photosValid) missingFields.push('Photos');
        if (!mapValid) missingFields.push('Location');
        if (!wasteTypeValid) missingFields.push('Waste Type');
        if (!sizeValid) missingFields.push('Size');
        if (!priorityValid) missingFields.push('Priority');
        
        FormValidator.showValidationError(missingFields);
        return false;
    }
    
    return true;
}

/**
 * Validate photos section
 * @return {boolean} - Whether photos are valid
 */
function validatePhotos() {
    const photoGrid = document.getElementById('photo-grid');
    const photos = photoGrid.querySelectorAll('.photo-item:not(.photo-placeholder)');
    
    // Check if at least one photo is added
    if (photos.length === 0) {
        FormValidator.highlightField(photoGrid, true, 'Please add at least one photo');
        return false;
    }
    
    FormValidator.highlightField(photoGrid, false);
    return true;
}

/**
 * Validate map location
 * @return {boolean} - Whether location is valid
 */
function validateMapLocation() {
    const mapElement = document.getElementById('map');
    const latElement = document.getElementById('latitude');
    const lngElement = document.getElementById('longitude');
    
    if (!mapElement || !latElement || !lngElement) return false;
    
    const lat = parseFloat(latElement.textContent);
    const lng = parseFloat(lngElement.textContent);
    
    // Check if coordinates are valid
    if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
        FormValidator.highlightField(mapElement, true, 'Please select a valid location');
        return false;
    }
    
    FormValidator.highlightField(mapElement, false);
    return true;
}

/**
 * Validate waste type selection
 * @return {boolean} - Whether waste type is selected
 */
function validateWasteType() {
    const wasteTypesContainer = document.querySelector('.waste-types');
    const selectedType = wasteTypesContainer.querySelector('.trash-type-btn.selected');
    
    if (!selectedType) {
        FormValidator.highlightField(wasteTypesContainer, true, 'Please select a waste type');
        return false;
    }
    
    FormValidator.highlightField(wasteTypesContainer, false);
    return true;
}

/**
 * Validate size selection
 * @return {boolean} - Whether size is selected
 */
function validateSize() {
    const sizeContainer = document.querySelector('.d-flex.justify-content-between.mb-3');
    const selectedSize = sizeContainer.querySelector('.size-option.selected');
    
    if (!selectedSize) {
        FormValidator.highlightField(sizeContainer, true, 'Please select an approximate size');
        return false;
    }
    
    FormValidator.highlightField(sizeContainer, false);
    return true;
}

/**
 * Validate priority selection
 * @return {boolean} - Whether priority is selected
 */
function validatePriority() {
    const prioritySelect = document.getElementById('priority');
    
    if (!prioritySelect || !prioritySelect.value) {
        FormValidator.highlightField(prioritySelect, true, 'Please select a priority level');
        return false;
    }
    
    FormValidator.highlightField(prioritySelect, false);
    return true;
}
