const express = require('express');
const router = express.Router();
const os = require('os');
const { v4: uuidv4 } = require('uuid');

// Generate a unique instance ID for this server instance
const instanceId = uuidv4();
const startTime = new Date();

/**
 * @api {get} /healthz Health Check
 * @apiName HealthCheck
 * @apiGroup System
 * @apiDescription Check the health status of the application
 * 
 * @apiSuccess {String} status Application status (ok, warning, error)
 * @apiSuccess {String} timestamp Current server timestamp
 * @apiSuccess {String} version Application version
 * @apiSuccess {Object} services Status of dependent services
 * @apiSuccess {Number} uptime Application uptime in seconds
 * @apiSuccess {String} environment Current environment
 * @apiSuccess {String} instanceId Unique instance identifier
 */
router.get('/healthz', (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  // Basic health check - can be expanded with actual service checks
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    instanceId,
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.floor(uptime),
    memory: {
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external,
      arrayBuffers: memoryUsage.arrayBuffers,
    },
    os: {
      platform: process.platform,
      release: os.release(),
      hostname: os.hostname(),
      loadavg: os.loadavg(),
      freemem: os.freemem(),
      totalmem: os.totalmem(),
      cpus: os.cpus().length,
    },
    services: {
      database: 'connected',  // Replace with actual DB check
      cache: 'enabled',      // Replace with actual cache check
      auth: 'configured',    // Replace with actual auth check
    },
  };

  // Check if any critical service is down
  const criticalServices = Object.values(healthCheck.services);
  if (criticalServices.includes('error')) {
    healthCheck.status = 'error';
    return res.status(503).json(healthCheck);
  } else if (criticalServices.includes('warning')) {
    healthCheck.status = 'warning';
    return res.status(200).json(healthCheck);
  }

  res.status(200).json(healthCheck);
});

/**
 * @api {get} /ready Readiness Check
 * @apiName ReadinessCheck
 * @apiGroup System
 * @apiDescription Check if the application is ready to serve traffic
 */
router.get('/ready', (req, res) => {
  // Add any readiness checks here (e.g., database connection, external services)
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * @api {get} /live Liveness Check
 * @apiName LivenessCheck
 * @apiGroup System
 * @apiDescription Check if the application is running
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

module.exports = router;
