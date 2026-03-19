// ============================================
// FIREBASE CONFIGURATION AND INITIALIZATION
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyDEACX_P4c5q7djJAcA0I7Lk7leO2TlQ74",
    authDomain: "jubel-13e1a.firebaseapp.com",
    databaseURL: "https://jubel-13e1a-default-rtdb.firebaseio.com",
    projectId: "jubel-13e1a",
    storageBucket: "jubel-13e1a.firebasestorage.app",
    messagingSenderId: "882241095445",
    appId: "1:882241095445:web:ee9ca40fddd008ca910b1c",
    measurementId: "G-J5JPKL6B5F"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();
const storage = firebase.storage();

// ============================================
// GLOBAL STATE MANAGEMENT
// ============================================
const AppState = {
    currentUser: null,
    userData: null,
    currentRide: null,
    activeScreen: 'home',
    activeService: 'car',
    walletBalance: 0,
    userLocation: null,
    currentCity: null,
    detectedCity: null,
    selectedRideType: 'standard',
    selectedVehicle: null,
    destination: null,
    pickup: null,
    rideFare: 0,
    driverLocation: null,
    chatMessages: [],
    scheduledRides: [],
    emergencyMode: false,
    sosConfig: null,
    searchCache: new Map(),
    lastSearchTime: 0,
    notifications: [],
    unreadNotifications: 0,
    searchHistory: [],
    broadcastRecipients: [],
    emergencyStations: {
        police: [],
        fire: [],
        medical: []
    },
    realtimeListeners: [],
    rideTypes: {
        economy: { base: 15, perKm: 2.5, multiplier: 0.8, min: 10, icon: 'fa-car-side' },
        standard: { base: 20, perKm: 3.0, multiplier: 1.0, min: 15, icon: 'fa-car' },
        premium: { base: 30, perKm: 4.0, multiplier: 1.5, min: 25, icon: 'fa-crown' }
    },
    emergencyServices: {
        police: { base: 150, perKm: 5.0, multiplier: 2.0, min: 100 },
        fire: { base: 200, perKm: 6.0, multiplier: 2.5, min: 150 },
        medical: { base: 180, perKm: 5.5, multiplier: 2.2, min: 120 }
    },
    deliveryTypes: {
        standard: { base: 25, perKm: 2.0, multiplier: 1.0 },
        express: { base: 40, perKm: 3.0, multiplier: 1.5 },
        sameDay: { base: 60, perKm: 4.0, multiplier: 2.0 }
    },
    truckTypes: {
        pickup: { base: 80, perKm: 5.0, multiplier: 1.0, capacity: '1.5 tons' },
        light: { base: 120, perKm: 6.0, multiplier: 1.2, capacity: '3 tons' },
        medium: { base: 200, perKm: 8.0, multiplier: 1.5, capacity: '7 tons' },
        heavy: { base: 350, perKm: 12.0, multiplier: 2.0, capacity: '15 tons' }
    },
    lastPriceUpdate: 0,
    cityDetectionAttempts: 0,
    maxCityDetectionAttempts: 5,
    isSyncing: false,
    syncInterval: null,
    emergencyReason: null,
    selectedEmergencyStation: null,
    activeBroadcast: null,
    typingTimeout: null,
    driverTyping: false,
    locationManagement: {
        isEditingPickup: false,
        currentPickupInputId: null,
        pickupSearchResults: [],
        cityBounds: null,
        cityPolygon: null,
        userDetectedAddress: null
    },
    activeScheduledTimer: null,
    rideRequestPulsingIcons: {
        car: null,
        bike: null,
        truck: null
    },
    shareRideFriends: [],
    maxShareFriends: 4,
    routeDirections: null,
    pendingRideData: null,
    referralDiscountApplied: false,
    referralCodeUsed: null,
    referralOwnerName: null,
    shareRideInvitations: new Map(),
    broadcastInvitations: new Map(),
    paymentPendingMembers: new Set(),
    rideSplitDetails: null,
    activeRoute: null,
    activeFilter: 'all',
    lastSearchQuery: null,
    chatOpen: false,
    notificationsOpen: false,
    mapInitialized: false,
    rideStops: [],
    shoppingCategories: {
        restaurant: { icon: 'fa-utensils', name: 'Restaurants' },
        pharmacy: { icon: 'fa-prescription-bottle-medical', name: 'Pharmacies' },
        supermarket: { icon: 'fa-shopping-cart', name: 'Supermarkets' },
        mall: { icon: 'fa-store', name: 'Shopping Malls' }
    },
    scheduledCountdowns: new Map(),
    splitRideConfig: {
        maxFriends: 4,
        splitOptions: ['equal', 'you_pay_more', 'you_pay_all']
    },
    notificationPreferences: {
        rideUpdates: true,
        paymentUpdates: true,
        referralEarnings: true,
        splitRideInvites: true,
        broadcastInvites: true
    },
    walletTransactions: [],
    rideHistory: [],
    transactionFilter: 'all',
    pendingScheduledRideData: null
};

// ============================================
// MAP VARIABLES
// ============================================
let map = null;
let currentLocationMarker = null;
let pickupMarker = null;
let destinationMarker = null;
let driverMarker = null;
let routeLayer = null;
let emergencyMarkers = [];
let emergencyStationMarkers = [];
let cityBoundaryLayer = null;
let routePolyline = null;
let pulsingIcon = null;

// ============================================
// UTILITY FUNCTIONS
// ============================================
function showToast(message, type = 'info', duration = 5000) {
    EnhancedUIUpdater.showToast(message, type, duration);
}

function showLoading(message = 'Loading...') {
    EnhancedUIUpdater.showLoading(message);
}

function hideLoading() {
    EnhancedUIUpdater.hideLoading();
}

function showModal(modalId) {
    const modal = document.getElementById(`${modalId}Modal`);
    if (modal) modal.classList.add('active');
}

function hideModal(modalId) {
    const modal = document.getElementById(`${modalId}Modal`);
    if (modal) modal.classList.remove('active');
}

function formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return new Date(timestamp).toLocaleDateString();
}

