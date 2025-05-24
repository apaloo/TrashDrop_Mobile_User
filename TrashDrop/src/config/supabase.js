const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

// Environment settings
const isDevelopment = process.env.NODE_ENV !== 'production';

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL || 'https://cpeyavpxqcloupolbvyh.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwZXlhdnB4cWNsb3Vwb2xidnloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0OTY4OTYsImV4cCI6MjA2MTA3Mjg5Nn0.5rxsiRuLHCpeJZ5TqoIA5X4UwoAAuxIpNu_reafwwbQ';
const jwtSecret = process.env.JWT_SECRET || 'trash-drop-super-secret-jwt-key-for-development';

/**
 * Performance monitoring initialization
 * Will be populated with the dbMonitor instance when running in browser
 */
let dbMonitor = null;

/**
 * Create a performance-monitored wrapper around a Supabase client
 * @param {Object} client - Original Supabase client
 * @return {Object} - Wrapped client with performance monitoring
 */
function createMonitoredClient(client) {
  // If not running in browser or monitoring not available, return original client
  if (typeof window === 'undefined' || !window.dbMonitor) {
    console.log('DB monitoring not available in this environment');
    return client;
  }
  
  // Get the monitor instance
  dbMonitor = window.dbMonitor;
  console.log('DB performance monitoring enabled');
  
  // Create a wrapper for the 'from' method to monitor database operations
  const originalFrom = client.from;
  client.from = (table) => {
    const queryBuilder = originalFrom.call(client, table);
    
    // Wrap select operations
    const originalSelect = queryBuilder.select;
    queryBuilder.select = function(columns) {
      const query = originalSelect.call(this, columns);
      
      // Wrap execute
      const originalExecute = query.execute;
      query.execute = async function() {
        const trackFn = dbMonitor.trackOperation('select', table, { columns });
        const result = await originalExecute.apply(this, arguments);
        return trackFn(result);
      };
      
      // Wrap single
      const originalSingle = query.single;
      query.single = async function() {
        const trackFn = dbMonitor.trackOperation('select-single', table, { columns });
        const result = await originalSingle.apply(this, arguments);
        return trackFn(result);
      };
      
      // Handle filtering operations
      ['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'like', 'ilike', 'in', 'is'].forEach(op => {
        if (query[op]) {
          const originalOp = query[op];
          query[op] = function() {
            const filter = { operation: op, args: Array.from(arguments) };
            const resultQuery = originalOp.apply(this, arguments);
            
            // Wrap execute for filtered queries
            if (resultQuery.execute) {
              const originalFilterExecute = resultQuery.execute;
              resultQuery.execute = async function() {
                const trackFn = dbMonitor.trackOperation('select', table, { columns, filter });
                const result = await originalFilterExecute.apply(this, arguments);
                return trackFn(result);
              };
            }
            
            // Wrap single for filtered queries
            if (resultQuery.single) {
              const originalFilterSingle = resultQuery.single;
              resultQuery.single = async function() {
                const trackFn = dbMonitor.trackOperation('select-single', table, { columns, filter });
                const result = await originalFilterSingle.apply(this, arguments);
                return trackFn(result);
              };
            }
            
            return resultQuery;
          };
        }
      });
      
      return query;
    };
    
    // Wrap insert operations
    const originalInsert = queryBuilder.insert;
    queryBuilder.insert = async function(data) {
      const trackFn = dbMonitor.trackOperation('insert', table, { rowCount: Array.isArray(data) ? data.length : 1 });
      const result = await originalInsert.apply(this, arguments);
      return trackFn(result);
    };
    
    // Wrap update operations
    const originalUpdate = queryBuilder.update;
    queryBuilder.update = async function(data) {
      const trackFn = dbMonitor.trackOperation('update', table, { data });
      const result = await originalUpdate.apply(this, arguments);
      return trackFn(result);
    };
    
    // Wrap delete operations
    const originalDelete = queryBuilder.delete;
    queryBuilder.delete = async function() {
      const trackFn = dbMonitor.trackOperation('delete', table, {});
      const result = await originalDelete.apply(this, arguments);
      return trackFn(result);
    };
    
    // Handle 'eq' as direct property of queryBuilder (used for update/delete with 'eq' filter)
    const originalEq = queryBuilder.eq;
    if (originalEq) {
      queryBuilder.eq = function() {
        const eqQuery = originalEq.apply(this, arguments);
        const filter = { operation: 'eq', args: Array.from(arguments) };
        
        // Wrap delete for eq-filtered queries
        if (eqQuery.delete) {
          const originalEqDelete = eqQuery.delete;
          eqQuery.delete = async function() {
            const trackFn = dbMonitor.trackOperation('delete', table, { filter });
            const result = await originalEqDelete.apply(this, arguments);
            return trackFn(result);
          };
        }
        
        // Wrap update for eq-filtered queries
        if (eqQuery.update) {
          const originalEqUpdate = eqQuery.update;
          eqQuery.update = async function(data) {
            const trackFn = dbMonitor.trackOperation('update', table, { filter, data });
            const result = await originalEqUpdate.apply(this, arguments);
            return trackFn(result);
          };
        }
        
        return eqQuery;
      };
    }
    
    return queryBuilder;
  };
  
  // Add performance monitoring methods to the client
  client.performance = {
    getMetrics: (type) => dbMonitor.getMetrics(type),
    resetMetrics: () => dbMonitor.resetMetrics(),
    configure: (config) => dbMonitor.configure(config)
  };
  
  return client;
}

