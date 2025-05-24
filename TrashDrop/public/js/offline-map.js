/**
 * TrashDrop Offline Map Module
 * Provides map functionality with offline capabilities
 */

// Create and expose the OfflineMap module globally
window.OfflineMap = (function() {
    // Cache key for map tiles
    const CACHE_NAME = 'trashdrop-map-tiles-v1';
    
    // Default map center if location is unavailable (New York City)
    const DEFAULT_LOCATION = [40.7128, -74.0060];
    
    // Track created maps
    const maps = {};
    
    // Track which areas are cached
    let cachedAreas = [];
    
    /**
     * Initialize a Leaflet map with offline capabilities
     * @param {string} containerId - ID of the map container element
     * @param {Array} center - [latitude, longitude] center point
     * @param {number} zoom - Initial zoom level
     * @returns {Object} The created Leaflet map instance
     */
    function createMap(containerId, center = DEFAULT_LOCATION, zoom = 13) {
        console.log(`OfflineMap: Creating map in container ${containerId}`);
        
        // Check if container exists
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`OfflineMap: Container ${containerId} not found`);
            return null;
        }
        
        // Create the map
        const map = L.map(containerId).setView(center, zoom);
        
        // Add the tile layer with offline support
        const tileLayer = addTileLayer(map);
        
        // Add the tile layer to the map
        tileLayer.addTo(map);
        
        // Store the map reference
        maps[containerId] = map;
        
        return map;
    }
    
    /**
     * Add a tile layer to a map with offline capabilities
     * @param {Object|string} map - Leaflet map instance or container ID
     */
    function addTileLayer(map) {
        // If containerId is provided instead of map instance, get the map
        if (typeof map === 'string') {
            map = maps[map] || L.map(map);
        }
        
        // Create a custom tile layer with offline capability
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
            crossOrigin: true
        });
        
        // Override the tile loading function to check cache first
        const originalCreateTile = tileLayer.createTile;
        tileLayer.createTile = function(coords, done) {
            const url = this.getTileUrl(coords);
            
            // Check if we're online
            if (navigator.onLine) {
                // We're online, use the normal tile creation process
                return originalCreateTile.call(this, coords, done);
            } else {
                // We're offline, try to load from cache
                const tile = document.createElement('img');
                
                // Set crossOrigin property to enable CORS
                tile.crossOrigin = 'anonymous';
                
                // Attempt to load tile from cache
                loadTileFromCache(url)
                    .then(cachedUrl => {
                        if (cachedUrl) {
                            tile.src = cachedUrl;
                            done(null, tile);
                        } else {
                            // If not in cache, use a fallback tile
                            useFallbackTile(tile);
                            done(null, tile);
                        }
                    })
                    .catch(error => {
                        console.error('OfflineMap: Error loading tile from cache:', error);
                        useFallbackTile(tile);
                        done(null, tile);
                    });
                
                return tile;
            }
        };
        
        // Return the tile layer so it can be added to the map
        return tileLayer;
        
        // If online, cache visible tiles
        if (navigator.onLine) {
            // Wait for tiles to load then cache them
            map.on('moveend', () => {
                cacheTilesInView(map, tileLayer);
            });
            
            // Cache initial view
            cacheTilesInView(map, tileLayer);
        }
        
        return tileLayer;
    }
    
    /**
     * Cache all tiles currently in the map's viewport
     * @param {Object} map - Leaflet map instance
     * @param {Object} tileLayer - Leaflet tile layer
     */
    function cacheTilesInView(map, tileLayer) {
        if (!navigator.onLine) return;
        
        const bounds = map.getBounds();
        const zoom = map.getZoom();
        
        // Don't cache if zoom is too low (too many tiles)
        if (zoom < 10) return;
        
        // Get tile coordinates for current view
        const tileBounds = L.bounds(
            map.project(bounds.getNorthWest(), zoom).divideBy(256).floor(),
            map.project(bounds.getSouthEast(), zoom).divideBy(256).ceil()
        );
        
        // Track which area we're caching
        const areaKey = `${bounds.getWest().toFixed(2)},${bounds.getSouth().toFixed(2)},${bounds.getEast().toFixed(2)},${bounds.getNorth().toFixed(2)},${zoom}`;
        
        // Skip if we already cached this area
        if (cachedAreas.includes(areaKey)) return;
        
        console.log(`OfflineMap: Caching tiles for area ${areaKey}`);
        cachedAreas.push(areaKey);
        
        // Limit cachedAreas to 20 entries
        if (cachedAreas.length > 20) {
            cachedAreas.shift();
        }
        
        // Cache all tiles in view
        for (let x = tileBounds.min.x; x <= tileBounds.max.x; x++) {
            for (let y = tileBounds.min.y; y <= tileBounds.max.y; y++) {
                const coords = new L.Point(x, y);
                coords.z = zoom;
                const url = tileLayer.getTileUrl(coords);
                cacheTile(url);
            }
        }
    }
    
    /**
     * Cache a specific tile URL
     * @param {string} url - Tile URL to cache
     * @returns {Promise} Promise that resolves when caching is complete
     */
    function cacheTile(url) {
        return fetch(url, { mode: 'cors' })
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.blob();
            })
            .then(blob => {
                return caches.open(CACHE_NAME)
                    .then(cache => {
                        return cache.put(url, new Response(blob));
                    });
            })
            .catch(error => {
                console.warn(`OfflineMap: Failed to cache tile ${url}:`, error);
            });
    }
    
    /**
     * Load a tile from the cache
     * @param {string} url - Tile URL to load from cache
     * @returns {Promise<string|null>} Promise resolving to the cached URL or null
     */
    function loadTileFromCache(url) {
        return caches.open(CACHE_NAME)
            .then(cache => cache.match(url))
            .then(response => {
                if (response) {
                    return response.blob().then(blob => {
                        return URL.createObjectURL(blob);
                    });
                }
                return null;
            })
            .catch(error => {
                console.error('OfflineMap: Error fetching from cache:', error);
                return null;
            });
    }
    
    /**
     * Use a fallback tile when offline and tile not in cache
     * @param {HTMLElement} tile - The tile img element
     */
    function useFallbackTile(tile) {
        // Create a canvas for the fallback tile
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Draw a light gray background
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, 256, 256);
        
        // Draw a grid pattern
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 256; i += 32) {
            ctx.moveTo(i, 0);
            ctx.lineTo(i, 256);
            ctx.moveTo(0, i);
            ctx.lineTo(256, i);
        }
        ctx.stroke();
        
        // Add "Offline" text
        ctx.fillStyle = '#999';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Offline', 128, 128);
        
        // Use the canvas as the tile image
        tile.src = canvas.toDataURL();
    }
    
    /**
     * Pre-cache tiles for a specific location
     * @param {Array} center - [latitude, longitude] center point
     * @param {number} zoom - Zoom level
     * @param {number} radius - Radius in tiles around center to cache
     */
    function preCacheArea(center, zoom, radius = 3) {
        if (!navigator.onLine) return;
        
        console.log(`OfflineMap: Pre-caching area around ${center} at zoom ${zoom}`);
        
        // Create a temporary map container and hide it
        const tempContainer = document.createElement('div');
        tempContainer.style.display = 'none';
        tempContainer.id = 'temp-map-container-' + Date.now();
        document.body.appendChild(tempContainer);
        
        // Create a temporary map
        const tempMap = L.map(tempContainer.id).setView(center, zoom);
        
        // Add a tile layer
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            crossOrigin: true
        });
        tileLayer.addTo(tempMap);
        
        // Get the center tile coordinates
        const centerPoint = tempMap.project(center, zoom);
        const centerTile = {
            x: Math.floor(centerPoint.x / 256),
            y: Math.floor(centerPoint.y / 256)
        };
        
        // Cache tiles in a square around the center
        const tilesToCache = [];
        for (let x = centerTile.x - radius; x <= centerTile.x + radius; x++) {
            for (let y = centerTile.y - radius; y <= centerTile.y + radius; y++) {
                const coords = new L.Point(x, y);
                coords.z = zoom;
                const url = tileLayer.getTileUrl(coords);
                tilesToCache.push(url);
            }
        }
        
        // Cache all tiles in sequence
        console.log(`OfflineMap: Caching ${tilesToCache.length} tiles`);
        Promise.all(tilesToCache.map(url => cacheTile(url)))
            .finally(() => {
                // Clean up the temporary map
                tempMap.remove();
                document.body.removeChild(tempContainer);
                console.log('OfflineMap: Pre-caching complete');
            });
    }
    
    /**
     * Clear all cached map tiles
     * @returns {Promise} Promise that resolves when cache is cleared
     */
    function clearCache() {
        return caches.delete(CACHE_NAME)
            .then(() => {
                console.log('OfflineMap: Cache cleared');
                cachedAreas = [];
            });
    }
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
        console.log('OfflineMap: App is online, will cache new tiles');
    });
    
    window.addEventListener('offline', () => {
        console.log('OfflineMap: App is offline, using cached tiles');
    });
    
    // Public API
    return {
        createMap,
        addTileLayer,
        preCacheArea,
        clearCache
    };
})();

// Make it globally available
window.OfflineMap = OfflineMap;