// ============================================
// ENHANCED SEARCH ENGINE
// ============================================
const EnhancedSearchEngine = {
    cache: new Map(),
    lastSearch: 0,
    debounceTimer: null,
    searchHistory: [],
    maxHistoryItems: 20,
    activeSearches: new Set(),
    recentLocations: [],

    init: function() {
        this.loadSearchHistory();
        this.loadRecentLocations();
        console.log('Enhanced Search Engine initialized');
    },

    loadSearchHistory: function() {
        try {
            const history = localStorage.getItem('jubel_search_history');
            if (history) {
                this.searchHistory = JSON.parse(history);
                console.log(`Loaded ${this.searchHistory.length} search history items`);
            }
        } catch (error) {
            console.error('Error loading search history:', error);
            this.searchHistory = [];
        }
    },

    saveSearchHistory: function() {
        try {
            localStorage.setItem('jubel_search_history', JSON.stringify(this.searchHistory));
        } catch (error) {
            console.error('Error saving search history:', error);
        }
    },

    loadRecentLocations: function() {
        try {
            const recent = localStorage.getItem('jubel_recent_locations');
            if (recent) {
                this.recentLocations = JSON.parse(recent);
                console.log(`Loaded ${this.recentLocations.length} recent locations`);
            }
        } catch (error) {
            console.error('Error loading recent locations:', error);
            this.recentLocations = [];
        }
    },

    saveRecentLocations: function() {
        try {
            localStorage.setItem('jubel_recent_locations', JSON.stringify(this.recentLocations));
        } catch (error) {
            console.error('Error saving recent locations:', error);
        }
    },

    addToHistory: function(query, location, type) {
        const historyItem = {
            id: Date.now().toString(),
            query: query,
            location: location,
            type: type,
            timestamp: Date.now(),
            city: AppState.currentCity,
            coordinates: { lat: location.lat, lng: location.lng }
        };

        this.searchHistory = this.searchHistory.filter(item => 
            !(item.query === query && item.type === type && 
              Math.abs(item.coordinates.lat - location.lat) < 0.001 && 
              Math.abs(item.coordinates.lng - location.lng) < 0.001)
        );

        this.searchHistory.unshift(historyItem);

        if (this.searchHistory.length > this.maxHistoryItems) {
            this.searchHistory = this.searchHistory.slice(0, this.maxHistoryItems);
        }

        this.saveSearchHistory();
        return historyItem;
    },

    addToRecentLocations: function(location) {
        const recentItem = {
            id: Date.now().toString(),
            name: location.name || 'Location',
            address: location.address || location.fullAddress || '',
            coordinates: { lat: location.lat, lng: location.lng },
            timestamp: Date.now(),
            city: AppState.currentCity,
            type: location.category || 'general'
        };

        this.recentLocations = this.recentLocations.filter(item => 
            !(Math.abs(item.coordinates.lat - location.lat) < 0.001 && 
              Math.abs(item.coordinates.lng - location.lng) < 0.001)
        );

        this.recentLocations.unshift(recentItem);

        if (this.recentLocations.length > 15) {
            this.recentLocations = this.recentLocations.slice(0, 15);
        }

        this.saveRecentLocations();
        return recentItem;
    },

    search: async function(query, type = 'destination', location = null, forceCity = null) {
        const searchId = `${Date.now()}-${Math.random()}`;
        this.activeSearches.add(searchId);

        try {
            const city = forceCity || AppState.currentCity;
            if (!city) {
                console.warn('No city detected for search');
                EnhancedUIUpdater.showToast('Please wait while we detect your city', 'warning');
                return [];
            }

            const cacheKey = `${query.toLowerCase()}-${type}-${city}`;

            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < 300000) {
                    console.log('Returning cached search results');
                    return this.filterByCityBounds(cached.results, city);
                }
            }

            console.log(`Searching for "${query}" in ${city}, type: ${type}`);

            const bounds = this.getCityBounds(city);
            let searchUrl;

            if (bounds) {
                const [west, south, east, north] = bounds;
                searchUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=20&bounded=1&viewbox=${west},${south},${east},${north}&countrycodes=zm&addressdetails=1&namedetails=0&extratags=0`;
            } else {
                searchUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}+${encodeURIComponent(city)}+Zambia&format=json&limit=20&countrycodes=zm&addressdetails=1`;
            }

            const response = await fetch(searchUrl, {
                headers: {
                    'User-Agent': 'JubelRideApp/2.0',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Search failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`Received ${data.length} results for "${query}"`);

            const results = this.processAndFilterResults(data, location, city, type);

            this.cache.set(cacheKey, {
                results: results,
                timestamp: Date.now(),
                query: query,
                city: city
            });

            if (type === 'destination' && results.length > 0) {
                this.addToHistory(query, results[0], type);
            }

            this.lastSearch = Date.now();

            return results;
        } catch (error) {
            console.error('Search error:', error);

            if (AppState.currentCity) {
                return await this.alternativeSearch(query, AppState.currentCity);
            }

            EnhancedUIUpdater.showToast('Search service temporarily unavailable', 'warning');
            return [];
        } finally {
            this.activeSearches.delete(searchId);
        }
    },

    alternativeSearch: async function(query, city) {
        try {
            const alternativeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}+${encodeURIComponent(city)}+Zambia&format=json&limit=10&countrycodes=zm`;

            const response = await fetch(alternativeUrl);
            const data = await response.json();

            return data.map(place => ({
                id: place.place_id,
                name: place.display_name.split(',')[0],
                address: place.display_name,
                lat: parseFloat(place.lat),
                lng: parseFloat(place.lon),
                type: place.type || 'unknown',
                distance: 0,
                city: city,
                category: this.categorizePlace(place)
            }));
        } catch (error) {
            console.error('Alternative search error:', error);
            return [];
        }
    },

    processAndFilterResults: function(data, location, city, type) {
        if (!data || data.length === 0) return [];

        const cityLower = city.toLowerCase();
        const processedResults = [];

        data.forEach(place => {
            try {
                const address = place.address || {};
                const placeCity = address.city || address.town || address.village || address.municipality;

                let cityMatchScore = 0;
                if (placeCity && placeCity.toLowerCase().includes(cityLower)) {
                    cityMatchScore = 1;
                }

                let distance = 0;
                if (location) {
                    distance = this.calculateDistance(
                        location.lat, location.lng,
                        parseFloat(place.lat), parseFloat(place.lon)
                    );
                }

                const result = {
                    id: place.place_id || `${place.lat}-${place.lon}`,
                    name: place.display_name.split(',')[0] || place.name || 'Location',
                    address: this.formatAddress(place, city),
                    fullAddress: place.display_name,
                    lat: parseFloat(place.lat),
                    lng: parseFloat(place.lon),
                    type: place.type || place.class || 'unknown',
                    importance: place.importance || 0,
                    distance: distance,
                    city: placeCity || city,
                    placeType: place.type,
                    category: this.categorizePlace(place),
                    relevance: this.calculateRelevance(place, location, city, type),
                    cityMatchScore: cityMatchScore,
                    isVerified: this.isVerifiedLocation(place)
                };

                processedResults.push(result);
            } catch (error) {
                console.error('Error processing search result:', error);
            }
        });

        return processedResults
            .sort((a, b) => {
                if (a.cityMatchScore !== b.cityMatchScore) {
                    return b.cityMatchScore - a.cityMatchScore;
                }
                if (location && a.distance !== b.distance) {
                    return a.distance - b.distance;
                }
                if (a.relevance !== b.relevance) {
                    return b.relevance - a.relevance;
                }
                return b.importance - a.importance;
            })
            .slice(0, 10);
    },

    filterByCityBounds: function(results, city) {
        const bounds = this.getCityBounds(city);
        if (!bounds) return results;

        const [west, south, east, north] = bounds;

        return results.filter(result => {
            return result.lng >= west && result.lng <= east && 
                   result.lat >= south && result.lat <= north;
        });
    },

    calculateRelevance: function(place, location, city, type) {
        let score = (place.importance || 0) * 0.5;

        if (city) {
            const address = place.address || {};
            const placeCity = address.city || address.town || address.village;
            if (placeCity && placeCity.toLowerCase().includes(city.toLowerCase())) {
                score += 0.4;
            }
        }

        if (location) {
            const distance = this.calculateDistance(
                location.lat, location.lng,
                parseFloat(place.lat), parseFloat(place.lon)
            );

            if (distance < 1) score += 0.3;
            else if (distance < 3) score += 0.2;
            else if (distance < 5) score += 0.1;
        }

        if (type === 'destination') {
            if (place.type === 'restaurant' || place.type === 'hotel' || 
                place.type === 'mall' || place.type === 'supermarket') {
                score += 0.2;
            }
        }

        return Math.min(score, 1.0);
    },

    formatAddress: function(place, currentCity) {
        const address = place.address || {};
        const parts = [];

        if (address.house_number || address.housenumber) {
            parts.push(address.house_number || address.housenumber);
        }

        if (address.road) {
            parts.push(address.road);
        }

        if (address.suburb || address.neighbourhood) {
            parts.push(address.suburb || address.neighbourhood);
        }

        if (address.city || address.town) {
            parts.push(address.city || address.town);
        }

        if (parts.length === 0) {
            return place.display_name.split(',').slice(0, 3).join(',').trim();
        }

        return parts.join(', ');
    },

    categorizePlace: function(place) {
        const type = (place.type || place.class || '').toLowerCase();
        const name = (place.display_name || '').toLowerCase();

        if (type.includes('restaurant') || type.includes('cafe') || type.includes('fast_food') ||
            name.includes('pizza') || name.includes('nando') || name.includes('hungry lion')) {
            return 'restaurant';
        } else if (type.includes('pharmacy') || type.includes('chemist')) {
            return 'pharmacy';
        } else if (type.includes('supermarket') || name.includes('shoprite') || 
                  name.includes('pick n pay') || name.includes('spar')) {
            return 'supermarket';
        } else if (type.includes('mall') || type.includes('shopping_centre')) {
            return 'mall';
        } else if (type.includes('hospital') || type.includes('clinic')) {
            return 'medical';
        } else if (type.includes('bank') || type.includes('atm')) {
            return 'bank';
        } else {
            return 'general';
        }
    },

    isVerifiedLocation: function(place) {
        const verifiedTypes = [
            'restaurant', 'hotel', 'mall', 'supermarket', 'bank', 'hospital',
            'clinic', 'pharmacy', 'police', 'fire_station'
        ];

        const type = (place.type || place.class || '').toLowerCase();
        return verifiedTypes.some(verifiedType => type.includes(verifiedType));
    },

    calculateDistance: function(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    },

    toRad: function(value) {
        return value * Math.PI / 180;
    },

    getCityBounds: function(cityName) {
        const cityBounds = {
            'Lusaka': [27.8, -15.8, 28.8, -15.2],
            'Ndola': [28.5, -13.1, 28.8, -12.9],
            'Kitwe': [27.9, -13.1, 28.4, -12.7],
            'Kabwe': [28.3, -14.6, 28.6, -14.3],
            'Livingstone': [25.7, -18.0, 26.0, -17.7],
            'Chipata': [32.5, -13.8, 32.8, -13.6],
            'Chingola': [27.8, -12.8, 27.9, -12.4],
            'Mufulira': [28.1, -12.7, 28.3, -12.5],
            'Luanshya': [28.3, -13.2, 28.5, -13.0],
            'Kasama': [31.1, -10.3, 31.3, -10.1],
            'Solwezi': [26.3, -12.3, 26.5, -12.1],
            'Mazabuka': [27.7, -15.9, 27.9, -15.7]
        };

        return cityBounds[cityName] || null;
    },

    searchShoppingLocations: async function(category, city) {
        let queries = [];

        switch(category) {
            case 'restaurant':
                queries = ['Pizza', 'Nandos', 'Hungry Lion', 'restaurant'];
                break;
            case 'pharmacy':
                queries = ['pharmacy', 'chemist', 'drugstore'];
                break;
            case 'supermarket':
                queries = ['supermarket', 'Shoprite', 'Pick n Pay', 'SPAR'];
                break;
            case 'mall':
                queries = ['shopping mall', 'mall', 'shopping centre'];
                break;
        }

        const allResults = [];

        for (const query of queries) {
            try {
                const results = await this.search(query, 'shopping', AppState.userLocation, city);
                allResults.push(...results.filter(r => r.category === category));
            } catch (error) {
                console.error(`Error searching ${query}:`, error);
            }
        }

        const uniqueResults = [];
        const seenIds = new Set();

        allResults.forEach(result => {
            if (!seenIds.has(result.id)) {
                seenIds.add(result.id);
                uniqueResults.push(result);
            }
        });

        return uniqueResults.sort((a, b) => a.distance - b.distance);
    },

    searchEmergencyStations: async function(type, city) {
        let queries = [];

        switch(type) {
            case 'police':
                queries = ['police station', 'police'];
                break;
            case 'fire':
                queries = ['fire station', 'fire brigade'];
                break;
            case 'medical':
                queries = ['hospital', 'clinic', 'medical centre'];
                break;
        }

        const allResults = [];

        for (const query of queries) {
            try {
                const results = await this.search(query, 'emergency', AppState.userLocation, city);
                allResults.push(...results);
            } catch (error) {
                console.error(`Error searching ${query}:`, error);
            }
        }

        const uniqueResults = [];
        const seenIds = new Set();

        allResults.forEach(result => {
            if (!seenIds.has(result.id)) {
                seenIds.add(result.id);
                result.emergencyType = type;
                uniqueResults.push(result);
            }
        });

        return uniqueResults.sort((a, b) => a.distance - b.distance);
    },

    clearCache: function() {
        this.cache.clear();
        console.log('Search cache cleared');
    },

    getRecentDestinations: function(limit = 10) {
        return this.searchHistory
            .filter(item => item.type === 'destination')
            .slice(0, limit);
    },

    validateCoordinatesInCity: function(lat, lng, city) {
        const bounds = this.getCityBounds(city);
        if (!bounds) return true;

        const [west, south, east, north] = bounds;
        return lng >= west && lng <= east && lat >= south && lat <= north;
    }
};

// ============================================
// ENHANCED LOCATION MANAGER
// ============================================
const EnhancedLocationManager = {
    searchTimeout: null,
    activeSearchInput: null,

    init: function() {
        console.log('Enhanced Location Manager initialized');
        this.setupLocationInputs();
        this.setupSearchSuggestions();
        this.setupEditablePickup();
    },

    setupEditablePickup: function() {
        const pickupInputs = document.querySelectorAll('input[id*="pickup"], input[id*="Pickup"]');
        pickupInputs.forEach(input => {
            input.removeAttribute('readonly');
            this.addClearButton(input);
            this.addCurrentLocationButton(input);
        });
    },

    addCurrentLocationButton: function(input) {
        const parent = input.parentNode;
        if (!parent.querySelector('.current-location-btn')) {
            const currentLocationBtn = document.createElement('button');
            currentLocationBtn.type = 'button';
            currentLocationBtn.className = 'current-location-btn';
            currentLocationBtn.innerHTML = '<i class="fas fa-location-arrow"></i>';
            currentLocationBtn.style.cssText = `
                position: absolute;
                right: 40px;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                color: #FF6B35;
                cursor: pointer;
                font-size: 16px;
                z-index: 10;
            `;

            currentLocationBtn.addEventListener('click', () => {
                getCurrentLocation();
            });

            parent.style.position = 'relative';
            parent.appendChild(currentLocationBtn);
        }
    },

    addClearButton: function(input) {
        if (!input.nextElementSibling?.classList.contains('clear-input-btn')) {
            const clearBtn = document.createElement('button');
            clearBtn.type = 'button';
            clearBtn.className = 'clear-input-btn';
            clearBtn.innerHTML = '<i class="fas fa-times"></i>';
            clearBtn.style.cssText = `
                position: absolute;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                color: #999;
                cursor: pointer;
                display: none;
                z-index: 10;
            `;

            const parent = input.parentNode;
            parent.style.position = 'relative';
            parent.appendChild(clearBtn);

            clearBtn.addEventListener('click', () => {
                input.value = '';
                clearBtn.style.display = 'none';

                if (input.id === 'pickupLocation') {
                    AppState.pickup = null;
                    if (pickupMarker) {
                        map.removeLayer(pickupMarker);
                        pickupMarker = null;
                    }
                }
            });

            input.addEventListener('input', () => {
                clearBtn.style.display = input.value ? 'block' : 'none';
            });
        }
    },

    setupLocationInputs: function() {
        const pickupInputs = document.querySelectorAll('input[id*="pickup"], input[id*="Pickup"]');
        pickupInputs.forEach(input => {
            this.setupPickupInput(input);
        });

        const destinationInputs = document.querySelectorAll('input[id*="destination"], input[id*="Destination"]');
        destinationInputs.forEach(input => {
            this.setupDestinationInput(input);
        });

        this.setupShoppingCategories();
    },

    setupSearchSuggestions: function() {
        if (!document.getElementById('globalSuggestionsContainer')) {
            const container = document.createElement('div');
            container.id = 'globalSuggestionsContainer';
            container.className = 'suggestions-container';
            container.style.cssText = `
                position: fixed;
                background: white;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                max-height: 400px;
                overflow-y: auto;
                z-index: 9999;
                display: none;
                width: 300px;
            `;
            document.body.appendChild(container);
        }
    },

    setupPickupInput: function(inputElement) {
        const inputId = inputElement.id;

        inputElement.addEventListener('focus', () => {
            this.handlePickupInputFocus(inputId);
        });

        inputElement.addEventListener('input', (e) => {
            this.handlePickupInputChange(inputId, e.target.value);
        });

        inputElement.addEventListener('blur', () => {
            setTimeout(() => {
                this.handlePickupInputBlur(inputId);
            }, 200);
        });

        if (!inputElement.nextElementSibling?.classList.contains('clear-input-btn')) {
            this.addClearButton(inputElement);
        }
    },

    setupDestinationInput: function(inputElement) {
        const inputId = inputElement.id;

        inputElement.addEventListener('focus', () => {
            this.handleDestinationInputFocus(inputId);
        });

        inputElement.addEventListener('input', (e) => {
            this.handleDestinationInputChange(inputId, e.target.value);
        });

        inputElement.addEventListener('blur', () => {
            setTimeout(() => {
                this.handleDestinationInputBlur(inputId);
            }, 200);
        });

        if (!inputElement.nextElementSibling?.classList.contains('clear-input-btn')) {
            this.addClearButton(inputElement);
        }
    },

    setupShoppingCategories: function() {
        if (!document.getElementById('shoppingCategorySelector')) {
            const container = document.createElement('div');
            container.id = 'shoppingCategorySelector';
            container.className = 'shopping-category-selector';
            container.style.cssText = `
                display: flex;
                gap: 10px;
                margin-bottom: 15px;
                flex-wrap: wrap;
            `;

            Object.entries(AppState.shoppingCategories).forEach(([key, category]) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'category-btn';
                button.dataset.category = key;
                button.innerHTML = `
                    <i class="fas ${category.icon}"></i>
                    <span>${category.name}</span>
                `;
                button.style.cssText = `
                    flex: 1;
                    min-width: 120px;
                    padding: 10px;
                    background: white;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 5px;
                `;

                button.addEventListener('click', () => {
                    this.handleShoppingCategoryClick(key);
                });

                container.appendChild(button);
            });

            const shopNameInput = document.getElementById('shopName');
            if (shopNameInput && shopNameInput.parentNode) {
                shopNameInput.parentNode.insertBefore(container, shopNameInput);
            }
        }
    },

    handlePickupInputFocus: function(inputId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.parentElement.classList.add('active');
            this.showRecentLocations(inputId, 'pickup');
        }
    },

    handlePickupInputChange: async function(inputId, value) {
        if (!value.trim() || value.length < 2) {
            this.hideSuggestions();
            return;
        }

        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(async () => {
            await this.searchLocations(inputId, value, 'pickup');
        }, 300);
    },

    handlePickupInputBlur: function(inputId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.parentElement.classList.remove('active');
        }

        setTimeout(() => {
            this.hideSuggestions();
        }, 200);
    },

    handleDestinationInputFocus: function(inputId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.parentElement.classList.add('active');
            this.showRecentLocations(inputId, 'destination');
        }
    },

    handleDestinationInputChange: async function(inputId, value) {
        if (!value.trim() || value.length < 2) {
            this.hideSuggestions();
            return;
        }

        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(async () => {
            await this.searchLocations(inputId, value, 'destination');
        }, 300);
    },

    handleDestinationInputBlur: function(inputId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.parentElement.classList.remove('active');
        }

        setTimeout(() => {
            this.hideSuggestions();
        }, 200);
    },

    handleShoppingCategoryClick: async function(category) {
        if (!AppState.currentCity) {
            EnhancedUIUpdater.showToast('Please wait while we detect your city', 'warning');
            return;
        }

        EnhancedUIUpdater.showLoading(`Finding ${AppState.shoppingCategories[category].name}...`);

        try {
            const results = await EnhancedSearchEngine.searchShoppingLocations(category, AppState.currentCity);

            if (results.length > 0) {
                this.showShoppingLocationsPopup(category, results);
            } else {
                EnhancedUIUpdater.showToast(`No ${AppState.shoppingCategories[category].name} found in your city`, 'info');
            }
        } catch (error) {
            console.error('Error searching shopping locations:', error);
            EnhancedUIUpdater.showToast('Error searching locations', 'error');
        } finally {
            EnhancedUIUpdater.hideLoading();
        }
    },

    async searchLocations(inputId, query, type) {
        if (!AppState.currentCity) {
            EnhancedUIUpdater.showToast('Please wait while we detect your city', 'warning');
            return;
        }

        this.activeSearchInput = inputId;
        const input = document.getElementById(inputId);

        if (!input) return;

        input.parentElement.classList.add('searching');

        try {
            const results = await EnhancedSearchEngine.search(
                query,
                type,
                AppState.userLocation,
                AppState.currentCity
            );

            this.showSearchSuggestions(input, results, type);

        } catch (error) {
            console.error('Search error:', error);
            EnhancedUIUpdater.showToast('Search failed. Please try again.', 'error');
        } finally {
            input.parentElement.classList.remove('searching');
        }
    },

    showSearchSuggestions: function(input, results, type) {
        const container = document.getElementById('globalSuggestionsContainer');
        if (!container) return;

        const rect = input.getBoundingClientRect();
        container.style.top = `${rect.bottom + window.scrollY + 5}px`;
        container.style.left = `${rect.left + window.scrollX}px`;
        container.style.width = `${rect.width}px`;

        let html = '';

        if (results.length === 0) {
            html = `
                <div style="padding: 20px; text-align: center; color: #666;">
                    <i class="fas fa-search" style="font-size: 24px; margin-bottom: 10px; color: #ccc;"></i>
                    <div>No results found in ${AppState.currentCity}</div>
                </div>
            `;
        } else {
            results.forEach((result, index) => {
                let icon = 'fa-map-marker-alt';
                let iconColor = '#FF6B35';

                if (result.category === 'restaurant') {
                    icon = 'fa-utensils';
                    iconColor = '#FFC107';
                } else if (result.category === 'pharmacy') {
                    icon = 'fa-prescription-bottle-medical';
                    iconColor = '#2196F3';
                } else if (result.category === 'supermarket') {
                    icon = 'fa-shopping-cart';
                    iconColor = '#9C27B0';
                } else if (result.category === 'mall') {
                    icon = 'fa-store';
                    iconColor = '#4CAF50';
                } else if (result.category === 'medical') {
                    icon = 'fa-hospital';
                    iconColor = '#F44336';
                }

                html += `
                    <div class="suggestion-item" data-index="${index}" style="
                        padding: 12px 15px;
                        border-bottom: 1px solid #f5f5f5;
                        cursor: pointer;
                        transition: background 0.2s;
                    ">
                        <div style="display: flex; align-items: flex-start; gap: 12px;">
                            <div style="color: ${iconColor}; font-size: 18px; margin-top: 2px;">
                                <i class="fas ${icon}"></i>
                            </div>
                            <div style="flex: 1;">
                                <div style="font-weight: 600; margin-bottom: 4px;">${result.name}</div>
                                <div style="font-size: 13px; color: #666; margin-bottom: 4px;">${result.address}</div>
                                ${result.distance ? `
                                <div style="font-size: 12px; color: #FF6B35;">
                                    <i class="fas fa-location-arrow"></i> ${result.distance.toFixed(1)} km away
                                </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `;
            });

            const recentSearches = EnhancedSearchEngine.getRecentDestinations(5);
            if (recentSearches.length > 0) {
                html += `
                    <div style="padding: 12px 15px; background: #f9f9f9; border-top: 1px solid #e0e0e0;">
                        <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
                            <i class="fas fa-history"></i> Recent searches
                        </div>
                `;

                recentSearches.forEach((item, index) => {
                    html += `
                        <div class="recent-item" data-recent-index="${index}" style="
                            padding: 8px 0;
                            border-bottom: 1px solid #eee;
                            cursor: pointer;
                            font-size: 14px;
                        ">
                            <div>${item.location.name}</div>
                            <div style="font-size: 12px; color: #999;">${item.location.address}</div>
                        </div>
                    `;
                });

                html += `</div>`;
            }
        }

        container.innerHTML = html;
        container.style.display = 'block';

        container.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                const result = results[index];

                if (type === 'pickup') {
                    this.selectPickupLocation(this.activeSearchInput, result);
                } else {
                    this.selectDestinationLocation(this.activeSearchInput, result);
                }

                this.hideSuggestions();
            });
        });

        container.querySelectorAll('.recent-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.recentIndex);
                const recentItem = recentSearches[index];

                const result = {
                    lat: recentItem.coordinates.lat,
                    lng: recentItem.coordinates.lng,
                    name: recentItem.location.name,
                    address: recentItem.location.address
                };

                if (type === 'pickup') {
                    this.selectPickupLocation(this.activeSearchInput, result);
                } else {
                    this.selectDestinationLocation(this.activeSearchInput, result);
                }

                this.hideSuggestions();
            });
        });

        document.addEventListener('click', this.handleClickOutsideSuggestions);
    },

    showRecentLocations: function(inputId, type) {
        const input = document.getElementById(inputId);
        if (!input) return;

        const container = document.getElementById('globalSuggestionsContainer');
        if (!container) return;

        const recentSearches = EnhancedSearchEngine.getRecentDestinations(10);

        if (recentSearches.length === 0) {
            return;
        }

        const rect = input.getBoundingClientRect();
        container.style.top = `${rect.bottom + window.scrollY + 5}px`;
        container.style.left = `${rect.left + window.scrollX}px`;
        container.style.width = `${rect.width}px`;

        let html = `
            <div style="padding: 15px;">
                <div style="font-size: 14px; color: #666; margin-bottom: 10px;">
                    <i class="fas fa-history"></i> Recent destinations
                </div>
        `;

        recentSearches.forEach((item, index) => {
            const timeAgo = EnhancedUIUpdater.formatTimeAgo(item.timestamp);

            html += `
                <div class="recent-item" data-recent-index="${index}" style="
                    padding: 10px 0;
                    border-bottom: 1px solid #eee;
                    cursor: pointer;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; margin-bottom: 4px;">${item.location.name}</div>
                            <div style="font-size: 13px; color: #666;">${item.location.address}</div>
                        </div>
                        <div style="font-size: 12px; color: #999; margin-left: 10px;">
                            ${timeAgo}
                        </div>
                    </div>
                </div>
            `;
        });

        html += `</div>`;

        container.innerHTML = html;
        container.style.display = 'block';

        container.querySelectorAll('.recent-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.recentIndex);
                const recentItem = recentSearches[index];

                const result = {
                    lat: recentItem.coordinates.lat,
                    lng: recentItem.coordinates.lng,
                    name: recentItem.location.name,
                    address: recentItem.location.address
                };

                if (type === 'pickup') {
                    this.selectPickupLocation(inputId, result);
                } else {
                    this.selectDestinationLocation(inputId, result);
                }

                this.hideSuggestions();
            });
        });

        document.addEventListener('click', this.handleClickOutsideSuggestions);
    },

    selectPickupLocation: function(inputId, location) {
        const input = document.getElementById(inputId);
        if (!input) return;

        input.value = location.address || location.name;

        input.dataset.lat = location.lat;
        input.dataset.lng = location.lng;

        AppState.pickup = {
            lat: location.lat,
            lng: location.lng,
            address: location.address || location.name,
            name: location.name,
            fullAddress: location.fullAddress || location.address
        };

        EnhancedSearchEngine.addToRecentLocations(location);

        EnhancedUIUpdater.updatePickupMarker(location);

        if (AppState.destination) {
            EnhancedUIUpdater.calculateAndUpdatePrices();
            EnhancedUIUpdater.drawRouteWithStops();
        }

        const clearBtn = input.parentNode.querySelector('.clear-input-btn');
        if (clearBtn) {
            clearBtn.style.display = 'block';
        }

        EnhancedUIUpdater.showToast('Pickup location set', 'success');
    },

    selectDestinationLocation: function(inputId, location) {
        const input = document.getElementById(inputId);
        if (!input) return;

        input.value = location.address || location.name;

        input.dataset.lat = location.lat;
        input.dataset.lng = location.lng;

        AppState.destination = {
            lat: location.lat,
            lng: location.lng,
            address: location.address || location.name,
            name: location.name,
            fullAddress: location.fullAddress || location.address
        };

        EnhancedSearchEngine.addToRecentLocations(location);

        EnhancedUIUpdater.updateDestinationMarker(location);

        if (AppState.pickup) {
            EnhancedUIUpdater.calculateAndUpdatePrices();
            EnhancedUIUpdater.drawRouteWithStops();
        }

        const serviceIconsRow = document.getElementById('serviceIconsRow');
        if (serviceIconsRow) serviceIconsRow.classList.add('visible');

        const clearBtn = input.parentNode.querySelector('.clear-input-btn');
        if (clearBtn) {
            clearBtn.style.display = 'block';
        }

        EnhancedUIUpdater.showToast('Destination set', 'success');
    },

    clearPickupLocation: function(inputId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.value = '';
            delete input.dataset.lat;
            delete input.dataset.lng;

            AppState.pickup = null;

            if (pickupMarker) {
                map.removeLayer(pickupMarker);
                pickupMarker = null;
            }

            const clearBtn = input.parentNode.querySelector('.clear-input-btn');
            if (clearBtn) {
                clearBtn.style.display = 'none';
            }

            EnhancedUIUpdater.showToast('Pickup location cleared', 'info');
        }
    },

    clearDestinationLocation: function(inputId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.value = '';
            delete input.dataset.lat;
            delete input.dataset.lng;

            AppState.destination = null;

            if (destinationMarker) {
                map.removeLayer(destinationMarker);
                destinationMarker = null;
            }

            if (routeLayer) {
                map.removeLayer(routeLayer);
                routeLayer = null;
            }

            const clearBtn = input.parentNode.querySelector('.clear-input-btn');
            if (clearBtn) {
                clearBtn.style.display = 'none';
            }

            EnhancedUIUpdater.showToast('Destination cleared', 'info');
        }
    },

    handleClickOutsideSuggestions: function(event) {
        const container = document.getElementById('globalSuggestionsContainer');
        if (!container) return;

        if (!container.contains(event.target)) {
            const activeInput = document.querySelector('.location-input.active input');
            if (!activeInput || !activeInput.contains(event.target)) {
                container.style.display = 'none';
                document.removeEventListener('click', EnhancedLocationManager.handleClickOutsideSuggestions);
            }
        }
    },

    hideSuggestions: function() {
        const container = document.getElementById('globalSuggestionsContainer');
        if (container) {
            container.style.display = 'none';
        }
    },

    showShoppingLocationsPopup: function(category, locations) {
        const modal = document.createElement('div');
        modal.className = 'shopping-locations-modal';
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            width: 90%;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            z-index: 10000;
            padding: 20px;
        `;

        let html = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0;">
                    <i class="fas ${AppState.shoppingCategories[category].icon}"></i>
                    ${AppState.shoppingCategories[category].name}
                </h3>
                <button id="closeShoppingModal" style="background: none; border: none; font-size: 20px; cursor: pointer;">×</button>
            </div>
            <div style="margin-bottom: 15px; color: #666;">
                Select a location (closest first):
            </div>
            <div class="shopping-locations-list" style="display: flex; flex-direction: column; gap: 10px;">
        `;

        locations.forEach((location, index) => {
            html += `
                <div class="shopping-location-item" data-index="${index}" style="
                    padding: 15px;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <div style="font-weight: 600; margin-bottom: 5px;">${location.name}</div>
                            <div style="font-size: 13px; color: #666; margin-bottom: 5px;">${location.address}</div>
                            <div style="font-size: 12px; color: #FF6B35;">
                                <i class="fas fa-location-arrow"></i> ${location.distance.toFixed(1)} km away
                            </div>
                        </div>
                        <div style="color: #4CAF50; font-size: 24px;">
                            <i class="fas ${AppState.shoppingCategories[category].icon}"></i>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
            </div>
            <div style="margin-top: 20px; text-align: center;">
                <button id="cancelShoppingSelect" style="
                    padding: 10px 20px;
                    background: #f5f5f5;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                ">Cancel</button>
            </div>
        `;

        modal.innerHTML = html;
        document.body.appendChild(modal);

        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 9999;
        `;
        document.body.appendChild(overlay);

        modal.querySelector('#closeShoppingModal').addEventListener('click', () => {
            document.body.removeChild(modal);
            document.body.removeChild(overlay);
        });

        overlay.addEventListener('click', () => {
            document.body.removeChild(modal);
            document.body.removeChild(overlay);
        });

        modal.querySelector('#cancelShoppingSelect').addEventListener('click', () => {
            document.body.removeChild(modal);
            document.body.removeChild(overlay);
        });

        modal.querySelectorAll('.shopping-location-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                const location = locations[index];

                const shopNameInput = document.getElementById('shopName');
                if (shopNameInput) {
                    shopNameInput.value = location.name;
                    shopNameInput.dataset.lat = location.lat;
                    shopNameInput.dataset.lng = location.lng;
                }

                const shopLocationInput = document.getElementById('shopLocation');
                if (shopLocationInput) {
                    shopLocationInput.value = location.address;
                    shopLocationInput.dataset.lat = location.lat;
                    shopLocationInput.dataset.lng = location.lng;
                }

                AppState.pickup = {
                    lat: location.lat,
                    lng: location.lng,
                    address: location.address,
                    name: location.name
                };

                const pickupInput = document.getElementById('pickupLocation');
                if (pickupInput) {
                    pickupInput.value = location.address;
                    pickupInput.dataset.lat = location.lat;
                    pickupInput.dataset.lng = location.lng;
                }

                EnhancedUIUpdater.updatePickupMarker(location);

                document.body.removeChild(modal);
                document.body.removeChild(overlay);

                EnhancedUIUpdater.showToast(`${location.name} selected`, 'success');
            });
        });
    },

    addStop: function() {
        const stopsContainer = document.getElementById('stopsContainer');
        if (!stopsContainer) return;

        const stopIndex = AppState.rideStops.length + 1;
        const stopId = `stop-${stopIndex}`;

        const stopElement = document.createElement('div');
        stopElement.className = 'ride-stop';
        stopElement.dataset.stopId = stopId;
        stopElement.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <div style="color: #FF6B35;">
                    <i class="fas fa-map-pin"></i>
                </div>
                <input type="text" class="stop-input" placeholder="Stop ${stopIndex}" 
                       style="flex: 1; padding: 10px; border: 1px solid #e0e0e0; border-radius: 6px;">
                <button type="button" class="remove-stop-btn" style="
                    background: #f44336;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    padding: 5px 10px;
                    cursor: pointer;
                ">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        stopsContainer.appendChild(stopElement);

        AppState.rideStops.push({
            id: stopId,
            name: `Stop ${stopIndex}`,
            location: null,
            index: stopIndex
        });

        const stopInput = stopElement.querySelector('.stop-input');
        stopInput.addEventListener('focus', () => {
            this.handleStopInputFocus(stopId, stopInput);
        });

        stopInput.addEventListener('input', (e) => {
            this.handleStopInputChange(stopId, e.target.value);
        });

        const removeBtn = stopElement.querySelector('.remove-stop-btn');
        removeBtn.addEventListener('click', () => {
            this.removeStop(stopId);
        });

        EnhancedUIUpdater.showToast(`Stop ${stopIndex} added`, 'info');
    },

    removeStop: function(stopId) {
        const stopElement = document.querySelector(`[data-stop-id="${stopId}"]`);
        if (stopElement) {
            stopElement.remove();
        }

        AppState.rideStops = AppState.rideStops.filter(stop => stop.id !== stopId);

        AppState.rideStops.forEach((stop, index) => {
            stop.index = index + 1;
            const input = document.querySelector(`[data-stop-id="${stop.id}"] .stop-input`);
            if (input) {
                input.placeholder = `Stop ${stop.index}`;
            }
        });

        if (AppState.pickup && AppState.destination) {
            EnhancedUIUpdater.calculateAndUpdatePrices();
        }

        EnhancedUIUpdater.showToast('Stop removed', 'info');
    },

    handleStopInputFocus: function(stopId, input) {
        this.activeSearchInput = stopId;
        this.showRecentLocationsForStop(input);
    },

    handleStopInputChange: async function(stopId, value) {
        if (!value.trim() || value.length < 2) {
            return;
        }

        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(async () => {
            await this.searchStopLocation(stopId, value);
        }, 300);
    },

    showRecentLocationsForStop: function(input) {
        const container = document.getElementById('globalSuggestionsContainer');
        if (!container) return;

        const recentSearches = EnhancedSearchEngine.getRecentDestinations(8);

        if (recentSearches.length === 0) {
            return;
        }

        const rect = input.getBoundingClientRect();
        container.style.top = `${rect.bottom + window.scrollY + 5}px`;
        container.style.left = `${rect.left + window.scrollX}px`;
        container.style.width = `${rect.width}px`;

        let html = `
            <div style="padding: 15px;">
                <div style="font-size: 14px; color: #666; margin-bottom: 10px;">
                    <i class="fas fa-history"></i> Select a stop location
                </div>
        `;

        recentSearches.forEach((item, index) => {
            html += `
                <div class="recent-item" data-recent-index="${index}" style="
                    padding: 10px 0;
                    border-bottom: 1px solid #eee;
                    cursor: pointer;
                ">
                    <div style="font-weight: 600; margin-bottom: 4px;">${item.location.name}</div>
                    <div style="font-size: 13px; color: #666;">${item.location.address}</div>
                </div>
            `;
        });

        html += `</div>`;

        container.innerHTML = html;
        container.style.display = 'block';

        container.dataset.targetInput = 'stop';
        container.dataset.stopId = this.activeSearchInput;

        container.querySelectorAll('.recent-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                const recentItem = recentSearches[index];
                const stop = AppState.rideStops.find(s => s.id === this.activeSearchInput);

                if (stop) {
                    stop.location = {
                        lat: recentItem.coordinates.lat,
                        lng: recentItem.coordinates.lng,
                        name: recentItem.location.name,
                        address: recentItem.location.address
                    };

                    const input = document.querySelector(`[data-stop-id="${stop.id}"] .stop-input`);
                    if (input) {
                        input.value = recentItem.location.address;
                    }

                    if (AppState.pickup && AppState.destination) {
                        EnhancedUIUpdater.calculateAndUpdatePrices();
                    }
                }

                this.hideSuggestions();
            });
        });

        document.addEventListener('click', this.handleClickOutsideSuggestions);
    },

    async searchStopLocation(stopId, query) {
        if (!AppState.currentCity) {
            EnhancedUIUpdater.showToast('Please wait while we detect your city', 'warning');
            return;
        }

        const stop = AppState.rideStops.find(s => s.id === stopId);
        if (!stop) return;

        const input = document.querySelector(`[data-stop-id="${stopId}"] .stop-input`);
        if (!input) return;

        try {
            const results = await EnhancedSearchEngine.search(
                query,
                'stop',
                AppState.userLocation,
                AppState.currentCity
            );

            if (results.length > 0) {
                this.showStopSuggestions(input, results, stopId);
            }
        } catch (error) {
            console.error('Stop search error:', error);
        }
    },

    showStopSuggestions: function(input, results, stopId) {
        const container = document.getElementById('globalSuggestionsContainer');
        if (!container) return;

        const rect = input.getBoundingClientRect();
        container.style.top = `${rect.bottom + window.scrollY + 5}px`;
        container.style.left = `${rect.left + window.scrollX}px`;
        container.style.width = `${rect.width}px`;

        let html = '';

        if (results.length === 0) {
            html = '<div style="padding: 20px; text-align: center; color: #666;">No results found</div>';
        } else {
            results.forEach((result, index) => {
                html += `
                    <div class="suggestion-item" data-index="${index}" style="
                        padding: 12px 15px;
                        border-bottom: 1px solid #f5f5f5;
                        cursor: pointer;
                    ">
                        <div style="font-weight: 600; margin-bottom: 4px;">${result.name}</div>
                        <div style="font-size: 13px; color: #666;">${result.address}</div>
                        ${result.distance ? `
                        <div style="font-size: 12px; color: #FF6B35; margin-top: 4px;">
                            <i class="fas fa-location-arrow"></i> ${result.distance.toFixed(1)} km away
                        </div>
                        ` : ''}
                    </div>
                `;
            });
        }

        container.innerHTML = html;
        container.style.display = 'block';
        container.dataset.targetInput = 'stop';
        container.dataset.stopId = stopId;

        container.querySelectorAll('.suggestion-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                const result = results[index];
                const stop = AppState.rideStops.find(s => s.id === stopId);

                if (stop) {
                    stop.location = {
                        lat: result.lat,
                        lng: result.lng,
                        name: result.name,
                        address: result.address
                    };

                    input.value = result.address;

                    if (AppState.pickup && AppState.destination) {
                        EnhancedUIUpdater.calculateAndUpdatePrices();
                    }
                }

                this.hideSuggestions();
            });
        });

        document.addEventListener('click', this.handleClickOutsideSuggestions);
    }
};

// ============================================
// ENHANCED PRICE CALCULATOR
// ============================================
const EnhancedPriceCalculator = {
    calculateRideFare: function(distanceKm, rideType = 'standard', surge = 1.0, timeOfDay = null, stops = []) {
        const config = AppState.rideTypes[rideType] || AppState.rideTypes.standard;

        let fare = config.base + (distanceKm * config.perKm);

        fare *= config.multiplier;

        fare *= surge;

        if (!timeOfDay) {
            timeOfDay = new Date().getHours();
        }

        if (timeOfDay >= 22 || timeOfDay <= 5) {
            fare *= 1.2;
        } else if (timeOfDay >= 7 && timeOfDay <= 9) {
            fare *= 1.3;
        } else if (timeOfDay >= 16 && timeOfDay <= 19) {
            fare *= 1.4;
        }

        if (stops.length > 0) {
            fare += stops.length * 5;
        }

        fare = Math.max(fare, config.min);

        return Math.round(fare * 100) / 100;
    },

    calculateEmergencyFare: function(distanceKm, serviceType, surge = 1.0) {
        const config = AppState.emergencyServices[serviceType] || AppState.emergencyServices.police;

        let fare = config.base + (distanceKm * config.perKm);
        fare *= config.multiplier;
        fare *= surge;
        fare = Math.max(fare, config.min);

        return Math.round(fare * 100) / 100;
    },

    calculateDeliveryFare: function(distanceKm, deliveryType = 'standard', parcelValue = 0) {
        const config = AppState.deliveryTypes[deliveryType] || AppState.deliveryTypes.standard;

        let fare = config.base + (distanceKm * config.perKm);
        fare *= config.multiplier;

        if (parcelValue > 500) {
            fare += parcelValue * 0.01;
        }

        return Math.round(fare * 100) / 100;
    },

    calculateTruckFare: function(distanceKm, truckType = 'light', helpers = false) {
        const config = AppState.truckTypes[truckType] || AppState.truckTypes.light;

        let fare = config.base + (distanceKm * config.perKm);
        fare *= config.multiplier;

        if (helpers) {
            fare += 50;
        }

        return Math.round(fare * 100) / 100;
    },

    calculateShoppingFare: function(distanceKm, itemsCount = 1, budget = 0) {
        let fare = 30 + (distanceKm * 2.5) + (itemsCount * 5);

        if (budget > 0) {
            fare += budget * 0.05;
        }

        return Math.round(fare * 100) / 100;
    },

    calculateDistance: function(lat1, lon1, lat2, lon2) {
        return EnhancedSearchEngine.calculateDistance(lat1, lon1, lat2, lon2);
    },

    calculateRouteDistance: function(points) {
        if (points.length < 2) return 0;

        let totalDistance = 0;
        for (let i = 0; i < points.length - 1; i++) {
            totalDistance += this.calculateDistance(
                points[i].lat, points[i].lng,
                points[i + 1].lat, points[i + 1].lng
            );
        }

        return totalDistance;
    },

    calculateRideDistanceWithStops: function(pickup, destination, stops = []) {
        const points = [pickup];

        stops.forEach(stop => {
            if (stop.location) {
                points.push(stop.location);
            }
        });

        points.push(destination);

        return this.calculateRouteDistance(points);
    },

    estimateTime: function(distanceKm, rideType = 'standard', traffic = null, stops = []) {
        const baseSpeed = rideType === 'premium' ? 45 : 35;
        let baseTime = (distanceKm / baseSpeed) * 60;

        if (!traffic) {
            traffic = this.getTrafficFactor();
        }

        baseTime *= traffic;

        if (stops.length > 0) {
            baseTime += stops.length * 3;
        }

        if (rideType === 'premium') {
            baseTime += 2;
        } else {
            baseTime += 5;
        }

        return Math.ceil(baseTime);
    },

    getTrafficFactor: function() {
        const hour = new Date().getHours();
        const day = new Date().getDay();

        if (day >= 1 && day <= 5) {
            if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19)) {
                return 1.5;
            }
        }

        if (day === 6 || day === 0) {
            if (hour >= 12 && hour <= 16) {
                return 1.3;
            }
        }

        return 1.0;
    },

    getSurgeMultiplier: function() {
        const hour = new Date().getHours();
        const day = new Date().getDay();

        if (day >= 1 && day <= 5) {
            if (hour >= 7 && hour <= 9) return 1.5;
            if (hour >= 16 && hour <= 19) return 1.8;
        }

        if (day === 5 || day === 6) {
            if (hour >= 20 && hour <= 23) return 2.0;
        }

        if (hour >= 22 || hour <= 5) return 1.8;

        return 1.0;
    },

    getFareBreakdown: function(distanceKm, rideType = 'standard', surge = 1.0, stops = []) {
        const config = AppState.rideTypes[rideType] || AppState.rideTypes.standard;
        const baseFare = config.base;
        const distanceFare = distanceKm * config.perKm;
        const rideTypeMultiplier = config.multiplier;
        const surgeMultiplier = surge;
        const timeMultiplier = this.getTimeMultiplier();
        const stopsCharge = stops.length * 5;

        const subtotal = (baseFare + distanceFare) * rideTypeMultiplier + stopsCharge;
        const surgeAmount = subtotal * (surgeMultiplier - 1);
        const timeAmount = subtotal * (timeMultiplier - 1);
        const total = subtotal * surgeMultiplier * timeMultiplier;

        return {
            baseFare: baseFare,
            distanceFare: distanceFare,
            stopsCharge: stopsCharge,
            rideTypeMultiplier: rideTypeMultiplier,
            surgeMultiplier: surgeMultiplier,
            timeMultiplier: timeMultiplier,
            surgeAmount: surgeAmount,
            timeAmount: timeAmount,
            subtotal: subtotal,
            total: Math.max(total, config.min)
        };
    },

    getTimeMultiplier: function() {
        const hour = new Date().getHours();
        if (hour >= 22 || hour <= 5) return 1.2;
        return 1.0;
    },

    calculateSplitRideFare: function(totalFare, splitType = 'equal', participants = 2) {
        let yourShare = totalFare;
        let othersShare = 0;

        switch(splitType) {
            case 'equal':
                yourShare = totalFare / participants;
                othersShare = totalFare / participants;
                break;
            case 'you_pay_more':
                yourShare = totalFare * 0.7;
                othersShare = totalFare * 0.3;
                break;
            case 'you_pay_all':
                yourShare = totalFare;
                othersShare = 0;
                break;
        }

        return {
            total: totalFare,
            yourShare: yourShare,
            othersShare: othersShare,
            splitType: splitType,
            participants: participants
        };
    },

    validateDistanceWithinCity: function(startLat, startLng, endLat, endLng, city) {
        const distance = this.calculateDistance(startLat, startLng, endLat, endLng);

        const maxCityDistance = {
            'Lusaka': 50,
            'Ndola': 30,
            'Kitwe': 25,
            'Livingstone': 20,
            'Kabwe': 20,
            'Chipata': 15,
            'default': 25
        };

        const maxDistance = maxCityDistance[city] || maxCityDistance.default;

        if (distance > maxDistance) {
            return {
                valid: false,
                distance: distance,
                maxAllowed: maxDistance,
                message: `Distance exceeds maximum allowed for ${city} (${maxDistance}km)`
            };
        }

        return {
            valid: true,
            distance: distance
        };
    },

    calculateShoppingServiceFare: function(distanceKm, itemsCount = 1, budget = 0, vehicleType = 'bike') {
        let fare = 30 + (distanceKm * 2.5) + (itemsCount * 5);

        if (budget > 0) {
            fare += budget * 0.05;
        }

        if (vehicleType === 'car') {
            fare *= 1.5;
        } else if (vehicleType === 'bike') {
            fare *= 1.2;
        }

        return Math.round(fare * 100) / 100;
    },

    calculateDeliveryServiceFare: function(distanceKm, deliveryType = 'standard', parcelValue = 0, vehicleType = 'bike') {
        const config = AppState.deliveryTypes[deliveryType] || AppState.deliveryTypes.standard;

        let fare = config.base + (distanceKm * config.perKm);
        fare *= config.multiplier;

        if (parcelValue > 500) {
            fare += parcelValue * 0.01;
        }

        if (vehicleType === 'car') {
            fare *= 1.5;
        } else if (vehicleType === 'bike') {
            fare *= 1.2;
        }

        return Math.round(fare * 100) / 100;
    },

    calculateShortDeliveryFare: function(distanceKm, parcelDescription = '', vehicleType = 'bike') {
        let fare = 20 + (distanceKm * 3.0);

        if (parcelDescription.toLowerCase().includes('food') || 
            parcelDescription.toLowerCase().includes('medic')) {
            fare += 10;
        }

        if (vehicleType === 'car') {
            fare *= 1.5;
        } else if (vehicleType === 'bike') {
            fare *= 1.3;
        }

        return Math.round(fare * 100) / 100;
    },

    applyReferralDiscount: function(fare) {
        if (AppState.referralDiscountApplied) {
            const discount = fare * 0.5;
            const discountedFare = fare - discount;
            return {
                originalFare: fare,
                discount: discount,
                finalFare: discountedFare,
                discountApplied: true
            };
        }
        return {
            originalFare: fare,
            discount: 0,
            finalFare: fare,
            discountApplied: false
        };
    },

    calculateStopsFare: function(stopsCount) {
        return stopsCount * 5;
    }
};

// ============================================
// ENHANCED UI UPDATER
// ============================================
const EnhancedUIUpdater = {
    formatTimeAgo: function(timestamp) {
        return formatTimeAgo(timestamp);
    },

    updateWalletBalance: function(balance) {
        const formatted = `ZMW ${balance.toFixed(2)}`;
        const walletBalance = document.getElementById('walletBalance');
        const accountBalance = document.getElementById('accountBalance');
        const paymentAmount = document.getElementById('paymentAmount');
        const depositCurrent = document.getElementById('depositCurrentBalance');
        const withdrawCurrent = document.getElementById('withdrawCurrentBalance');
        if (walletBalance) walletBalance.textContent = formatted;
        if (accountBalance) accountBalance.textContent = formatted;
        if (paymentAmount) paymentAmount.textContent = formatted;
        if (depositCurrent) depositCurrent.textContent = formatted;
        if (withdrawCurrent) withdrawCurrent.textContent = formatted;
        AppState.walletBalance = balance;
    },

    updateUserInfo: function(userData) {
        const userName = document.getElementById('userFullName');
        if (userName) userName.innerHTML = `<i class="fas fa-user-circle"></i> <span>${userData.name || 'User'}</span>`;
        const accountName = document.getElementById('accountName');
        if (accountName) accountName.textContent = userData.name || 'User';
        const accountPhone = document.getElementById('accountPhone');
        if (accountPhone) accountPhone.textContent = userData.phone || '';
        const updateEmail = document.getElementById('updateEmail');
        if (updateEmail) updateEmail.value = userData.email || '';
        const referralCode = document.getElementById('referralCode');
        if (referralCode) referralCode.textContent = userData.referralCode || 'JUBEL-XXXX';
    },

    showToast: function(message, type = 'info', duration = 5000) {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), duration);
    },

    showLoading: function(message = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('active');
            document.getElementById('loadingText').textContent = message;
        }
    },

    hideLoading: function() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.classList.remove('active');
    },

    showMapLoading: function() {
        document.getElementById('mapLoadingOverlay').style.display = 'flex';
    },

    hideMapLoading: function() {
        document.getElementById('mapLoadingOverlay').style.display = 'none';
    },

    updateCityDisplay: function(city) {
        console.log('City detected:', city);
    },

    updateRidePrices: function() {
        if (!AppState.pickup || !AppState.destination) return;
        const distance = EnhancedPriceCalculator.calculateRideDistanceWithStops(
            AppState.pickup,
            AppState.destination,
            AppState.rideStops.filter(s => s.location)
        );
        const surge = EnhancedPriceCalculator.getSurgeMultiplier();
        const stopsCount = AppState.rideStops.filter(s => s.location).length;

        const prices = {};
        Object.keys(AppState.rideTypes).forEach(type => {
            prices[type] = EnhancedPriceCalculator.calculateRideFare(distance, type, surge, null, AppState.rideStops.filter(s => s.location));
        });

        const carPrice = document.getElementById('carPrice');
        if (carPrice) carPrice.textContent = `ZMW ${prices.standard.toFixed(2)}`;
        const deliveryBikePrice = document.getElementById('deliveryBikePrice');
        if (deliveryBikePrice) deliveryBikePrice.textContent = `ZMW ${(prices.standard * 1.2).toFixed(2)}`;
        const bicyclePrice = document.getElementById('bicyclePrice');
        if (bicyclePrice) bicyclePrice.textContent = `ZMW ${(prices.standard * 0.8).toFixed(2)}`;
        const truckPrice = document.getElementById('truckPrice');
        if (truckPrice) truckPrice.textContent = `ZMW ${(prices.standard * 2).toFixed(2)}`;

        AppState.rideFare = prices.standard;
    },

    updatePickupMarker: function(location) {
        if (!map) return;
        if (pickupMarker) pickupMarker.setLatLng([location.lat, location.lng]);
        else {
            pickupMarker = L.marker([location.lat, location.lng], {
                icon: L.divIcon({ className: 'pickup-marker', html: '<i class="fas fa-map-marker-alt" style="color:#FF6B35; font-size:24px;"></i>', iconSize: [24,24], iconAnchor: [12,24] })
            }).addTo(map).bindPopup('Pickup');
        }
        if (AppState.destination) this.drawRouteWithStops();
    },

    updateDestinationMarker: function(location) {
        if (!map) return;
        if (destinationMarker) destinationMarker.setLatLng([location.lat, location.lng]);
        else {
            destinationMarker = L.marker([location.lat, location.lng], {
                icon: L.divIcon({ className: 'destination-marker', html: '<i class="fas fa-flag" style="color:#4CAF50; font-size:24px;"></i>', iconSize: [24,24], iconAnchor: [12,24] })
            }).addTo(map).bindPopup('Destination');
        }
        if (AppState.pickup) this.drawRouteWithStops();
    },

    drawRouteWithStops: async function() {
        if (!map || !AppState.pickup || !AppState.destination) return;
        if (routeLayer) map.removeLayer(routeLayer);

        const waypoints = [
            L.latLng(AppState.pickup.lat, AppState.pickup.lng),
            ...AppState.rideStops.filter(s => s.location).map(s => L.latLng(s.location.lat, s.location.lng)),
            L.latLng(AppState.destination.lat, AppState.destination.lng)
        ];

        try {
            const waypointStr = waypoints.map(w => `${w.lng},${w.lat}`).join(';');
            const url = `https://router.project-osrm.org/route/v1/driving/${waypointStr}?overview=full&geometries=geojson`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.routes && data.routes[0]) {
                const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
                routeLayer = L.polyline(coords, { color: '#FF6B35', weight: 4 }).addTo(map);
                map.fitBounds(L.latLngBounds(coords), { padding: [50,50] });
            }
        } catch (e) {
            routeLayer = L.polyline(waypoints, { color: '#FF6B35', weight: 3, dashArray: '10,10' }).addTo(map);
            map.fitBounds(L.latLngBounds(waypoints), { padding: [50,50] });
        }
        this.updateRidePrices();
    },

    calculateAndUpdatePrices: function() {
        if (AppState.pickup && AppState.destination) this.updateRidePrices();
    },

    showRideInfo: function(ride) {
        document.getElementById('mainPanel').classList.remove('expanded');
        document.body.classList.add('ride-active');
        const driverPanel = document.getElementById('driverPanel');
        if (driverPanel) driverPanel.classList.add('active');
        const sosBtn = document.getElementById('sosButton');
        if (sosBtn) sosBtn.classList.add('active');
        this.updateRideDetails(ride);
        this.updateRideStatus(ride.status);
    },

    updateRideDetails: function(ride) {
        const driverName = document.getElementById('driverName');
        if (driverName) driverName.textContent = ride.driverName || 'Driver';
        const driverRating = document.getElementById('driverRating');
        if (driverRating) driverRating.textContent = ride.driverRating ? ride.driverRating.toFixed(1) : '4.8';
        const vehiclePlate = document.getElementById('vehiclePlate');
        if (vehiclePlate) vehiclePlate.textContent = ride.vehiclePlate || 'ABC 123';
        if (ride.driverProfileImage) {
            const avatar = document.getElementById('driverAvatar');
            if (avatar) avatar.innerHTML = `<img src="${ride.driverProfileImage}" style="width:100%; height:100%; object-fit:cover;">`;
        }
    },

    updateRideStatus: function(status) {},

    updateTimeline: function(status) {},

    showPaymentModal: function(amount, rideData) {
        AppState.pendingRideData = rideData;
        AppState.rideFare = amount;
        const paymentAmount = document.getElementById('paymentAmount');
        if (paymentAmount) paymentAmount.textContent = `ZMW ${amount.toFixed(2)}`;

        const methodsContainer = document.getElementById('paymentMethods');
        if (methodsContainer) {
            methodsContainer.innerHTML = `
                <div class="payment-method" data-payment="wallet">
                    <i class="fas fa-wallet payment-icon"></i>
                    <div class="payment-details">
                        <div class="payment-name">Jubel Wallet</div>
                        <div class="payment-info">Balance: ZMW ${AppState.walletBalance.toFixed(2)}</div>
                    </div>
                </div>
                <div class="payment-method" data-payment="mobile">
                    <i class="fas fa-mobile-alt payment-icon"></i>
                    <div class="payment-details">
                        <div class="payment-name">Mobile Money</div>
                        <div class="payment-info">MTN/Airtel/Zamtel</div>
                    </div>
                </div>
                <div class="payment-method" data-payment="cash">
                    <i class="fas fa-money-bill payment-icon"></i>
                    <div class="payment-details">
                        <div class="payment-name">Cash</div>
                        <div class="payment-info">Pay driver directly</div>
                    </div>
                </div>
            `;
            document.querySelectorAll('.payment-method').forEach(m => {
                m.addEventListener('click', function() {
                    document.querySelectorAll('.payment-method').forEach(x => x.classList.remove('selected'));
                    this.classList.add('selected');
                });
            });
        }

        const paymentModal = document.getElementById('paymentModal');
        if (paymentModal) paymentModal.classList.add('active');
    },

    showScheduleCountdown: function(scheduledTime, rideData) {
        const now = Date.now();
        if (scheduledTime <= now) {
            EnhancedFirebaseManager.requestRide(rideData);
            return;
        }
        let countdownDiv = document.getElementById('scheduleCountdown');
        if (!countdownDiv) {
            countdownDiv = document.createElement('div');
            countdownDiv.id = 'scheduleCountdown';
            countdownDiv.style.cssText = 'position:fixed; bottom:100px; right:20px; background:white; border-radius:24px; padding:20px; box-shadow:0 8px 32px rgba(0,0,0,0.16); z-index:1000; min-width:300px;';
            document.body.appendChild(countdownDiv);
        }
        const update = () => {
            const remaining = scheduledTime - Date.now();
            if (remaining <= 0) {
                clearInterval(interval);
                countdownDiv.remove();
                EnhancedFirebaseManager.requestRide(rideData);
                return;
            }
            const hours = Math.floor(remaining / 3600000);
            const minutes = Math.floor((remaining % 3600000) / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            countdownDiv.innerHTML = `
                <div style="font-weight:600; margin-bottom:10px;"><i class="fas fa-clock"></i> Scheduled Ride</div>
                <div style="font-size:28px; font-weight:700;">${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}</div>
                <div style="font-size:12px; color:#666;">Ride will auto-request when timer ends</div>
            `;
        };
        update();
        const interval = setInterval(update, 1000);
        AppState.scheduledCountdowns.set(rideData.id, interval);
    },

    showNotificationsPanel: function() {
        const panel = document.getElementById('notificationsPanel');
        if (panel) {
            panel.classList.add('active');
            AppState.notificationsOpen = true;
            this.updateNotifications(AppState.notifications);
            EnhancedFirebaseManager.markAllNotificationsAsRead();
            const badge = document.getElementById('notificationCount');
            if (badge) badge.style.display = 'none';
        }
    },

    hideNotificationsPanel: function() {
        const panel = document.getElementById('notificationsPanel');
        if (panel) {
            panel.classList.remove('active');
            AppState.notificationsOpen = false;
        }
    },

    updateNotifications: function(notifications) {
        const container = document.getElementById('notificationsList');
        if (!container) return;

        const sorted = notifications.sort((a,b) => b.timestamp - a.timestamp);

        if (sorted.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:40px; color:#999;">No notifications</div>';
            return;
        }

        let html = '';
        sorted.forEach(n => {
            html += `<div class="notification-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
                <div style="display:flex; gap:12px;">
                    <i class="fas ${n.type === 'success' ? 'fa-check-circle' : n.type === 'error' ? 'fa-exclamation-circle' : n.type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}" style="color:${n.type === 'success' ? '#4CAF50' : n.type === 'error' ? '#F44336' : n.type === 'warning' ? '#FFC107' : '#2196F3'};"></i>
                    <div><div style="font-weight:600;">${n.title}</div><div style="font-size:13px; color:#666;">${n.message}</div><div style="font-size:11px; color:#999; margin-top:4px;">${formatTimeAgo(n.timestamp)}</div></div>
                </div>
            </div>`;
        });
        container.innerHTML = html;
    },

    showRideDetailsModal: function(ride) {},

    async showEmergencyStations(type) {
        if (!AppState.currentCity) return showToast('Detecting city...', 'warning');
        showLoading(`Finding ${type} stations...`);
        const stations = await EnhancedSearchEngine.searchEmergencyStations(type, AppState.currentCity);
        hideLoading();
        if (!stations.length) return showToast(`No ${type} stations found`, 'info');

        const modal = document.createElement('div');
        modal.className = 'emergency-stations-modal';
        modal.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:white; border-radius:12px; box-shadow:0 10px 40px rgba(0,0,0,0.2); width:90%; max-width:500px; max-height:80vh; overflow-y:auto; z-index:10000; padding:20px;';

        const colors = { police: '#2196F3', fire: '#F44336', medical: '#4CAF50' };
        const icons = { police: 'fa-shield-alt', fire: 'fa-fire-extinguisher', medical: 'fa-ambulance' };

        let html = `<div style="display:flex; justify-content:space-between; margin-bottom:20px;">
            <h3 style="color:${colors[type]}"><i class="fas ${icons[type]}"></i> ${type.charAt(0).toUpperCase()+type.slice(1)} Stations</h3>
            <button id="closeEmergencyModal" style="background:none; border:none; font-size:20px; cursor:pointer;">×</button>
        </div>
        <div style="margin-bottom:15px;">Select a station (closest first):</div>
        <div id="emergencyStationsList">`;

        stations.forEach((s, idx) => {
            const fare = EnhancedPriceCalculator.calculateEmergencyFare(s.distance, type);
            html += `<div class="emergency-station-item" data-index="${idx}" style="padding:15px; border:2px solid #e0e0e0; border-radius:8px; margin-bottom:10px; cursor:pointer;">
                <div style="font-weight:600;">${s.name}</div>
                <div style="font-size:13px; color:#666;">${s.address}</div>
                <div style="display:flex; gap:15px; font-size:12px; margin-top:5px;">
                    <span style="color:#FF6B35;"><i class="fas fa-location-arrow"></i> ${s.distance.toFixed(1)} km</span>
                    <span style="color:#4CAF50; font-weight:600;"><i class="fas fa-money-bill-wave"></i> ZMW ${fare.toFixed(2)}</span>
                </div>
            </div>`;
        });

        html += '</div><div style="margin-top:20px;"><button id="cancelEmergencyBtn" style="padding:10px 20px; background:#f5f5f5; border:none; border-radius:6px; cursor:pointer;">Cancel</button></div>';
        modal.innerHTML = html;
        document.body.appendChild(modal);
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:9999;';
        document.body.appendChild(overlay);

        let selectedStation = null;
        modal.querySelectorAll('.emergency-station-item').forEach(item => {
            item.addEventListener('click', function() {
                modal.querySelectorAll('.emergency-station-item').forEach(i => i.style.borderColor = '#e0e0e0');
                this.style.borderColor = colors[type];
                selectedStation = stations[parseInt(this.dataset.index)];
            });
        });

        modal.querySelector('#closeEmergencyModal').addEventListener('click', () => { document.body.removeChild(modal); document.body.removeChild(overlay); });
        modal.querySelector('#cancelEmergencyBtn').addEventListener('click', () => { document.body.removeChild(modal); document.body.removeChild(overlay); });
        overlay.addEventListener('click', () => { document.body.removeChild(modal); document.body.removeChild(overlay); });

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn btn-primary';
        confirmBtn.textContent = 'Request Emergency Ride';
        confirmBtn.style.marginTop = '20px';
        confirmBtn.style.width = '100%';
        confirmBtn.addEventListener('click', () => {
            if (!selectedStation) return showToast('Select a station', 'warning');
            const fare = EnhancedPriceCalculator.calculateEmergencyFare(selectedStation.distance, type);
            const rideData = {
                pickup: AppState.userLocation ? { lat: AppState.userLocation.lat, lng: AppState.userLocation.lng, address: 'Current Location' } : AppState.pickup,
                destination: { lat: selectedStation.lat, lng: selectedStation.lng, address: selectedStation.address, name: selectedStation.name },
                emergencyType: type,
                station: selectedStation,
                reason: 'Emergency',
                fare: fare,
                distance: selectedStation.distance,
                isEmergency: true
            };
            document.body.removeChild(modal);
            document.body.removeChild(overlay);
            EnhancedUIUpdater.showPaymentModal(fare, rideData);
        });
        modal.appendChild(confirmBtn);
    },

    showSplitRidePopup: function() {
        showModal('shareRide');
    },

    showBroadcastRidePopup: function() {
        showModal('broadcast');
    }
};

