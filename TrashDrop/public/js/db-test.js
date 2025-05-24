/**
 * Database Testing Utility
 * Generates sample database operations to test the performance monitoring
 */

class DBTestUtility {
  constructor() {
    this.tables = ['users', 'pickup_requests', 'bags', 'reports', 'locations', 'rewards'];
    this.operations = ['select', 'insert', 'update', 'delete'];
    this.testActive = false;
    this.testInterval = null;
    this.operationCount = 0;
    this.config = {
      interval: 1000, // ms between operations
      errorProbability: 0.1, // 10% chance of error
      slowProbability: 0.2, // 20% chance of slow query
      slowDelay: 600, // ms to delay "slow" queries
    };
  }

  /**
   * Start test operations
   * @param {number} duration - Test duration in seconds (0 for indefinite)
   */
  startTest(duration = 60) {
    if (this.testActive) {
      console.log('Test already running');
      return false;
    }
    
    this.testActive = true;
    this.operationCount = 0;
    console.log(`Starting database test operations for ${duration ? duration + ' seconds' : 'indefinite time'}...`);
    
    // Get supabase client
    if (!window.supabase) {
      console.error('Supabase client not available');
      return false;
    }
    
    this.testInterval = setInterval(() => this.performRandomOperation(), this.config.interval);
    
    // Set timeout if duration specified
    if (duration > 0) {
      setTimeout(() => this.stopTest(), duration * 1000);
    }
    
    return true;
  }
  
  /**
   * Stop test operations
   */
  stopTest() {
    if (!this.testActive) {
      return false;
    }
    
    clearInterval(this.testInterval);
    this.testActive = false;
    console.log(`Test stopped after ${this.operationCount} operations`);
    return this.operationCount;
  }
  
  /**
   * Perform a random database operation
   */
  async performRandomOperation() {
    try {
      const table = this.getRandomItem(this.tables);
      const operation = this.getRandomItem(this.operations);
      
      // Increment counter
      this.operationCount++;
      
      // Simulate slow query if chosen
      const isSlow = Math.random() < this.config.slowProbability;
      if (isSlow) {
        await this.delay(this.config.slowDelay);
      }
      
      // Simulate error if chosen
      const isError = Math.random() < this.config.errorProbability;
      
      // Create a mock result
      let result;
      if (isError) {
        result = { 
          data: null, 
          error: { message: `Simulated error for ${operation} on ${table}` }
        };
      } else {
        result = {
          data: operation === 'select' ? this.generateMockData(table, 3) : { id: 'mock-id-' + this.operationCount },
          error: null
        };
      }
      
      // Log the operation
      console.log(`Test operation #${this.operationCount}: ${operation} on ${table} (slow: ${isSlow}, error: ${isError})`);
      
      // Perform the operation based on type
      switch (operation) {
        case 'select':
          await this.performSelect(table, result);
          break;
        case 'insert':
          await this.performInsert(table, result);
          break;
        case 'update':
          await this.performUpdate(table, result);
          break;
        case 'delete':
          await this.performDelete(table, result);
          break;
      }
      
    } catch (error) {
      console.error('Error performing test operation:', error);
    }
  }
  
  /**
   * Perform a select operation
   */
  async performSelect(table, mockResult) {
    const query = window.supabase
      .from(table)
      .select('*')
      .limit(10);
      
    // Override the execute method for this query instance only
    const originalExecute = query.execute;
    query.execute = async () => mockResult;
    
    return await query.execute();
  }
  
  /**
   * Perform an insert operation
   */
  async performInsert(table, mockResult) {
    const data = this.generateMockData(table);
    
    // Override the actual insert operation for this instance
    const query = window.supabase.from(table);
    const originalInsert = query.insert;
    query.insert = async () => mockResult;
    
    return await query.insert(data);
  }
  
  /**
   * Perform an update operation
   */
  async performUpdate(table, mockResult) {
    const data = { updated_at: new Date().toISOString() };
    
    // Override the actual update operation for this instance
    const query = window.supabase.from(table);
    const originalUpdate = query.update;
    query.update = async () => mockResult;
    
    return await query.update(data);
  }
  
  /**
   * Perform a delete operation
   */
  async performDelete(table, mockResult) {
    // Override the actual delete operation for this instance
    const query = window.supabase.from(table);
    const originalDelete = query.delete;
    query.delete = async () => mockResult;
    
    return await query.delete();
  }
  
  /**
   * Generate mock data for a table
   * @param {string} table - Table name
   * @param {number} count - Number of items to generate
   * @returns {Array|Object} - Mock data
   */
  generateMockData(table, count = 1) {
    // Generate appropriate data based on table
    const generateItem = () => {
      switch (table) {
        case 'users':
          return {
            id: 'user-' + Math.floor(Math.random() * 1000),
            name: 'Test User',
            email: `user${Math.floor(Math.random() * 1000)}@example.com`,
            created_at: new Date().toISOString()
          };
        case 'pickup_requests':
          return {
            id: 'pickup-' + Math.floor(Math.random() * 1000),
            user_id: 'user-' + Math.floor(Math.random() * 1000),
            status: ['pending', 'in_progress', 'completed'][Math.floor(Math.random() * 3)],
            address: '123 Test St',
            created_at: new Date().toISOString()
          };
        case 'bags':
          return {
            id: 'bag-' + Math.floor(Math.random() * 1000),
            pickup_id: 'pickup-' + Math.floor(Math.random() * 1000),
            waste_type: ['regular', 'plastic', 'recyclable'][Math.floor(Math.random() * 3)],
            created_at: new Date().toISOString()
          };
        case 'reports':
          return {
            id: 'report-' + Math.floor(Math.random() * 1000),
            user_id: 'user-' + Math.floor(Math.random() * 1000),
            location: '123 Report St',
            waste_type: ['large', 'hazardous', 'mixed'][Math.floor(Math.random() * 3)],
            created_at: new Date().toISOString()
          };
        case 'locations':
          return {
            id: 'location-' + Math.floor(Math.random() * 1000),
            user_id: 'user-' + Math.floor(Math.random() * 1000),
            address: '123 Saved Location',
            created_at: new Date().toISOString()
          };
        case 'rewards':
          return {
            id: 'reward-' + Math.floor(Math.random() * 1000),
            user_id: 'user-' + Math.floor(Math.random() * 1000),
            points: Math.floor(Math.random() * 100),
            created_at: new Date().toISOString()
          };
        default:
          return {
            id: 'item-' + Math.floor(Math.random() * 1000),
            created_at: new Date().toISOString()
          };
      }
    };
    
    // Generate the requested number of items
    if (count === 1) {
      return generateItem();
    } else {
      return Array(count).fill().map(() => generateItem());
    }
  }
  
