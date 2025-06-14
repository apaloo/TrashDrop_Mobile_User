# Authentication Migration Guide

This guide outlines the steps to migrate from the old authentication system to the new centralized `AuthService`.

## What's New

1. **Centralized Authentication Logic**
   - All auth-related code is now in `public/js/auth-service.js`
   - Single source of truth for auth state
   - Consistent error handling and session management

2. **Key Benefits**
   - Simplified authentication flow
   - Better session management with auto-refresh
   - Improved error handling
   - Consistent state across the application
   - Easier maintenance and updates

## Migration Steps

### 1. Update HTML Files

Replace all script includes for old auth files with the new `auth-service.js`:

```html
<!-- Remove these old scripts -->
<script src="/js/auth.js"></script>
<script src="/js/auth-manager.js"></script>
<script src="/js/auth-stabilizer.js"></script>

<!-- Add this instead -->
<script src="/js/auth-service.js" type="module"></script>
```

### 2. Update JavaScript Files

#### Old Way (Before)

```javascript
// Checking auth state
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  window.location.href = '/login.html';
  return;
}

// Sign in
const { error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

// Sign out
const { error } = await supabase.auth.signOut();
```

#### New Way (After)

```javascript
import { authService } from '/js/auth-service.js';

// Checking auth state
const { isAuthenticated } = authService.getAuthState();
if (!isAuthenticated) {
  window.location.href = '/login.html';
  return;
}

// Sign in
const { user, error } = await authService.signInWithEmail({ email, password });

// Sign out
const { error } = await authService.signOut();
```

### 3. Listen for Auth State Changes

```javascript
// Subscribe to auth state changes
const unsubscribe = authService.onAuthStateChanged(({ isAuthenticated, user }) => {
  if (isAuthenticated) {
    // User is signed in
    console.log('User:', user.email);
  } else {
    // User is signed out
    console.log('User signed out');
  }
});

// Later, to unsubscribe
// unsubscribe();
```

### 4. Handle Protected Routes

Create a utility function to protect routes:

```javascript
// utils/auth-guard.js
export async function requireAuth() {
  const { isAuthenticated } = authService.getAuthState();
  
  if (!isAuthenticated) {
    // Save the current URL for redirecting back after login
    sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
    window.location.href = '/login.html';
    return false;
  }
  
  return true;
}
```

### 5. Update Login/Logout Flows

#### Login Page

```javascript
import { authService } from '/js/auth-service.js';

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  const { user, error } = await authService.signInWithEmail({ email, password });
  
  if (error) {
    // Show error to user
    showError(error.message);
    return;
  }
  
  // Redirect to dashboard or saved URL
  const redirectTo = sessionStorage.getItem('redirectAfterLogin') || '/dashboard.html';
  sessionStorage.removeItem('redirectAfterLogin');
  window.location.href = redirectTo;
});
```

#### Logout Button

```javascript
import { authService } from '/js/auth-service.js';

document.getElementById('logout-button').addEventListener('click', async () => {
  await authService.signOut();
  window.location.href = '/login.html';
});
```

## Backward Compatibility

The new `AuthService` is designed to work alongside the old system during migration. You can gradually update your codebase.

## Testing

1. Test login/logout flows
2. Verify session persistence across page refreshes
3. Test session expiration and auto-refresh
4. Verify protected routes
5. Test across multiple tabs

## Troubleshooting

### Common Issues

1. **Session not persisting**
   - Check localStorage for `trashdrop_auth` key
   - Verify session expiration time

2. **Auth state not updating**
   - Ensure you're using `onAuthStateChanged` for reactive updates
   - Check for errors in the console

3. **CORS issues**
   - Verify Supabase CORS settings in the dashboard
   - Check network requests in dev tools

## Cleanup (After Migration)

Once migration is complete, you can safely remove:
- `public/js/auth.js`
- `public/js/auth-manager.js`
- `public/js/auth-stabilizer.js`
- Any other old auth-related files

## Support

For any issues, please refer to the documentation or contact support.