// ============================================
// ENHANCED FIREBASE MANAGER
// ============================================
const EnhancedFirebaseManager = {
    async loadUserData(uid) {
        showLoading('Loading profile...');
        try {
            const snap = await database.ref(`users/${uid}`).once('value');
            AppState.userData = snap.val() || {};
            if (!AppState.userData.walletBalance) AppState.userData.walletBalance = 0;
            if (!AppState.userData.referralCode) {
                AppState.userData.referralCode = 'JUBEL-' + Math.random().toString(36).substring(2,8).toUpperCase();
                await database.ref(`users/${uid}/referralCode`).set(AppState.userData.referralCode);
            }
            AppState.walletBalance = AppState.userData.walletBalance;
            EnhancedUIUpdater.updateWalletBalance(AppState.walletBalance);
            EnhancedUIUpdater.updateUserInfo(AppState.userData);
            await this.loadSOSConfig(uid);
            await this.loadScheduledRides(uid);
            await this.checkActiveRide(uid);
            await this.loadRideHistory(uid);
            await this.loadNotifications(uid);
            await this.loadWalletTransactions(uid);
            this.startRealtimeSync(uid);
            hideLoading();
            showToast('Welcome back!', 'success');
        } catch (e) {
            hideLoading();
            showToast('Error loading user data', 'error');
        }
    },

    startRealtimeSync(uid) {
        this.stopRealtimeSync();
        AppState.realtimeListeners.push(
            database.ref(`users/${uid}`).on('value', snap => {
                if (snap.val()) {
                    AppState.userData = snap.val();
                    AppState.walletBalance = AppState.userData.walletBalance || 0;
                    EnhancedUIUpdater.updateWalletBalance(AppState.walletBalance);
                    EnhancedUIUpdater.updateUserInfo(AppState.userData);
                }
            })
        );

        AppState.realtimeListeners.push(
            database.ref('rides').orderByChild('passengerId').equalTo(uid).on('value', snap => {
                const rides = snap.val();
                if (rides) {
                    let active = null;
                    for (let id in rides) {
                        const r = rides[id];
                        if (['requested','accepted','arrived','started'].includes(r.status)) {
                            active = { id, ...r };
                            break;
                        }
                    }
                    if (active) {
                        if (!AppState.currentRide || AppState.currentRide.id !== active.id) {
                            AppState.currentRide = active;
                            EnhancedUIUpdater.showRideInfo(active);
                            if (active.driverId) this.listenToDriverLocation(active.driverId);
                            this.listenToChatMessages(active.id);
                        } else {
                            AppState.currentRide = active;
                            EnhancedUIUpdater.updateRideDetails(active);
                            if (active.status === 'completed') this.handleRideCompletion(active);
                        }
                    } else if (AppState.currentRide) {
                        AppState.currentRide = null;
                        document.getElementById('driverPanel')?.classList.remove('active');
                        document.body.classList.remove('ride-active');
                        document.getElementById('sosButton')?.classList.remove('active');
                    }
                } else if (AppState.currentRide) {
                    AppState.currentRide = null;
                    document.getElementById('driverPanel')?.classList.remove('active');
                    document.body.classList.remove('ride-active');
                    document.getElementById('sosButton')?.classList.remove('active');
                }
            })
        );

        AppState.realtimeListeners.push(
            database.ref(`notifications/${uid}`).orderByChild('timestamp').limitToLast(50).on('value', snap => {
                const nots = snap.val();
                if (nots) {
                    AppState.notifications = Object.keys(nots).map(id => ({ id, ...nots[id] }));
                    const unread = AppState.notifications.filter(n => !n.read).length;
                    AppState.unreadNotifications = unread;
                    const badge = document.getElementById('notificationCount');
                    if (badge) {
                        badge.textContent = unread > 99 ? '99+' : unread;
                        badge.style.display = unread ? 'flex' : 'none';
                    }
                    if (AppState.notificationsOpen) EnhancedUIUpdater.updateNotifications(AppState.notifications);
                }
            })
        );

        AppState.realtimeListeners.push(
            database.ref(`walletTransactions/${uid}`).orderByChild('timestamp').limitToLast(100).on('value', snap => {
                if (snap.val()) {
                    AppState.walletTransactions = Object.keys(snap.val()).map(id => ({ id, ...snap.val()[id] }));
                }
            })
        );

        AppState.realtimeListeners.push(
            database.ref('splitRideInvitations').orderByChild('recipientId').equalTo(uid).orderByChild('status').equalTo('pending').on('value', snap => {
                const inv = snap.val();
                if (inv) {
                    Object.entries(inv).forEach(([invId, invData]) => {
                        if (!AppState.shareRideInvitations.has(invId)) {
                            AppState.shareRideInvitations.set(invId, invData);
                            this.sendNotification(uid, 'Split Ride Invitation', `${invData.hostName} invited you to split a ride`, 'split', { splitRideId: invData.splitRideId, action: 'accept_split_invite' });
                        }
                    });
                }
            })
        );

        AppState.realtimeListeners.push(
            database.ref('broadcastInvitations').orderByChild('recipientId').equalTo(uid).orderByChild('status').equalTo('pending').on('value', snap => {
                const inv = snap.val();
                if (inv) {
                    Object.entries(inv).forEach(([invId, invData]) => {
                        if (!AppState.broadcastInvitations.has(invId)) {
                            AppState.broadcastInvitations.set(invId, invData);
                            this.sendNotification(uid, 'Broadcast Ride', `${invData.hostName} is sharing their ride with you`, 'broadcast', { broadcastId: invData.broadcastId, action: 'accept_broadcast_invite' });
                        }
                    });
                }
            })
        );
    },

    stopRealtimeSync() {
        AppState.realtimeListeners.forEach(l => l && l());
        AppState.realtimeListeners = [];
    },

    async loadSOSConfig(uid) {
        const snap = await database.ref(`sosConfig/${uid}`).once('value');
        AppState.sosConfig = snap.val();
        if (AppState.sosConfig) {
            document.getElementById('sosContact1Name').value = AppState.sosConfig.contact1Name || '';
            document.getElementById('sosContact1Phone').value = AppState.sosConfig.contact1Phone || '';
            document.getElementById('sosContact2Name').value = AppState.sosConfig.contact2Name || '';
            document.getElementById('sosContact2Phone').value = AppState.sosConfig.contact2Phone || '';
            document.getElementById('sosMessage').value = AppState.sosConfig.message || '';
        }
    },

    async loadScheduledRides(uid) {
        const snap = await database.ref('scheduledRides').orderByChild('passengerId').equalTo(uid).orderByChild('status').equalTo('scheduled').once('value');
        const rides = snap.val();
        if (rides) {
            AppState.scheduledRides = Object.keys(rides).map(id => ({ id, ...rides[id] }));
            AppState.scheduledRides.forEach(r => {
                if (r.scheduledTime > Date.now()) {
                    EnhancedUIUpdater.showScheduleCountdown(r.scheduledTime, r);
                } else {
                    this.requestRide(r);
                }
            });
        }
    },

    async checkActiveRide(uid) {
        const snap = await database.ref('rides').orderByChild('passengerId').equalTo(uid).once('value');
        const rides = snap.val();
        if (rides) {
            for (let id in rides) {
                const r = rides[id];
                if (['requested','accepted','arrived','started'].includes(r.status)) {
                    AppState.currentRide = { id, ...r };
                    EnhancedUIUpdater.showRideInfo(AppState.currentRide);
                    if (r.driverId) this.listenToDriverLocation(r.driverId);
                    this.listenToChatMessages(id);
                    return true;
                }
            }
        }
        return false;
    },

    async loadRideHistory(uid) {
        const snap = await database.ref('rides').orderByChild('passengerId').equalTo(uid).once('value');
        const rides = snap.val();
        if (rides) {
            AppState.rideHistory = Object.keys(rides).map(id => ({ id, ...rides[id] })).sort((a,b) => b.timestamp - a.timestamp);
            this.updateHistoryUI();
        }
    },

    updateHistoryUI() {
        const container = document.getElementById('historyList');
        if (!container) return;
        let filtered = AppState.rideHistory;
        if (AppState.activeFilter !== 'all') {
            filtered = AppState.rideHistory.filter(r => r.status === AppState.activeFilter || (AppState.activeFilter === 'delivery' && r.serviceType === 'delivery') || (AppState.activeFilter === 'truck' && r.serviceType === 'truck') || (AppState.activeFilter === 'broadcast' && r.broadcast) || (AppState.activeFilter === 'emergency' && r.emergency));
        }
        if (!filtered.length) {
            container.innerHTML = '<div style="text-align:center; padding:40px; color:#999;">No rides found</div>';
            return;
        }
        let html = '';
        filtered.forEach(r => {
            html += `<div class="history-item">
                <div class="history-header">
                    <div class="history-type"><i class="fas ${r.serviceType === 'delivery' ? 'fa-shipping-fast' : r.serviceType === 'truck' ? 'fa-truck' : r.emergency ? 'fa-ambulance' : r.broadcast ? 'fa-broadcast-tower' : 'fa-car'}"></i> ${r.serviceType || 'Ride'}</div>
                    <div class="history-price">ZMW ${r.fare?.toFixed(2) || '0.00'}</div>
                </div>
                <div class="history-locations">
                    <div class="history-location"><i class="fas fa-map-marker-alt"></i> ${r.pickupDisplay || r.pickup}</div>
                    <div class="history-location"><i class="fas fa-flag"></i> ${r.destinationDisplay || r.destination}</div>
                </div>
                <div style="font-size:12px; color:#999;">${new Date(r.timestamp).toLocaleString()}</div>
            </div>`;
        });
        container.innerHTML = html;
    },

    async loadNotifications(uid) {
        const snap = await database.ref(`notifications/${uid}`).once('value');
        const nots = snap.val();
        if (nots) {
            AppState.notifications = Object.keys(nots).map(id => ({ id, ...nots[id] }));
            const unread = AppState.notifications.filter(n => !n.read).length;
            AppState.unreadNotifications = unread;
            const badge = document.getElementById('notificationCount');
            if (badge) {
                badge.textContent = unread > 99 ? '99+' : unread;
                badge.style.display = unread ? 'flex' : 'none';
            }
        }
    },

    async loadWalletTransactions(uid) {
        const snap = await database.ref(`walletTransactions/${uid}`).once('value');
        const trans = snap.val();
        if (trans) {
            AppState.walletTransactions = Object.keys(trans).map(id => ({ id, ...trans[id] }));
        }
    },

    listenToDriverLocation(driverId) {
        AppState.realtimeListeners.push(
            database.ref(`driverLocations/${driverId}`).on('value', snap => {
                const loc = snap.val();
                if (loc) {
                    AppState.driverLocation = { lat: loc.latitude, lng: loc.longitude };
                    if (driverMarker) driverMarker.setLatLng([loc.latitude, loc.longitude]);
                    else {
                        driverMarker = L.marker([loc.latitude, loc.longitude], {
                            icon: L.divIcon({ className: 'driver-marker', html: '<i class="fas fa-car" style="color:#2196F3; font-size:24px;"></i>', iconSize: [24,24], iconAnchor: [12,24] })
                        }).addTo(map).bindPopup('Driver');
                    }
                }
            })
        );
    },

    listenToChatMessages(rideId) {
        AppState.realtimeListeners.push(
            database.ref(`chats/${rideId}/messages`).orderByChild('timestamp').limitToLast(50).on('child_added', snap => {
                const msg = snap.val();
                if (msg) {
                    const chatDiv = document.getElementById('chatMessages');
                    const chatDivFull = document.getElementById('chatMessagesFull');
                    const isSent = msg.senderId === AppState.currentUser.uid;
                    const msgHtml = `<div class="chat-message ${isSent ? 'sent' : 'received'}">${msg.text}</div>`;
                    if (chatDiv) {
                        chatDiv.innerHTML += msgHtml;
                        chatDiv.scrollTop = chatDiv.scrollHeight;
                    }
                    if (chatDivFull) {
                        chatDivFull.innerHTML += msgHtml;
                        chatDivFull.scrollTop = chatDivFull.scrollHeight;
                    }
                }
            })
        );
    },

    async requestRide(rideData) {
        showLoading('Requesting ride...');
        try {
            const rideId = database.ref().child('rides').push().key;
            const distance = EnhancedPriceCalculator.calculateRideDistanceWithStops(rideData.pickup, rideData.destination, rideData.stops || []);
            const estimatedTime = EnhancedPriceCalculator.estimateTime(distance, rideData.rideType, null, rideData.stops);
            let finalFare = rideData.fare;
            let referralDiscount = 0;
            if (AppState.referralDiscountApplied && AppState.referralCodeUsed) {
                referralDiscount = finalFare * 0.5;
                finalFare -= referralDiscount;
            }
            const ride = {
                id: rideId,
                passengerId: AppState.currentUser.uid,
                passengerName: AppState.userData.name,
                passengerPhone: AppState.userData.phone,
                pickup: rideData.pickup.address,
                pickupDisplay: rideData.pickup.name || rideData.pickup.address,
                pickupLat: rideData.pickup.lat,
                pickupLng: rideData.pickup.lng,
                destination: rideData.destination.address,
                destinationDisplay: rideData.destination.name || rideData.destination.address,
                destLat: rideData.destination.lat,
                destLng: rideData.destination.lng,
                rideType: rideData.rideType || 'standard',
                serviceType: rideData.serviceType || 'car',
                fare: finalFare,
                originalFare: rideData.fare,
                referralDiscount,
                referredBy: AppState.referralCodeUsed,
                distance,
                estimatedTime,
                status: 'requested',
                timestamp: Date.now(),
                city: AppState.currentCity,
                paymentMethod: rideData.paymentMethod || 'wallet'
            };
            if (rideData.serviceType === 'shopping') {
                ride.shopName = rideData.shopName;
                ride.shoppingList = rideData.shoppingList;
                ride.shoppingBudget = rideData.budget;
                ride.shoppingInstructions = rideData.instructions;
                ride.vehicleType = rideData.vehicleType;
            } else if (rideData.serviceType === 'delivery') {
                ride.deliveryType = rideData.deliveryType;
                ride.parcelDescription = rideData.parcelDescription;
                ride.parcelValue = rideData.parcelValue;
                ride.receiverName = rideData.receiverName;
                ride.receiverPhone = rideData.receiverPhone;
                ride.vehicleType = rideData.vehicleType;
            } else if (rideData.serviceType === 'truck') {
                ride.truckType = rideData.truckType;
                ride.itemDescription = rideData.itemDescription;
                ride.estimatedWeight = rideData.estimatedWeight;
                ride.needHelpers = rideData.needHelpers;
            }
            if (rideData.stops && rideData.stops.length) {
                ride.stops = rideData.stops.map(s => ({ name: s.location.name, address: s.location.address, lat: s.location.lat, lng: s.location.lng }));
            }
            if (rideData.isSplitRide) {
                ride.splitRide = true;
                ride.participants = rideData.participants;
                ride.splitRideId = rideData.splitRideId;
                if (rideData.friends && rideData.friends.length) {
                    const splitRideId = database.ref().child('splitRides').push().key;
                    const splitRide = {
                        id: splitRideId,
                        hostId: AppState.currentUser.uid,
                        hostName: AppState.userData.name,
                        rideId,
                        participants: rideData.participants,
                        totalFare: rideData.totalFare,
                        eachShare: rideData.yourShare,
                        pickup: rideData.pickup.address,
                        destination: rideData.destination.address,
                        status: 'pending',
                        timestamp: Date.now()
                    };
                    await database.ref(`splitRides/${splitRideId}`).set(splitRide);
                    for (let friend of rideData.friends) {
                        const invId = database.ref().child('splitRideInvitations').push().key;
                        await database.ref(`splitRideInvitations/${invId}`).set({
                            id: invId,
                            splitRideId,
                            hostId: AppState.currentUser.uid,
                            hostName: AppState.userData.name,
                            recipientId: friend.userId,
                            recipientName: friend.name,
                            rideId,
                            pickup: rideData.pickup.address,
                            destination: rideData.destination.address,
                            totalFare: rideData.totalFare,
                            eachShare: rideData.yourShare,
                            status: 'pending',
                            timestamp: Date.now()
                        });
                    }
                    ride.splitRideId = splitRideId;
                }
            }
            if (rideData.isBroadcast && rideData.friends && rideData.friends.length) {
                ride.broadcast = true;
                const broadcastId = database.ref().child('broadcasts').push().key;
                const broadcast = {
                    id: broadcastId,
                    hostId: AppState.currentUser.uid,
                    hostName: AppState.userData.name,
                    rideId,
                    pickup: rideData.pickup.address,
                    destination: rideData.destination.address,
                    fare: rideData.totalFare,
                    distance,
                    status: 'active',
                    timestamp: Date.now()
                };
                await database.ref(`broadcasts/${broadcastId}`).set(broadcast);
                for (let friend of rideData.friends) {
                    const invId = database.ref().child('broadcastInvitations').push().key;
                    await database.ref(`broadcastInvitations/${invId}`).set({
                        id: invId,
                        broadcastId,
                        hostId: AppState.currentUser.uid,
                        hostName: AppState.userData.name,
                        recipientId: friend.userId,
                        recipientName: friend.name,
                        rideId,
                        pickup: rideData.pickup.address,
                        destination: rideData.destination.address,
                        fare: rideData.totalFare,
                        distance,
                        status: 'pending',
                        timestamp: Date.now()
                    });
                }
                ride.broadcastId = broadcastId;
            }
            if (rideData.isEmergency) {
                ride.emergency = true;
                ride.emergencyType = rideData.emergencyType;
                ride.emergencyReason = rideData.reason;
                ride.emergencyStation = rideData.station;
            }
            await database.ref(`rides/${rideId}`).set(ride);
            const userRef = database.ref(`users/${AppState.currentUser.uid}`);
            const userSnap = await userRef.once('value');
            const totalRides = (userSnap.val().totalRides || 0) + 1;
            await userRef.update({ totalRides });
            if (rideData.paymentMethod === 'wallet') {
                await this.withdrawMoney(finalFare, 'Ride payment', rideId);
            }
            AppState.currentRide = ride;
            hideLoading();
            EnhancedUIUpdater.showRideInfo(ride);
            showToast('Ride requested!', 'success');
            this.sendNotification(AppState.currentUser.uid, 'Ride Requested', 'Searching for driver...', 'ride', { rideId });
            return rideId;
        } catch (e) {
            hideLoading();
            showToast('Error requesting ride', 'error');
            throw e;
        }
    },

    async requestScheduledRide(rideData) {
        showLoading('Scheduling ride...');
        try {
            const scheduledId = database.ref().child('scheduledRides').push().key;
            const scheduledRide = {
                id: scheduledId,
                passengerId: AppState.currentUser.uid,
                passengerName: AppState.userData.name,
                passengerPhone: AppState.userData.phone,
                pickup: rideData.pickup.address,
                pickupDisplay: rideData.pickup.name || rideData.pickup.address,
                pickupLat: rideData.pickup.lat,
                pickupLng: rideData.pickup.lng,
                destination: rideData.destination.address,
                destinationDisplay: rideData.destination.name || rideData.destination.address,
                destLat: rideData.destination.lat,
                destLng: rideData.destination.lng,
                rideType: rideData.rideType || 'standard',
                fare: rideData.fare,
                distance: rideData.distance,
                estimatedTime: EnhancedPriceCalculator.estimateTime(rideData.distance, rideData.rideType),
                status: 'scheduled',
                scheduledTime: rideData.scheduledTime,
                timestamp: Date.now(),
                city: AppState.currentCity,
                paymentMethod: rideData.paymentMethod || 'wallet',
                forSomeone: rideData.forSomeone || false
            };
            if (rideData.forSomeone) {
                scheduledRide.recipientName = rideData.recipientName;
                scheduledRide.recipientPhone = rideData.recipientPhone;
            }
            if (rideData.stops && rideData.stops.length) {
                scheduledRide.stops = rideData.stops.map(s => ({ name: s.location.name, address: s.location.address, lat: s.location.lat, lng: s.location.lng }));
            }
            await database.ref(`scheduledRides/${scheduledId}`).set(scheduledRide);
            const userRef = database.ref(`users/${AppState.currentUser.uid}`);
            const userSnap = await userRef.once('value');
            const scheduledCount = (userSnap.val().scheduledRidesCount || 0) + 1;
            await userRef.update({ scheduledRidesCount: scheduledCount });
            if (rideData.paymentMethod === 'wallet') {
                await this.withdrawMoney(rideData.fare, 'Scheduled ride payment', scheduledId);
            }
            hideLoading();
            showToast('Ride scheduled!', 'success');
            this.sendNotification(AppState.currentUser.uid, 'Ride Scheduled', `Scheduled for ${new Date(rideData.scheduledTime).toLocaleString()}`, 'info', { scheduledRideId: scheduledId });
            if (!AppState.scheduledRides) AppState.scheduledRides = [];
            AppState.scheduledRides.push(scheduledRide);
            return scheduledId;
        } catch (e) {
            hideLoading();
            showToast('Error scheduling ride', 'error');
            throw e;
        }
    },

    async cancelScheduledRide(scheduledId) {
        try {
            const snap = await database.ref(`scheduledRides/${scheduledId}`).once('value');
            const ride = snap.val();
            if (!ride) throw new Error('Not found');
            if (ride.paymentMethod === 'wallet' && ride.status === 'scheduled') {
                await this.depositMoney(ride.fare, 'Scheduled ride cancellation refund', scheduledId);
            }
            await database.ref(`scheduledRides/${scheduledId}`).update({ status: 'cancelled', cancelledAt: Date.now() });
            if (AppState.scheduledCountdowns.has(scheduledId)) {
                clearInterval(AppState.scheduledCountdowns.get(scheduledId));
                AppState.scheduledCountdowns.delete(scheduledId);
            }
            const countdownDiv = document.getElementById('scheduleCountdown');
            if (countdownDiv) countdownDiv.remove();
            AppState.scheduledRides = AppState.scheduledRides.filter(r => r.id !== scheduledId);
            showToast('Scheduled ride cancelled', 'success');
        } catch (e) {
            showToast('Error cancelling scheduled ride', 'error');
        }
    },

    async cancelRide(rideId, reason) {
        showLoading('Cancelling ride...');
        try {
            const rideRef = database.ref(`rides/${rideId}`);
            const snap = await rideRef.once('value');
            const ride = snap.val();
            if (!ride) throw new Error('Ride not found');
            await rideRef.update({ status: 'cancelled', cancellationReason: reason, cancelledAt: Date.now() });
            if (ride.paymentMethod === 'wallet') {
                await this.depositMoney(ride.fare, 'Ride cancellation refund', rideId);
            }
            this.resetActiveRide();
            hideLoading();
            showToast('Ride cancelled', 'success');
        } catch (e) {
            hideLoading();
            showToast('Error cancelling ride', 'error');
        }
    },

    resetActiveRide() {
        AppState.currentRide = null;
        document.getElementById('driverPanel')?.classList.remove('active');
        document.body.classList.remove('ride-active');
        document.getElementById('sosButton')?.classList.remove('active');
    },

    handleRideCompletion(ride) {
        if (ride.referredBy) this.processReferralReward(ride.referredBy, ride);
        setTimeout(() => this.resetActiveRide(), 5000);
    },

    async processReferralReward(referralCode, ride) {
        const user = await this.findUserByReferralCode(referralCode);
        if (user) {
            await this.depositMoneyToUser(user.uid, 25, `Referral reward from ${ride.passengerName}`, ride.id);
            await database.ref(`users/${user.uid}`).update({ referralEarnings: (user.referralEarnings || 0) + 25 });
            this.sendNotification(user.uid, 'Referral Reward!', `${ride.passengerName} used your code. You earned K25!`, 'referral', { rideId: ride.id });
        }
    },

    async validateReferralCode(referralCode) {
        if (referralCode === AppState.userData?.referralCode) return { valid: false, message: 'Cannot use your own code' };
        const user = await this.findUserByReferralCode(referralCode);
        return user ? { valid: true, ownerName: user.name, userId: user.uid } : { valid: false, message: 'Invalid referral code' };
    },

    async findUserByReferralCode(referralCode) {
        const snap = await database.ref('users').orderByChild('referralCode').equalTo(referralCode).once('value');
        const users = snap.val();
        if (users) {
            const uid = Object.keys(users)[0];
            return { uid, ...users[uid] };
        }
        return null;
    },

    async depositMoney(amount, description, reference) {
        const transactionId = database.ref().child('walletTransactions').push().key;
        const newBalance = AppState.walletBalance + amount;
        await database.ref(`users/${AppState.currentUser.uid}/walletBalance`).set(newBalance);
        await database.ref(`walletTransactions/${AppState.currentUser.uid}/${transactionId}`).set({
            id: transactionId,
            userId: AppState.currentUser.uid,
            type: 'deposit',
            amount,
            description,
            reference,
            timestamp: Date.now(),
            status: 'completed',
            balanceBefore: AppState.walletBalance,
            balanceAfter: newBalance
        });
        AppState.walletBalance = newBalance;
        EnhancedUIUpdater.updateWalletBalance(newBalance);
        this.sendNotification(AppState.currentUser.uid, 'Deposit Successful', `ZMW ${amount.toFixed(2)} added`, 'payment');
        this.loadWalletTransactions(AppState.currentUser.uid);
        return transactionId;
    },

    async withdrawMoney(amount, description, reference) {
        if (amount > AppState.walletBalance) throw new Error('Insufficient balance');
        const transactionId = database.ref().child('walletTransactions').push().key;
        const newBalance = AppState.walletBalance - amount;
        await database.ref(`users/${AppState.currentUser.uid}/walletBalance`).set(newBalance);
        await database.ref(`walletTransactions/${AppState.currentUser.uid}/${transactionId}`).set({
            id: transactionId,
            userId: AppState.currentUser.uid,
            type: 'withdrawal',
            amount,
            description,
            reference,
            timestamp: Date.now(),
            status: 'completed',
            balanceBefore: AppState.walletBalance,
            balanceAfter: newBalance
        });
        AppState.walletBalance = newBalance;
        EnhancedUIUpdater.updateWalletBalance(newBalance);
        this.loadWalletTransactions(AppState.currentUser.uid);
        return transactionId;
    },

    async depositMoneyToUser(userId, amount, description, reference) {
        const userSnap = await database.ref(`users/${userId}`).once('value');
        const user = userSnap.val();
        const newBalance = (user.walletBalance || 0) + amount;
        await database.ref(`users/${userId}/walletBalance`).set(newBalance);
        const transactionId = database.ref().child('walletTransactions').push().key;
        await database.ref(`walletTransactions/${userId}/${transactionId}`).set({
            id: transactionId,
            userId,
            type: 'deposit',
            amount,
            description,
            reference,
            timestamp: Date.now(),
            status: 'completed',
            balanceBefore: user.walletBalance || 0,
            balanceAfter: newBalance,
            fromName: AppState.userData?.name || 'System'
        });
        return transactionId;
    },

    async transferMoney(recipientCode, amount, message) {
        if (amount > AppState.walletBalance) throw new Error('Insufficient balance');
        const recipient = await this.findUserByReferralCode(recipientCode);
        if (!recipient) throw new Error('Recipient not found');
        if (recipient.uid === AppState.currentUser.uid) throw new Error('Cannot transfer to yourself');
        showLoading('Processing transfer...');
        const senderTransactionId = await this.withdrawMoney(amount, `Transfer to ${recipient.name}`, null);
        await this.depositMoneyToUser(recipient.uid, amount, `Transfer from ${AppState.userData.name}`, null);
        const transferId = database.ref().child('transfers').push().key;
        await database.ref(`transfers/${transferId}`).set({
            id: transferId,
            senderId: AppState.currentUser.uid,
            senderName: AppState.userData.name,
            recipientId: recipient.uid,
            recipientName: recipient.name,
            amount,
            message,
            timestamp: Date.now()
        });
        hideLoading();
        showToast(`ZMW ${amount.toFixed(2)} transferred to ${recipient.name}`, 'success');
        this.sendNotification(recipient.uid, 'Money Received', `${AppState.userData.name} sent you ZMW ${amount.toFixed(2)}`, 'payment', { transferId });
        return transferId;
    },

    async sendNotification(userId, title, message, type, data = {}, action = null) {
        const id = database.ref().child('notifications').push().key;
        await database.ref(`notifications/${userId}/${id}`).set({
            id,
            title,
            message,
            type,
            data,
            action,
            read: false,
            timestamp: Date.now()
        });
        if (userId === AppState.currentUser?.uid) {
            AppState.notifications.unshift({ id, title, message, type, data, action, read: false, timestamp: Date.now() });
            AppState.unreadNotifications++;
            const badge = document.getElementById('notificationCount');
            if (badge) {
                badge.textContent = AppState.unreadNotifications > 99 ? '99+' : AppState.unreadNotifications;
                badge.style.display = 'flex';
            }
            if (AppState.notificationsOpen) EnhancedUIUpdater.updateNotifications(AppState.notifications);
        }
        return id;
    },

    async markAllNotificationsAsRead() {
        const updates = {};
        AppState.notifications.forEach(n => { if (!n.read) updates[`${n.id}/read`] = true; });
        if (Object.keys(updates).length) {
            await database.ref(`notifications/${AppState.currentUser.uid}`).update(updates);
            AppState.notifications.forEach(n => n.read = true);
            AppState.unreadNotifications = 0;
            const badge = document.getElementById('notificationCount');
            if (badge) badge.style.display = 'none';
        }
    },

    async sendChatMessage(rideId, text) {
        const msgId = database.ref().child('messages').push().key;
        await database.ref(`chats/${rideId}/messages/${msgId}`).set({
            id: msgId,
            rideId,
            senderId: AppState.currentUser.uid,
            senderName: AppState.userData.name,
            text,
            timestamp: Date.now(),
            isDriver: false
        });
    },

    async getSplitRideDetails(splitRideId) {
        const snap = await database.ref(`splitRides/${splitRideId}`).once('value');
        return snap.val();
    },

    async acceptSplitRideInvitation(splitRideId, userId) {
        const invSnap = await database.ref('splitRideInvitations').orderByChild('splitRideId').equalTo(splitRideId).once('value');
        const invs = invSnap.val();
        for (let invId in invs) {
            if (invs[invId].recipientId === userId) {
                await database.ref(`splitRideInvitations/${invId}`).update({ status: 'accepted', acceptedAt: Date.now() });
                const splitSnap = await database.ref(`splitRides/${splitRideId}`).once('value');
                const split = splitSnap.val();
                const acceptedCount = (split.acceptedCount || 0) + 1;
                await database.ref(`splitRides/${splitRideId}`).update({ acceptedCount });
                if (acceptedCount === split.participants - 1) {
                    await database.ref(`splitRides/${splitRideId}`).update({ status: 'ready' });
                    this.sendNotification(split.hostId, 'Split Ride Ready', 'All participants have accepted', 'split', { splitRideId });
                }
                return true;
            }
        }
        return false;
    },

    async rejectSplitRideInvitation(splitRideId, userId) {
        const invSnap = await database.ref('splitRideInvitations').orderByChild('splitRideId').equalTo(splitRideId).once('value');
        const invs = invSnap.val();
        for (let invId in invs) {
            if (invs[invId].recipientId === userId) {
                await database.ref(`splitRideInvitations/${invId}`).update({ status: 'rejected', rejectedAt: Date.now() });
                const splitSnap = await database.ref(`splitRides/${splitRideId}`).once('value');
                const split = splitSnap.val();
                const newParticipants = split.participants - 1;
                const newEachShare = split.totalFare / newParticipants;
                await database.ref(`splitRides/${splitRideId}`).update({ participants: newParticipants, eachShare: newEachShare });
                this.sendNotification(split.hostId, 'Split Ride Updated', `A participant declined. New share: ZMW ${newEachShare.toFixed(2)}`, 'split', { splitRideId });
                return true;
            }
        }
        return false;
    },

    async getBroadcastDetails(broadcastId) {
        const snap = await database.ref(`broadcasts/${broadcastId}`).once('value');
        return snap.val();
    },

    async startTrackingBroadcast(broadcastId) {
        AppState.realtimeListeners.push(
            database.ref(`broadcasts/${broadcastId}`).on('value', snap => {
                const b = snap.val();
                if (b) console.log('Broadcast updated:', b);
            })
        );
        const bSnap = await database.ref(`broadcasts/${broadcastId}`).once('value');
        const b = bSnap.val();
        if (b && b.rideId) this.listenToRideUpdates(b.rideId);
        return true;
    },

    listenToRideUpdates(rideId) {
        AppState.realtimeListeners.push(
            database.ref(`rides/${rideId}`).on('value', snap => {
                const ride = snap.val();
                if (ride) {
                    AppState.currentRide = { id: rideId, ...ride };
                    EnhancedUIUpdater.updateRideStatus(ride.status);
                }
            })
        );
    },

    async saveSOSConfig(contact1Name, contact1Phone, contact2Name, contact2Phone, message) {
        const config = { contact1Name, contact1Phone, contact2Name, contact2Phone, message, updatedAt: Date.now() };
        await database.ref(`sosConfig/${AppState.currentUser.uid}`).set(config);
        AppState.sosConfig = config;
        showToast('SOS setup saved', 'success');
    },

    async sendSOSAlert(rideId, data) {
        const alertId = database.ref().child('sosAlerts').push().key;
        await database.ref(`sosAlerts/${alertId}`).set({
            id: alertId,
            rideId,
            userId: AppState.currentUser.uid,
            userName: AppState.userData.name,
            contacts: [
                { name: data.emergencyContact1Name, phone: data.emergencyContact1 },
                { name: data.emergencyContact2Name, phone: data.emergencyContact2 }
            ],
            message: data.message,
            location: data.location,
            rideDetails: data.rideDetails,
            timestamp: Date.now(),
            status: 'sent'
        });
        showToast('SOS alert sent to emergency contacts', 'success');
        return alertId;
    }
};

