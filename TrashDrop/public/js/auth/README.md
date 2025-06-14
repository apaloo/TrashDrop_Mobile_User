# Authentication System

This directory contains the new authentication system for TrashDrop, designed to be secure, maintainable, and user-friendly.

## Key Features

- **Centralized Authentication Logic**: Single source of truth for auth state
- **Robust Validation**: Consistent validation across all forms
- **Secure Storage**: Proper handling of tokens and session data
- **Better Error Handling**: User-friendly error messages
- **Loading States**: Clear UI feedback during async operations

## File Structure

```
public/js/auth/
├── handlers/
│   ├── login-handler.js    # Handles login form submission
│   └── logout-handler.js   # Handles logout functionality
└── utils/
    └── auth-utils.js     # Shared utilities for authentication
```

## Usage

### 1. Include Required Scripts

Add these scripts to your HTML (in this order):

```html
<!-- In your login.html -->
<script src="/js/auth/utils/auth-utils.js" type="module"></script>
<script src="/js/auth/handlers/login-handler.js" type="module"></script>
<script src="/js/auth/handlers/logout-handler.js" type="module"></script>
```

### 2. Login Form Example

```html
<form id="login-form">
  <div class="mb-3">
    <label for="email" class="form-label">Email address</label>
    <input type="email" class="form-control" id="email" name="email" required>
  </div>
  
  <div class="mb-3">
    <label for="password" class="form-label">Password</label>
    <input type="password" class="form-control" id="password" name="password" required>
  </div>
  
  <div class="mb-3 form-check">
    <input type="checkbox" class="form-check-input" id="remember-me" name="remember-me">
    <label class="form-check-label" for="remember-me">Remember me</label>
  </div>
  
  <button type="submit" class="btn btn-primary">
    <span>Sign In</span>
  </button>
</form>
```

### 3. Logout Button

```html
<button type="button" class="btn btn-outline-danger" data-logout>
  <i class="bi bi-box-arrow-right"></i> Sign Out
</button>
```

## API Reference

### AuthStorage

| Method | Description |
|--------|-------------|
| `clearAuthData()` | Clears all authentication-related data from storage |
| `getAuthData()` | Retrieves stored auth data |
| `setAuthData(data)` | Stores auth data |

### FormValidator

```javascript
const validator = new FormValidator('form-id')
  .addField('field-name', {
    required: true,
    type: 'email', // or 'text', 'password', etc.
    minLength: 6,
    pattern: /^[a-zA-Z0-9]+$/,
    customValidation: (value) => {
      // Return error message or null
    }
  });
```

### AuthUI

| Method | Description |
|--------|-------------|
| `setLoading(form, isLoading)` | Shows/hides loading state |
| `showErrors(form, errors)` | Displays form errors |
| `clearErrors(form)` | Clears error messages |

## Best Practices

1. **Always** use the provided utilities instead of directly accessing localStorage/sessionStorage
2. **Never** store sensitive information in client-side storage
3. **Always** validate on both client and server side
4. **Always** show appropriate loading states during async operations
5. **Always** provide clear error messages to users

## Error Handling

The system provides user-friendly error messages for common scenarios:
- Invalid credentials
- Network issues
- Session expiration
- Rate limiting
- Email verification requirements

## Security Considerations

- Uses HttpOnly cookies for session management
- Implements CSRF protection
- Validates all inputs on both client and server
- Implements rate limiting on authentication endpoints
- Uses secure storage practices for tokens

## Troubleshooting

### Common Issues

1. **Session not persisting**
   - Check if "Remember me" was checked during login
   - Verify localStorage is available and not full

2. **Login fails with no error**
   - Check browser console for errors
   - Verify network requests in DevTools
   - Ensure CORS is properly configured

3. **Logout not working**
   - Ensure all auth data is being cleared
   - Check for multiple logout buttons with different handlers

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT
