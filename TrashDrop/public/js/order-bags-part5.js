// Load user addresses from the profile
async function loadUserAddresses() {
  try {
    // Get the address select element
    const addressSelect = document.getElementById('delivery-address');
    
    // Clear existing options except the default
    while (addressSelect.options.length > 1) {
      addressSelect.remove(1);
    }
    
    // Try to fetch addresses from profile
    let addresses = [];
    
    // Try different sources for addresses
    if (window.ProfileManager && typeof window.ProfileManager.getAddresses === 'function') {
      addresses = await window.ProfileManager.getAddresses();
    } else if (localStorage.getItem('user_addresses')) {
      // Fallback to localStorage if available
      try {
        addresses = JSON.parse(localStorage.getItem('user_addresses') || '[]');
      } catch (e) {
        console.warn('Failed to parse addresses from localStorage');
      }
    }
    
    // Add each address as an option
    addresses.forEach(address => {
      const option = document.createElement('option');
      option.value = address.id;
      option.textContent = `${address.name} - ${address.address}, ${address.city}, ${address.state} ${address.zip}`;
      addressSelect.appendChild(option);
    });
    
    // Update form validation
    validateOrderForm();
  } catch (error) {
    console.error('Error loading addresses:', error);
    showOrderBagsAlert('Failed to load delivery addresses. Please try again.', 'warning');
  }
}