// ============================================
// ENHANCED WALLET MANAGER
// ============================================
const EnhancedWalletManager = {
    init() {
        document.getElementById('depositBtn')?.addEventListener('click', () => this.showDepositModal());
        document.getElementById('withdrawBtn')?.addEventListener('click', () => this.showWithdrawModal());
        document.getElementById('transferBtn')?.addEventListener('click', () => showModal('transfer'));
        document.getElementById('transactionsBtn')?.addEventListener('click', () => this.showTransactionsModal());
        document.getElementById('confirmDepositBtn')?.addEventListener('click', () => this.processDeposit());
        document.getElementById('confirmWithdrawBtn')?.addEventListener('click', () => this.processWithdrawal());
        document.getElementById('confirmTransferBtn')?.addEventListener('click', () => this.processTransfer());
        this.setupQuickAmounts();
        this.setupPaymentMethodSelection();
        document.getElementById('exportTransactionsBtn')?.addEventListener('click', () => this.exportTransactions());
    },

    showDepositModal() {
        document.getElementById('depositCurrentBalance').textContent = `ZMW ${AppState.walletBalance.toFixed(2)}`;
        showModal('deposit');
    },

    showWithdrawModal() {
        document.getElementById('withdrawCurrentBalance').textContent = `ZMW ${AppState.walletBalance.toFixed(2)}`;
        showModal('withdraw');
    },

    showTransactionsModal() {
        document.getElementById('transactionsBalance').textContent = `ZMW ${AppState.walletBalance.toFixed(2)}`;
        document.getElementById('transactionsCount').textContent = AppState.walletTransactions?.length || 0;
        this.displayTransactions(AppState.walletTransactions || []);
        showModal('transactions');
    },

    setupQuickAmounts() {
        document.querySelectorAll('.quick-amount').forEach(btn => {
            btn.addEventListener('click', function() {
                const amount = this.dataset.amount;
                const parent = this.closest('.modal-content');
                const input = parent.querySelector('input[type="number"]');
                if (input) input.value = amount;
            });
        });
    },

    setupPaymentMethodSelection() {
        document.querySelectorAll('.payment-method-option').forEach(opt => {
            opt.addEventListener('click', function() {
                this.parentElement.querySelectorAll('.payment-method-option').forEach(o => o.classList.remove('selected'));
                this.classList.add('selected');
                const method = this.dataset.method;
                const isDeposit = this.closest('#depositModal') !== null;
                const detailsDiv = isDeposit ? document.getElementById('paymentMethodDetails') : document.getElementById('withdrawMethodDetails');
                detailsDiv.innerHTML = `<div style="background:#FFF3E0; padding:15px; border-radius:8px;">
                    <strong>${method.toUpperCase()} Instructions:</strong><br>
                    ${isDeposit ? 'Send payment to Jubel account using reference.' : 'Withdrawal will be processed within 24 hours.'}
                </div>`;
            });
        });
    },

    processDeposit() {
        const amount = parseFloat(document.getElementById('depositAmount').value);
        if (!amount || amount <= 0) return showToast('Enter valid amount', 'warning');
        const method = document.querySelector('#depositModal .payment-method-option.selected')?.dataset.method;
        if (!method) return showToast('Select payment method', 'warning');
        showLoading('Processing deposit...');
        setTimeout(() => {
            EnhancedFirebaseManager.depositMoney(amount, `Deposit via ${method}`, null).then(() => {
                hideLoading();
                hideModal('deposit');
                showToast('Deposit successful!', 'success');
            }).catch(e => {
                hideLoading();
                showToast('Deposit failed', 'error');
            });
        }, 1500);
    },

    processWithdrawal() {
        const amount = parseFloat(document.getElementById('withdrawAmount').value);
        if (!amount || amount <= 0) return showToast('Enter valid amount', 'warning');
        if (amount > AppState.walletBalance) return showToast('Insufficient balance', 'error');
        const method = document.querySelector('#withdrawModal .payment-method-option.selected')?.dataset.method;
        if (!method) return showToast('Select withdrawal method', 'warning');
        showLoading('Processing withdrawal...');
        setTimeout(() => {
            EnhancedFirebaseManager.withdrawMoney(amount, `Withdrawal via ${method}`, null).then(() => {
                hideLoading();
                hideModal('withdraw');
                showToast('Withdrawal requested', 'success');
            }).catch(e => {
                hideLoading();
                showToast('Withdrawal failed', 'error');
            });
        }, 1500);
    },

    processTransfer() {
        const code = document.getElementById('recipientCode').value.trim();
        const amount = parseFloat(document.getElementById('transferAmount').value);
        const msg = document.getElementById('transferMessage').value;
        if (!code) return showToast('Enter recipient code', 'warning');
        if (!amount || amount <= 0) return showToast('Enter valid amount', 'warning');
        EnhancedFirebaseManager.transferMoney(code, amount, msg).catch(e => showToast(e.message, 'error'));
    },

    displayTransactions(transactions) {
        const container = document.getElementById('transactionsList');
        if (!container) return;
        const filter = AppState.transactionFilter || 'all';
        let filtered = transactions;
        if (filter !== 'all') filtered = transactions.filter(t => t.type === filter);
        filtered.sort((a,b) => b.timestamp - a.timestamp);
        if (!filtered.length) {
            container.innerHTML = '<div style="text-align:center; padding:40px; color:#999;">No transactions</div>';
            return;
        }
        let html = '';
        filtered.forEach(t => {
            const date = new Date(t.timestamp).toLocaleString();
            html += `<div class="transaction-item">
                <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #eee;">
                    <div><strong>${t.type}</strong> ${t.description ? '<br><small>'+t.description+'</small>' : ''}</div>
                    <div style="font-weight:700; color:${t.type==='deposit'||t.type==='refund'?'#4CAF50':'#F44336'};">ZMW ${t.amount.toFixed(2)}</div>
                </div>
            </div>`;
        });
        container.innerHTML = html;
    },

    exportTransactions() {
        const data = AppState.walletTransactions.map(t => `${t.type},${t.amount},${t.description || ''},${new Date(t.timestamp).toISOString()}`).join('\n');
        const blob = new Blob([data], {type: 'text/plain'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `transactions-${Date.now()}.txt`;
        a.click();
    }
};

// ============================================
// ENHANCED CITY DETECTOR
// ============================================
const EnhancedCityDetector = {
    zambianCities: {
        'Lusaka': { lat: -15.4167, lng: 28.2833, bounds: [27.8, -15.8, 28.8, -15.2] },
        'Ndola': { lat: -12.9667, lng: 28.6333, bounds: [28.5, -13.1, 28.8, -12.9] },
        'Kitwe': { lat: -12.8167, lng: 28.2000, bounds: [27.9, -13.1, 28.4, -12.7] },
        'Kabwe': { lat: -14.4333, lng: 28.4500, bounds: [28.3, -14.6, 28.6, -14.3] },
        'Livingstone': { lat: -17.8500, lng: 25.8667, bounds: [25.7, -18.0, 26.0, -17.7] },
        'Chipata': { lat: -13.6333, lng: 32.6500, bounds: [32.5, -13.8, 32.8, -13.6] },
        'Chingola': { lat: -12.5333, lng: 27.8500, bounds: [27.8, -12.8, 27.9, -12.4] },
        'Mufulira': { lat: -12.5500, lng: 28.2333, bounds: [28.1, -12.7, 28.3, -12.5] },
        'Luanshya': { lat: -13.1333, lng: 28.4000, bounds: [28.3, -13.2, 28.5, -13.0] },
        'Kasama': { lat: -10.2000, lng: 31.2000, bounds: [31.1, -10.3, 31.3, -10.1] },
        'Solwezi': { lat: -12.1833, lng: 26.4000, bounds: [26.3, -12.3, 26.5, -12.1] },
        'Mazabuka': { lat: -15.8667, lng: 27.7667, bounds: [27.7, -15.9, 27.9, -15.7] }
    },

    async detectCityFromCoordinates(lat, lng) {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
            const res = await fetch(url, { headers: { 'User-Agent': 'JubelRideApp/2.0' } });
            const data = await res.json();
            const city = data.address?.city || data.address?.town || data.address?.village;
            if (city && this.isValidZambianCity(city)) return city;
            return this.detectCityByProximity(lat, lng);
        } catch (e) {
            return this.detectCityByProximity(lat, lng);
        }
    },

    detectCityByProximity(lat, lng) {
        let closest = null;
        let minDist = Infinity;
        for (let [name, coords] of Object.entries(this.zambianCities)) {
            const dist = EnhancedPriceCalculator.calculateDistance(lat, lng, coords.lat, coords.lng);
            if (dist < minDist && dist < 50) {
                minDist = dist;
                closest = name;
            }
        }
        return closest;
    },

    isValidZambianCity(city) {
        return Object.keys(this.zambianCities).some(c => city.toLowerCase().includes(c.toLowerCase()));
    },

    async getPreciseUserLocation(lat, lng) {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
            const res = await fetch(url, { headers: { 'User-Agent': 'JubelRideApp/2.0' } });
            const data = await res.json();
            const address = data.address || {};
            const parts = [];
            if (address.house_number) parts.push(`#${address.house_number}`);
            if (address.building) parts.push(address.building);
            if (address.road) parts.push(address.road);
            if (address.suburb) parts.push(address.suburb);
            const detailed = parts.join(', ');
            return {
                address: detailed || 'Current Location',
                detailedAddress: detailed || `Near ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                fullAddress: data.display_name || detailed,
                city: address.city || address.town || address.municipality,
                road: address.road,
                suburb: address.suburb,
                houseNumber: address.house_number,
                building: address.building,
                latitude: lat,
                longitude: lng
            };
        } catch (e) {
            return {
                address: 'Current Location',
                detailedAddress: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                fullAddress: `Current Location (${lat.toFixed(6)}, ${lng.toFixed(6)})`,
                city: null,
                latitude: lat,
                longitude: lng
            };
        }
    },

    async updateCityAndAddress(lat, lng) {
        const detected = await this.detectCityFromCoordinates(lat, lng);
        if (!detected) {
            this.showManualCitySelection(lat, lng);
            return null;
        }
        AppState.currentCity = detected;
        const addressDetails = await this.getPreciseUserLocation(lat, lng);
        const pickupInput = document.getElementById('pickupLocation');
        if (pickupInput) {
            pickupInput.value = addressDetails.detailedAddress;
            pickupInput.dataset.lat = lat;
            pickupInput.dataset.lng = lng;
        }
        AppState.pickup = {
            lat, lng,
            address: addressDetails.detailedAddress,
            detailedAddress: addressDetails.detailedAddress,
            fullAddress: addressDetails.fullAddress,
            city: detected,
            road: addressDetails.road,
            suburb: addressDetails.suburb,
            houseNumber: addressDetails.houseNumber,
            building: addressDetails.building
        };
        if (map) {
            map.setView([lat, lng], 17);
            if (currentLocationMarker) map.removeLayer(currentLocationMarker);
            currentLocationMarker = L.marker([lat, lng], {
                icon: L.divIcon({ className: 'current-location-marker', html: '<i class="fas fa-map-marker-alt" style="color:#FF6B35; font-size:24px;"></i>', iconSize: [24,24], iconAnchor: [12,24] })
            }).addTo(map).bindPopup('You are here');
            this.showCityBoundaryOnMap(detected);
        }
        EnhancedUIUpdater.updatePickupMarker(AppState.pickup);
        EnhancedSearchEngine.addToRecentLocations({ lat, lng, name: 'Current Location', address: addressDetails.detailedAddress, fullAddress: addressDetails.fullAddress, city: detected });
        showToast(`Location set: ${addressDetails.detailedAddress}`, 'success');
        return { city: detected, address: addressDetails };
    },

    showCityBoundaryOnMap(city) {
        if (cityBoundaryLayer) map.removeLayer(cityBoundaryLayer);
        const data = this.zambianCities[city];
        if (data && data.bounds) {
            const [west, south, east, north] = data.bounds;
            cityBoundaryLayer = L.rectangle([[south, west], [north, east]], {
                color: '#FF6B35', weight: 2, opacity: 0.5, fillOpacity: 0.1
            }).addTo(map).bindPopup(`${city} Service Area`);
        }
    },

    showManualCitySelection(lat, lng) {
        const modal = document.createElement('div');
        modal.className = 'manual-city-selection-modal';
        modal.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.8); display:flex; justify-content:center; align-items:center; z-index:10001; padding:20px;';
        const cities = Object.keys(this.zambianCities).map(name => ({ name, distance: EnhancedPriceCalculator.calculateDistance(lat, lng, this.zambianCities[name].lat, this.zambianCities[name].lng) })).sort((a,b) => a.distance - b.distance);
        let html = `<div style="background:white; border-radius:12px; width:100%; max-width:400px; padding:20px;">
            <h3 style="margin-bottom:15px;">Select Your City</h3>
            <p style="margin-bottom:15px;">We couldn't auto-detect your city. Please select:</p>`;
        cities.forEach(c => {
            html += `<div class="city-item" data-city="${c.name}" style="padding:15px; border-bottom:1px solid #eee; cursor:pointer;">
                <div style="font-weight:600;">${c.name}</div>
                <div style="font-size:12px; color:#666;">${c.distance.toFixed(1)} km away</div>
            </div>`;
        });
        html += `<button id="cancelCitySelect" style="margin-top:20px; padding:10px; width:100%; background:#f5f5f5; border:none; border-radius:6px;">Cancel</button></div>`;
        modal.innerHTML = html;
        document.body.appendChild(modal);
        modal.querySelectorAll('.city-item').forEach(item => {
            item.addEventListener('click', () => {
                const city = item.dataset.city;
                AppState.currentCity = city;
                document.body.removeChild(modal);
                showToast(`City set to ${city}`, 'success');
            });
        });
        modal.querySelector('#cancelCitySelect').addEventListener('click', () => document.body.removeChild(modal));
    }
};

// ============================================
// MAP INITIALIZATION
// ============================================
function initializeMap() {
    map = L.map('map').setView([-15.4167, 28.2833], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
    L.control.scale().addTo(map);
    EnhancedUIUpdater.hideMapLoading();
    AppState.mapInitialized = true;
}

// ============================================
// GET CURRENT LOCATION
// ============================================
async function getCurrentLocation(showLoad = true) {
    if (!navigator.geolocation) {
        showToast('Geolocation not supported', 'error');
        return;
    }
    if (showLoad) showLoading('Getting location...');
    try {
        const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
        });
        const { latitude, longitude } = pos.coords;
        AppState.userLocation = { lat: latitude, lng: longitude };
        await EnhancedCityDetector.updateCityAndAddress(latitude, longitude);
        if (showLoad) hideLoading();
    } catch (e) {
        if (showLoad) hideLoading();
        showToast('Could not get location', 'error');
        EnhancedCityDetector.showManualCitySelection(-15.4167, 28.2833);
    }
}

// ============================================
// SERVICE SELECTION HANDLING
// ============================================
function setupServiceIcons() {
    document.querySelectorAll('.service-icon-item').forEach(item => {
        item.addEventListener('click', () => {
            const service = item.dataset.service;
            let popupTitle = '', options = [];
            if (service === 'car') {
                popupTitle = 'Select Car Type';
                options = [
                    { type: 'economy', name: 'Economy', desc: 'Affordable', price: AppState.rideTypes.economy.base },
                    { type: 'standard', name: 'Standard', desc: 'Comfortable', price: AppState.rideTypes.standard.base },
                    { type: 'premium', name: 'Premium', desc: 'Luxury', price: AppState.rideTypes.premium.base }
                ];
            } else if (service === 'delivery-bike') {
                popupTitle = 'Delivery Options';
                options = [
                    { type: 'express', name: 'Express Delivery', desc: 'Fast', price: AppState.deliveryTypes.express.base },
                    { type: 'standard', name: 'Standard Delivery', desc: 'Regular', price: AppState.deliveryTypes.standard.base }
                ];
            } else if (service === 'bicycle') {
                popupTitle = 'Bicycle Delivery';
                options = [
                    { type: 'fast', name: 'Fast Bicycle', desc: 'Quick', price: 20 },
                    { type: 'standard', name: 'Standard Bicycle', desc: 'Regular', price: 15 }
                ];
            } else if (service === 'truck') {
                popupTitle = 'Select Truck Type';
                options = [
                    { type: 'pickup', name: 'Pickup', desc: '1.5 tons', price: AppState.truckTypes.pickup.base },
                    { type: 'light', name: 'Light Truck', desc: '3 tons', price: AppState.truckTypes.light.base },
                    { type: 'medium', name: 'Medium Truck', desc: '7 tons', price: AppState.truckTypes.medium.base },
                    { type: 'heavy', name: 'Heavy Truck', desc: '15 tons', price: AppState.truckTypes.heavy.base }
                ];
            }
            document.getElementById('popupTitle').innerHTML = `<i class="fas ${item.querySelector('i').className}"></i> ${popupTitle}`;
            const optionsDiv = document.getElementById('rideTypeOptions');
            optionsDiv.innerHTML = options.map(opt => `
                <div class="ride-type-option" data-type="${opt.type}" data-price="${opt.price}">
                    <div class="option-left"><i class="fas fa-${service === 'car' ? 'car' : service === 'delivery-bike' ? 'motorcycle' : service === 'bicycle' ? 'bicycle' : 'truck'}"></i>
                        <div><div class="name">${opt.name}</div><div class="desc">${opt.desc}</div></div>
                    </div>
                    <div class="option-right">ZMW ${opt.price}</div>
                </div>
            `).join('');
            document.getElementById('rideTypePopup').classList.add('active');
        });
    });
}

// ============================================
// EVENT LISTENERS SETUP
// ============================================
function setupEventListeners() {
    document.getElementById('panelHandle').addEventListener('click', () => {
        document.getElementById('mainPanel').classList.toggle('expanded');
    });

    document.getElementById('sidebarToggle').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('sidebarMenu').classList.toggle('active');
    });

    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', function() {
            const screen = this.dataset.screen;
            const option = this.dataset.option;
            document.getElementById('sidebarMenu').classList.remove('active');
            if (screen) {
                if (screen === 'dashboard') {
                    document.querySelectorAll('.full-screen-modal').forEach(m => m.classList.remove('active'));
                } else {
                    document.getElementById(screen + 'Screen').classList.add('active');
                }
            } else if (option) {
                if (option === 'schedule') showModal('schedule');
                else if (option === 'orderForSomeone') showModal('orderForSomeone');
                else if (option === 'shareRide') showModal('shareRide');
                else if (option === 'broadcast') showModal('broadcast');
                else if (option === 'express') showModal('schedule');
                else if (option === 'sosSetup') showModal('sos');
            }
        });
    });

    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('sidebarMenu');
        const toggle = document.getElementById('sidebarToggle');
        if (!sidebar.contains(e.target) && !toggle.contains(e.target) && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
    });

    document.querySelectorAll('.modal-back-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.full-screen-modal').classList.remove('active');
        });
    });

    document.getElementById('pickupLocation').addEventListener('click', () => {
        document.getElementById('mainPanel').classList.add('expanded');
    });
    document.getElementById('destinationLocation').addEventListener('click', () => {
        document.getElementById('mainPanel').classList.add('expanded');
    });

    document.getElementById('addStopBtn').addEventListener('click', () => EnhancedLocationManager.addStop());

    document.getElementById('locateMeBtn').addEventListener('click', getCurrentLocation);
    document.getElementById('zoomInBtn').addEventListener('click', () => map.zoomIn());
    document.getElementById('zoomOutBtn').addEventListener('click', () => map.zoomOut());
    document.getElementById('clearRouteBtn').addEventListener('click', () => {
        if (routeLayer) map.removeLayer(routeLayer);
        if (destinationMarker) map.removeLayer(destinationMarker);
        document.getElementById('destinationLocation').value = '';
        AppState.destination = null;
        document.getElementById('serviceIconsRow').classList.remove('visible');
    });

    document.getElementById('popupClose').addEventListener('click', () => {
        document.getElementById('rideTypePopup').classList.remove('active');
    });

    document.getElementById('confirmRideTypeBtn').addEventListener('click', () => {
        const selected = document.querySelector('.ride-type-option.selected');
        if (!selected) {
            showToast('Select a ride type', 'warning');
            return;
        }
        const type = selected.dataset.type;
        const price = parseFloat(selected.dataset.price);
        const popupTitle = document.getElementById('popupTitle').innerText;
        let serviceType = 'car';
        if (popupTitle.includes('Delivery')) serviceType = 'delivery';
        else if (popupTitle.includes('Bicycle')) serviceType = 'bicycle';
        else if (popupTitle.includes('Truck')) serviceType = 'truck';

        const rideData = {
            pickup: AppState.pickup,
            destination: AppState.destination,
            rideType: type,
            serviceType: serviceType,
            fare: price,
            distance: EnhancedPriceCalculator.calculateDistance(AppState.pickup.lat, AppState.pickup.lng, AppState.destination.lat, AppState.destination.lng),
            stops: AppState.rideStops.filter(s => s.location)
        };
        document.getElementById('rideTypePopup').classList.remove('active');
        EnhancedUIUpdater.showPaymentModal(price, rideData);
    });

    document.getElementById('paymentClose').addEventListener('click', () => {
        document.getElementById('paymentModal').classList.remove('active');
    });

    document.getElementById('confirmPaymentBtn').addEventListener('click', () => {
        const selected = document.querySelector('.payment-method.selected');
        if (!selected) return showToast('Select payment method', 'warning');
        const method = selected.dataset.payment;
        const rideData = AppState.pendingRideData;
        if (!rideData) return showToast('No ride data', 'error');
        rideData.paymentMethod = method;
        if (rideData.isScheduled) {
            EnhancedFirebaseManager.requestScheduledRide(rideData).then(() => {
                document.getElementById('paymentModal').classList.remove('active');
                AppState.pendingRideData = null;
            });
        } else {
            EnhancedFirebaseManager.requestRide(rideData).then(() => {
                document.getElementById('paymentModal').classList.remove('active');
                AppState.pendingRideData = null;
            });
        }
    });

    document.getElementById('callDriverBtn').addEventListener('click', () => {
        if (AppState.currentRide && AppState.currentRide.driverPhone) {
            window.open(`tel:${AppState.currentRide.driverPhone}`);
        } else showToast('Driver phone unavailable', 'warning');
    });

    document.getElementById('openChatBtn').addEventListener('click', () => {
        document.getElementById('chatContainer').classList.add('active');
    });

    document.getElementById('chatClose').addEventListener('click', () => {
        document.getElementById('chatContainer').classList.remove('active');
    });

    document.getElementById('chatSend').addEventListener('click', () => {
        const input = document.getElementById('chatInput');
        if (input.value.trim() && AppState.currentRide) {
            EnhancedFirebaseManager.sendChatMessage(AppState.currentRide.id, input.value);
            input.value = '';
        }
    });

    document.getElementById('chatSendFull').addEventListener('click', () => {
        const input = document.getElementById('chatInputFull');
        if (input.value.trim() && AppState.currentRide) {
            EnhancedFirebaseManager.sendChatMessage(AppState.currentRide.id, input.value);
            input.value = '';
        }
    });

    document.getElementById('cancelRideBtn').addEventListener('click', () => {
        if (AppState.currentRide) {
            showModal('cancel');
        }
    });

    document.querySelectorAll('.cancel-reason').forEach(r => {
        r.addEventListener('click', function() {
            document.querySelectorAll('.cancel-reason').forEach(x => x.classList.remove('selected'));
            this.classList.add('selected');
            document.getElementById('otherReasonGroup').style.display = this.dataset.reason === 'other' ? 'block' : 'none';
        });
    });

    document.getElementById('confirmCancelBtn').addEventListener('click', () => {
        const selected = document.querySelector('.cancel-reason.selected');
        if (!selected) return showToast('Select a reason', 'warning');
        let reason = selected.dataset.reason;
        if (reason === 'other') {
            const other = document.getElementById('otherReason').value;
            if (!other) return showToast('Please specify', 'warning');
            reason = `other: ${other}`;
        }
        if (AppState.currentRide) {
            EnhancedFirebaseManager.cancelRide(AppState.currentRide.id, reason);
            hideModal('cancel');
        }
    });

    document.getElementById('sosButton').addEventListener('click', () => {
        if (!AppState.sosConfig) {
            showModal('sos');
        } else if (AppState.currentRide) {
            EnhancedFirebaseManager.sendSOSAlert(AppState.currentRide.id, {
                emergencyContact1: AppState.sosConfig.contact1Phone,
                emergencyContact1Name: AppState.sosConfig.contact1Name,
                emergencyContact2: AppState.sosConfig.contact2Phone,
                emergencyContact2Name: AppState.sosConfig.contact2Name,
                message: AppState.sosConfig.message,
                location: AppState.userLocation,
                rideDetails: AppState.currentRide
            });
        }
    });

    document.getElementById('notificationBell').addEventListener('click', (e) => {
        e.stopPropagation();
        if (AppState.notificationsOpen) EnhancedUIUpdater.hideNotificationsPanel();
        else EnhancedUIUpdater.showNotificationsPanel();
    });
    document.getElementById('notificationsClose').addEventListener('click', EnhancedUIUpdater.hideNotificationsPanel);

    document.querySelectorAll('.emergency-service').forEach(s => {
        s.addEventListener('click', function() {
            const type = this.dataset.type;
            if (type === 'sos') showModal('sos');
            else {
                EnhancedUIUpdater.showEmergencyStations(type);
            }
        });
    });

    document.getElementById('saveSOSBtn').addEventListener('click', () => {
        const c1n = document.getElementById('sosContact1Name').value;
        const c1p = document.getElementById('sosContact1Phone').value;
        const c2n = document.getElementById('sosContact2Name').value;
        const c2p = document.getElementById('sosContact2Phone').value;
        const msg = document.getElementById('sosMessage').value;
        if (!c1n || !c1p) return showToast('Primary contact required', 'warning');
        EnhancedFirebaseManager.saveSOSConfig(c1n, c1p, c2n, c2p, msg);
        hideModal('sos');
    });

    document.getElementById('confirmScheduleBtn').addEventListener('click', () => {
        if (!AppState.pickup || !AppState.destination) return showToast('Set pickup and destination', 'warning');
        const date = document.getElementById('scheduleDate').value;
        const time = document.getElementById('scheduleTime').value;
        if (!date || !time) return showToast('Select date and time', 'warning');
        const scheduledTime = new Date(`${date}T${time}`).getTime();
        if (scheduledTime <= Date.now()) return showToast('Future time required', 'warning');
        const forSomeone = document.getElementById('scheduleForSomeone').checked;
        const recipientName = document.getElementById('recipientName').value;
        const recipientPhone = document.getElementById('recipientPhone').value;
        if (forSomeone && (!recipientName || !recipientPhone)) return showToast('Enter recipient details', 'warning');
        const distance = EnhancedPriceCalculator.calculateDistance(AppState.pickup.lat, AppState.pickup.lng, AppState.destination.lat, AppState.destination.lng);
        const fare = EnhancedPriceCalculator.calculateRideFare(distance, AppState.selectedRideType);
        const rideData = {
            pickup: AppState.pickup,
            destination: AppState.destination,
            rideType: AppState.selectedRideType,
            fare,
            distance,
            scheduledTime,
            forSomeone,
            recipientName, recipientPhone,
            isScheduled: true
        };
        AppState.pendingScheduledRideData = rideData;
        EnhancedUIUpdater.showPaymentModal(fare, rideData);
    });

    document.getElementById('scheduleForSomeone').addEventListener('change', function() {
        document.getElementById('someoneElseDetails').style.display = this.checked ? 'block' : 'none';
    });

    document.getElementById('confirmSomeoneRideBtn').addEventListener('click', () => {
        if (!AppState.pickup || !AppState.destination) return showToast('Set locations', 'warning');
        const name = document.getElementById('someoneName').value;
        const phone = document.getElementById('someonePhone').value;
        if (!name || !phone) return showToast('Enter recipient details', 'warning');
        const distance = EnhancedPriceCalculator.calculateDistance(AppState.pickup.lat, AppState.pickup.lng, AppState.destination.lat, AppState.destination.lng);
        const fare = EnhancedPriceCalculator.calculateRideFare(distance, AppState.selectedRideType);
        const rideData = {
            pickup: AppState.pickup,
            destination: AppState.destination,
            rideType: AppState.selectedRideType,
            fare,
            distance,
            forSomeone: true,
            recipientName: name,
            recipientPhone: phone,
            isScheduled: false
        };
        EnhancedUIUpdater.showPaymentModal(fare, rideData);
    });

    document.getElementById('addShareMemberBtn').addEventListener('click', () => {
        const code = document.getElementById('shareMemberInput').value.trim();
        if (!code) return showToast('Enter referral code', 'warning');
        EnhancedFirebaseManager.findUserByReferralCode(code).then(friend => {
            if (!friend) return showToast('Friend not found', 'error');
            if (AppState.shareRideFriends.some(f => f.code === code)) return showToast('Already added', 'warning');
            AppState.shareRideFriends.push({ code, name: friend.name, userId: friend.uid, status: 'pending' });
            updateShareFriendsList();
            document.getElementById('shareMemberInput').value = '';
        });
    });

    function updateShareFriendsList() {
        const container = document.getElementById('shareFriendsList');
        container.innerHTML = AppState.shareRideFriends.map((f, i) => `<div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;">
            <span>${f.name} (${f.code})</span>
            <button class="remove-share-friend" data-index="${i}" style="background:#f44336; color:white; border:none; border-radius:4px; padding:2px 8px;">Remove</button>
        </div>`).join('');
        container.querySelectorAll('.remove-share-friend').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index);
                AppState.shareRideFriends.splice(idx, 1);
                updateShareFriendsList();
            });
        });
    }

    document.getElementById('confirmShareRideBtn').addEventListener('click', () => {
        if (!AppState.pickup || !AppState.destination) return showToast('Set locations', 'warning');
        if (!AppState.shareRideFriends.length) return showToast('Add at least one friend', 'warning');
        const distance = EnhancedPriceCalculator.calculateDistance(AppState.pickup.lat, AppState.pickup.lng, AppState.destination.lat, AppState.destination.lng);
        const totalFare = EnhancedPriceCalculator.calculateRideFare(distance, AppState.selectedRideType);
        const eachShare = totalFare / (AppState.shareRideFriends.length + 1);
        const rideData = {
            pickup: AppState.pickup,
            destination: AppState.destination,
            rideType: AppState.selectedRideType,
            totalFare,
            yourShare: eachShare,
            friends: AppState.shareRideFriends,
            distance,
            isSplitRide: true,
            participants: AppState.shareRideFriends.length + 1
        };
        EnhancedUIUpdater.showPaymentModal(eachShare, rideData);
    });

    document.getElementById('startBroadcastRideBtn').addEventListener('click', () => {
        const codes = document.getElementById('broadcastPassengers').value.split(',').map(c => c.trim()).filter(c => c);
        if (!codes.length) return showToast('Enter at least one referral code', 'warning');
        Promise.all(codes.map(code => EnhancedFirebaseManager.findUserByReferralCode(code))).then(friends => {
            const validFriends = friends.filter(f => f);
            if (!validFriends.length) return showToast('No valid referral codes', 'error');
            if (!AppState.pickup || !AppState.destination) return showToast('Set locations', 'warning');
            const distance = EnhancedPriceCalculator.calculateDistance(AppState.pickup.lat, AppState.pickup.lng, AppState.destination.lat, AppState.destination.lng);
            const fare = EnhancedPriceCalculator.calculateRideFare(distance, AppState.selectedRideType);
            const rideData = {
                pickup: AppState.pickup,
                destination: AppState.destination,
                rideType: AppState.selectedRideType,
                totalFare: fare,
                friends: validFriends,
                distance,
                isBroadcast: true
            };
            EnhancedUIUpdater.showPaymentModal(fare, rideData);
        });
    });

    document.getElementById('saveProfileBtn').addEventListener('click', () => {
        const name = document.getElementById('updateName').value;
        const phone = document.getElementById('updatePhone').value;
        if (!name || !phone) return showToast('Name and phone required', 'warning');
        database.ref(`users/${AppState.currentUser.uid}`).update({ name, phone }).then(() => {
            hideModal('updateProfile');
            showToast('Profile updated', 'success');
        });
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
        if (confirm('Logout?')) {
            EnhancedFirebaseManager.stopRealtimeSync();
            auth.signOut().then(() => window.location.href = 'signup.html');
        }
    });

    document.getElementById('shareReferralBtn').addEventListener('click', () => {
        const code = AppState.userData?.referralCode;
        if (code) {
            navigator.clipboard?.writeText(code).then(() => showToast('Code copied!', 'success'));
        }
    });

    document.querySelectorAll('.history-filters .filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.history-filters .filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            AppState.activeFilter = this.dataset.filter;
            EnhancedFirebaseManager.updateHistoryUI();
        });
    });

    document.querySelectorAll('#transactionsModal .filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('#transactionsModal .filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            AppState.transactionFilter = this.dataset.filter;
            EnhancedWalletManager.displayTransactions(AppState.walletTransactions || []);
        });
    });
}

// ============================================
// INITIALIZE APP
// ============================================
async function initializeApp() {
    showLoading('Initializing...');
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');
    const uid = urlParams.get('uid');

    if (email && uid) {
        AppState.currentUser = { uid, email };
        await EnhancedFirebaseManager.loadUserData(uid);
    } else {
        await new Promise((resolve) => {
            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    AppState.currentUser = user;
                    await EnhancedFirebaseManager.loadUserData(user.uid);
                } else {
                    window.location.href = 'signup.html';
                }
                resolve();
            });
        });
    }

    initializeMap();
    EnhancedLocationManager.init();
    EnhancedWalletManager.init();
    setupEventListeners();
    setupServiceIcons();

    await getCurrentLocation(false);
    hideLoading();
    showToast('Ready!', 'success');
}

window.addEventListener('load', initializeApp);
