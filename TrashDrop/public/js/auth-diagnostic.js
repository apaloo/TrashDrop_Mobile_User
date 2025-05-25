/**
 * Auth Diagnostic Tool
 * This script helps diagnose authentication issues by checking token storage and formats
 */

(function() {
    console.log('🔍 Running Authentication Diagnostic...');
    
    // Check all possible token storage locations
    const tokenLocations = [
        { key: 'token', storage: localStorage },
        { key: 'jwt_token', storage: localStorage },
        { key: 'trashdrop.token', storage: localStorage },
        { key: 'supabase.auth.token', storage: localStorage },
        { key: 'token', storage: sessionStorage },
        { key: 'jwt_token', storage: sessionStorage },
        { key: 'trashdrop.token', storage: sessionStorage },
        { key: 'supabase.auth.token', storage: sessionStorage }
    ];
    
    console.log('📊 Token Storage Check:');
    let tokensFound = 0;
    
    tokenLocations.forEach(location => {
        const token = location.storage.getItem(location.key);
        if (token) {
            tokensFound++;
            console.log(`✅ Found token in ${location.storage === localStorage ? 'localStorage' : 'sessionStorage'}.${location.key}`);
            console.log(`   Token format: ${token.substring(0, 10)}... (${token.length} chars)`);
            
            // Check if token format is as expected
            if (token.startsWith('Bearer ')) {
                console.log('   ⚠️ WARNING: Token already has Bearer prefix, which should not be stored this way');
            } else if (token.startsWith('dev-token-')) {
                console.log('   ℹ️ Development token format detected');
            }
        }
    });
    
    if (tokensFound === 0) {
        console.log('❌ No tokens found in any storage location');
        console.log('   Creating a development token for testing...');
        
        // Create a development token for testing
        const mockToken = 'dev-token-user' + Date.now();
        localStorage.setItem('token', mockToken);
        console.log(`   Created development token: ${mockToken}`);
        console.log('   Please refresh the page to use this token');
    }
    
    // Test the AuthHelper if available
    if (window.AuthHelper) {
        console.log('\n📋 AuthHelper Diagnostic:');
        
        // Test token retrieval
        const token = window.AuthHelper.getToken();
        console.log(`Token retrieval: ${token ? '✅ Success' : '❌ Failed'}`);
        if (token) {
            console.log(`Retrieved token: ${token.substring(0, 10)}...`);
        }
        
        // Test dev token generation
        const devToken = window.AuthHelper.getDevToken();
        console.log(`Dev token generation: ${devToken ? '✅ Success' : '❌ Failed'}`);
        if (devToken) {
            console.log(`Generated dev token: ${devToken.substring(0, 15)}...`);
        }
        
        // Test auth headers
        const headers = window.AuthHelper.getAuthHeaders();
        console.log(`Auth headers generation: ${headers.Authorization ? '✅ Success' : '❌ Failed'}`);
        if (headers.Authorization) {
            console.log(`Auth header value: ${headers.Authorization.substring(0, 15)}...`);
        }
    } else {
        console.log('\n❌ AuthHelper not found. Make sure auth-helper.js is loaded before this script.');
    }
    
    // Provide direct fix
    console.log('\n🔧 Attempting direct fix...');
    
    // Ensure token exists in the expected format
    const existingToken = localStorage.getItem('jwt_token') || 
                         localStorage.getItem('trashdrop.token') || 
                         sessionStorage.getItem('jwt_token') || 
                         sessionStorage.getItem('trashdrop.token');
    
    if (existingToken) {
        console.log('   Found existing token, ensuring it is stored in all locations');
        localStorage.setItem('token', existingToken);
        console.log('   ✅ Token added to localStorage.token');
    } else {
        // Create emergency dev token
        const emergencyToken = 'dev-token-emergency' + Date.now();
        localStorage.setItem('token', emergencyToken);
        localStorage.setItem('jwt_token', emergencyToken);
        localStorage.setItem('trashdrop.token', emergencyToken);
        console.log(`   ✅ Created emergency token: ${emergencyToken}`);
    }
    
    console.log('\n✅ Diagnostic complete. Please refresh the page to apply fixes.');
})();
