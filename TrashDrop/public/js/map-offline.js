/**
 * TrashDrop Offline Map Module
 * Provides offline map functionality using Leaflet with tile caching
 */

const OfflineMap = (function() {
    // Cache name for map tiles
    const CACHE_NAME = 'trashdrop-map-tiles-v1';
    
    // Default map settings
    const DEFAULT_ZOOM = 13;
    const DEFAULT_CENTER = [40.7128, -74.0060]; // NYC coordinates
    const DEFAULT_TILE_LAYER = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    
    // Store map instances
    const maps = {};
    
    /**
     * Initialize the service worker for offline map caching
     */
    function initServiceWorker() {
        if ('serviceWorker' in navigator && 'caches' in window) {
            navigator.serviceWorker.ready.then(registration => {
                console.log('Service worker ready for map caching');
            });
        } else {
            console.warn('Service Worker or Cache API not supported. Offline maps will not be available.');
        }
    }
    
    /**
     * Pre-cache map tiles for a specific area
     * @param {Array} center - [lat, lng] center coordinates
     * @param {Number} zoom - zoom level
     * @param {Number} radius - radius in km to cache
     */
    async function cacheMapArea(center, zoom, radius = 1) {
        if (!('caches' in window)) return;
        
        try {
            const cache = await caches.open(CACHE_NAME);
            const tileUrls = generateTileUrls(center, zoom, radius);
            
            // Cache each tile URL
            for (const url of tileUrls) {
                try {
                    const response = await fetch(url);
                    if (response.ok) {
                        await cache.put(url, response.clone());
                    }
                } catch (err) {
                    console.warn(`Failed to cache tile: ${url}`, err);
                }
            }
            
            console.log(`Cached ${tileUrls.length} map tiles for offline use`);
        } catch (error) {
            console.error('Error caching map tiles:', error);
        }
    }
    
    /**
     * Generate tile URLs for a given area
     * @param {Array} center - [lat, lng] center coordinates
     * @param {Number} zoom - zoom level
     * @param {Number} radius - radius in km
     * @returns {Array} array of tile URLs
     */
    function generateTileUrls(center, zoom, radius) {
        const [lat, lng] = center;
        const urls = [];
        
        // Simple estimation of tiles in the area
        const tileFactor = Math.pow(2, zoom);
        const latRad = lat * Math.PI / 180;
        const n = Math.pow(2, zoom);
        const xTile = Math.floor(n * ((lng + 180) / 360));
        const yTile = Math.floor(n * (1 - (Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI)) / 2);
        
        // Calculate the number of tiles based on radius
        const tilesPerKm = tileFactor / 111; // Approximate tiles per km at the equator
        const tileRadius = Math.ceil(radius * tilesPerKm);
        
        // Generate URLs for the tiles in the area
        for (let x = xTile - tileRadius; x <= xTile + tileRadius; x++) {
            for (let y = yTile - tileRadius; y <= yTile + tileRadius; y++) {
                // Wrap tile coordinates
                const wrappedX = ((x % n) + n) % n;
                if (y >= 0 && y < n) {
                    const url = DEFAULT_TILE_LAYER
                        .replace('{s}', 'a') // Use a single subdomain for caching
                        .replace('{z}', zoom)
                        .replace('{x}', wrappedX)
                        .replace('{y}', y);
                    urls.push(url);
                }
            }
        }
        
        return urls;
    }
    
    /**
     * Create a new map instance with offline capabilities
     * @param {String} containerId - ID of the HTML element to contain the map
     * @param {Object} options - Map options
     * @returns {Object} Leaflet map instance
     */
    function createMap(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Map container with ID "${containerId}" not found`);
            return null;
        }
        
        // Merge default options with provided options
        const mapOptions = {
            center: options.center || DEFAULT_CENTER,
            zoom: options.zoom || DEFAULT_ZOOM,
            zoomControl: options.zoomControl !== undefined ? options.zoomControl : true,
            attributionControl: true
        };
        
        // Create the Leaflet map
        const map = L.map(containerId, mapOptions);
        
        // Add the tile layer with offline capabilities
        const tileLayerUrl = options.tileLayer || DEFAULT_TILE_LAYER;
        const tileLayer = L.tileLayer(tileLayerUrl, {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        });
        
        tileLayer.addTo(map);
        
        // Store the map instance for later reference
        maps[containerId] = map;
        
        // Cache the current view for offline use
        if (options.cacheCurrentView !== false) {
            setTimeout(() => {
                cacheMapArea(mapOptions.center, mapOptions.zoom, options.cacheRadius || 2);
            }, 1000);
        }
        
        // Listen for map movements to cache new areas
        if (options.cacheOnMovement !== false) {
            map.on('moveend', () => {
                const center = map.getCenter();
                const zoom = map.getZoom();
                cacheMapArea([center.lat, center.lng], zoom, options.cacheRadius || 1);
            });
        }
        
        return map;
    }
    
    /**
     * Get an existing map instance by container ID
     * @param {String} containerId - ID of the map container
     * @returns {Object} Leaflet map instance or null if not found
     */
    function getMap(containerId) {
        return maps[containerId] || null;
    }
    
    /**
     * Add a marker to the map
     * @param {String} containerId - ID of the map container
     * @param {Array} position - [lat, lng] marker position
     * @param {Object} options - Marker options
     * @returns {Object} Leaflet marker instance
     */
    function addMarker(containerId, position, options = {}) {
        const map = getMap(containerId);
        if (!map) return null;
        
        const marker = L.marker(position, options);
        marker.addTo(map);
        
        return marker;
    }
    
    /**
     * Clear the tile cache
     */
    async function clearCache() {
        if (!('caches' in window)) return;
        
        try {
            await caches.delete(CACHE_NAME);
            console.log('Map tile cache cleared');
        } catch (error) {
            console.error('Error clearing map cache:', error);
        }
    }
    
    // Initialize the module
    initServiceWorker();
    
    // Public API
    return {
        createMap,
        getMap,
        addMarker,
        cacheMapArea,
        clearCache
    };
})();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OfflineMap;
}