  /**
   * Get a random item from an array
   */
  getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
  }
  
  /**
   * Utility to simulate delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Configure test parameters
   */
  configure(config = {}) {
    this.config = { ...this.config, ...config };
  }
}

// Create singleton instance
const dbTest = new DBTestUtility();

// Add test controls to the performance page when it loads
document.addEventListener('DOMContentLoaded', function() {
  // Wait for page to be fully loaded
  setTimeout(() => {
    // Check if we're on the DB performance page
    if (window.location.href.includes('db-performance.html')) {
      // Add test controls to the page
      addTestControls();
    }
  }, 500);
});

/**
 * Add test controls to the performance page
 */
function addTestControls() {
  // Create test controls container
  const testControls = document.createElement('div');
  testControls.className = 'card mb-4';
  testControls.innerHTML = `
    <div class="card-header d-flex justify-content-between align-items-center">
      <h5 class="mb-0">Test Database Operations</h5>
      <span class="badge bg-secondary" id="testStatus">Inactive</span>
    </div>
    <div class="card-body">
      <div class="row">
        <div class="col-md-6 mb-3">
          <label for="testDuration" class="form-label">Test Duration (seconds)</label>
          <input type="number" class="form-control" id="testDuration" min="5" step="5" value="30">
          <div class="form-text">Set to 0 for continuous testing</div>
        </div>
        <div class="col-md-6 mb-3">
          <label for="operationInterval" class="form-label">Operation Interval (ms)</label>
          <input type="number" class="form-control" id="operationInterval" min="500" step="100" value="1000">
        </div>
      </div>
      <div class="row mb-3">
        <div class="col-md-6 mb-3">
          <label for="errorRate" class="form-label">Error Rate (%)</label>
          <input type="number" class="form-control" id="errorRate" min="0" max="100" step="5" value="10">
        </div>
        <div class="col-md-6 mb-3">
          <label for="slowRate" class="form-label">Slow Query Rate (%)</label>
          <input type="number" class="form-control" id="slowRate" min="0" max="100" step="5" value="20">
        </div>
      </div>
      <div class="d-flex gap-2">
        <button id="startTestBtn" class="btn btn-primary">Start Test</button>
        <button id="stopTestBtn" class="btn btn-danger" disabled>Stop Test</button>
      </div>
    </div>
  `;
  
  // Add test controls before the settings card
  const settingsCard = document.querySelector('.card:last-child');
  if (settingsCard) {
    settingsCard.parentNode.insertBefore(testControls, settingsCard);
  } else {
    // Add at the end if settings card not found
    document.querySelector('.container').appendChild(testControls);
  }
  
  // Add event listeners
  document.getElementById('startTestBtn').addEventListener('click', function() {
    // Get configuration from inputs
    const duration = parseInt(document.getElementById('testDuration').value);
    const interval = parseInt(document.getElementById('operationInterval').value);
    const errorRate = parseInt(document.getElementById('errorRate').value) / 100;
    const slowRate = parseInt(document.getElementById('slowRate').value) / 100;
    
    // Configure and start test
    dbTest.configure({
      interval,
      errorProbability: errorRate,
      slowProbability: slowRate,
      slowDelay: 600 // Fixed value
    });
    
    const started = dbTest.startTest(duration);
    
    if (started) {
      // Update UI
      document.getElementById('testStatus').textContent = 'Active';
      document.getElementById('testStatus').classList.remove('bg-secondary');
      document.getElementById('testStatus').classList.add('bg-success');
      document.getElementById('startTestBtn').disabled = true;
      document.getElementById('stopTestBtn').disabled = false;
      
      // Auto-disable after duration (if not indefinite)
      if (duration > 0) {
        setTimeout(() => {
          document.getElementById('testStatus').textContent = 'Completed';
          document.getElementById('testStatus').classList.remove('bg-success');
          document.getElementById('testStatus').classList.add('bg-secondary');
          document.getElementById('startTestBtn').disabled = false;
          document.getElementById('stopTestBtn').disabled = true;
        }, duration * 1000 + 100);
      }
    }
  });
  
  document.getElementById('stopTestBtn').addEventListener('click', function() {
    const operationCount = dbTest.stopTest();
    
    // Update UI
    document.getElementById('testStatus').textContent = `Completed (${operationCount} ops)`;
    document.getElementById('testStatus').classList.remove('bg-success');
    document.getElementById('testStatus').classList.add('bg-secondary');
    document.getElementById('startTestBtn').disabled = false;
    document.getElementById('stopTestBtn').disabled = true;
  });
}

// Export for global access
window.dbTest = dbTest;