// JWT helper functions
const jwtHelpers = {
  // Generate a JWT token for a user
  generateToken: (user) => {
    const payload = {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role || 'user',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };
    
    return jwt.sign(payload, jwtSecret);
  },
  
  // Verify a JWT token
  verifyToken: (token) => {
    try {
      const decoded = jwt.verify(token, jwtSecret);
      return { valid: true, decoded };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  },
  
  // Decode a JWT token without verification (for debugging)
  decodeToken: (token) => {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  }
};

// Create a Supabase client with error handling
let supabase;
try {
  // Create the Supabase client with enhanced JWT auth options
  const rawClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: {
        // We can customize storage if needed
        getItem: (key) => {
          if (typeof localStorage !== 'undefined') {
            return localStorage.getItem(key);
          }
          return null;
        },
        setItem: (key, value) => {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(key, value);
          }
        },
        removeItem: (key) => {
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(key);
          }
        }
      }
    }
  });
  
  // Wrap the client with performance monitoring
  supabase = rawClient;
  console.log('Supabase client initialized successfully with URL:', supabaseUrl);
  
  // Note: The actual performance monitoring wrapper will be applied
  // when this module is imported in the browser environment
  if (typeof window !== 'undefined') {
    // We'll apply monitoring after the dbMonitor is loaded
    setTimeout(() => {
      if (window.dbMonitor) {
        supabase = createMonitoredClient(rawClient);
      }
    }, 0);
  }
} catch (error) {
  console.error('Error initializing Supabase client:', error.message);
  
  // In development mode, provide a mock client for easier testing
  if (isDevelopment) {
    console.log('Creating mock Supabase client for development');
    supabase = {
      from: (table) => ({
        select: (columns) => ({
          eq: (column, value) => ({
            single: () => Promise.resolve({ data: null, error: null })
          }),
          single: () => Promise.resolve({ data: null, error: null }),
          in: () => Promise.resolve({ data: [], error: null }),
          execute: () => Promise.resolve({ data: [], error: null })
        }),
        insert: (data) => Promise.resolve({ data, error: null }),
        update: (data) => Promise.resolve({ data, error: null }),
        delete: () => Promise.resolve({ data: null, error: null }),
        eq: () => ({
          delete: () => Promise.resolve({ data: null, error: null }),
          single: () => Promise.resolve({ data: null, error: null })
        })
      }),
      auth: {
        signUp: () => Promise.resolve({ data: { user: { id: 'mock-id' } }, error: null }),
        signInWithPassword: () => Promise.resolve({ data: { user: { id: 'mock-id' } }, error: null }),
        signOut: () => Promise.resolve({ error: null }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        getSession: () => Promise.resolve({ data: { session: null }, error: null })
      },
      storage: {
        from: (bucket) => ({
          upload: () => Promise.resolve({ data: { path: 'mock-path' }, error: null }),
          getPublicUrl: () => ({ data: { publicUrl: 'mock-url' } })
        })
      },
      // Add performance monitoring mock
      performance: {
        getMetrics: () => ({ totalQueries: 0, totalTime: 0, slowQueries: [], errors: [] }),
        resetMetrics: () => {},
        configure: () => {}
      }
    };
    
    // Apply monitoring to mock client in browser environment
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        if (window.dbMonitor) {
          supabase = createMonitoredClient(supabase);
        }
      }, 0);
    }
  } else {
    // In production, we want to fail loudly if Supabase isn't available
    throw error;
  }
}

// Export the Supabase client and JWT helpers
module.exports = {
  supabase,
  jwtHelpers
};
