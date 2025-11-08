// Firebase configuration
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

// App state
let currentUser = null;
let currentRide = null;
let homeMap, rideMap, activeRideMap;
let rideType = 'standard';
let paymentMethod = 'airtel';
let userRating = 0;
let userLocation = null;
let driverMarker = null;
let userMarker = null;
let destinationMarker = null;
let rideRoute = null;
let rideRequestInterval = null;
let ridePulsingAnimation = null;
let userFullName = "Passenger";
let driverAssignmentListener = null;
let routePolyline = null;
let nearbyPlacesMarkers = [];
let destinationSearchResults = [];
let selectedDestination = null;
let rideHistoryListener = null;
let activeRideListener = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeAuth();
    initializeMaps();
    setupEventListeners();
    checkOnboardingStatus();
    initializeAppSettings();
});

// Check if user needs to complete onboarding
function checkOnboardingStatus() {
    const onboardingCompleted = localStorage.getItem('onboardingCompleted');
    const userAuthenticated = localStorage.getItem('userAuthenticated');
    const profileCompleted = localStorage.getItem('profileCompleted');
    
    if (!onboardingCompleted) {
        showOnboardingScreen();
    } else if (!userAuthenticated) {
        showAuthScreen();
    } else if (!profileCompleted) {
        showProfileSetupScreen();
    } else {
        loadUserData();
        showMainApp();
    }
}

// Show onboarding screens
function showOnboardingScreen() {
    document.getElementById('onboardingScreen').classList.remove('hidden');
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('profileSetupScreen').classList.add('hidden');
    document.querySelector('header').classList.add('hidden');
    document.querySelector('.main-content').classList.add('hidden');
    document.querySelector('.tab-container').classList.add('hidden');
}

function showAuthScreen() {
    document.getElementById('onboardingScreen').classList.add('hidden');
    document.getElementById('authScreen').classList.remove('hidden');
    document.getElementById('profileSetupScreen').classList.add('hidden');
    document.querySelector('header').classList.add('hidden');
    document.querySelector('.main-content').classList.add('hidden');
    document.querySelector('.tab-container').classList.add('hidden');
}

function showProfileSetupScreen() {
    document.getElementById('onboardingScreen').classList.add('hidden');
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('profileSetupScreen').classList.remove('hidden');
    document.querySelector('header').classList.add('hidden');
    document.querySelector('.main-content').classList.add('hidden');
    document.querySelector('.tab-container').classList.add('hidden');
}

function showMainApp() {
    document.getElementById('onboardingScreen').classList.add('hidden');
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('profileSetupScreen').classList.add('hidden');
    document.querySelector('header').classList.remove('hidden');
    document.querySelector('.main-content').classList.remove('hidden');
    document.querySelector('.tab-container').classList.remove('hidden');
    
    // Update user greeting
    updateUserGreeting();
    
    // Load nearby places
    loadNearbyPlaces();
    
    // Load ride history
    loadRideHistory();
    
    // Check for any active rides
    checkActiveRides();
}

// Update user greeting with full name
function updateUserGreeting() {
    const greetingElement = document.getElementById('userGreeting');
    if (userFullName && userFullName !== "Passenger") {
        greetingElement.textContent = `Hi ${userFullName}, Where to?`;
    } else {
        greetingElement.textContent = "Hi, Where to?";
    }
}

// Authentication functions
function initializeAuth() {
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            document.getElementById('userIcon').textContent = user.displayName ? user.displayName.charAt(0).toUpperCase() : 'P';
            loadUserData();
            
            // Start location tracking for authenticated users
            startLocationTracking();
        } else {
            // Check if we need to show auth screen
            const userAuthenticated = localStorage.getItem('userAuthenticated');
            if (!userAuthenticated) {
                showAuthScreen();
            }
        }
    });
}

// Email authentication
function setupEventListeners() {
    // Onboarding
    document.getElementById('getStartedBtn').addEventListener('click', function() {
        localStorage.setItem('onboardingCompleted', 'true');
        showAuthScreen();
    });
    
    // Authentication
    document.getElementById('loginBtn').addEventListener('click', loginUser);
    document.getElementById('signupBtn').addEventListener('click', signupUser);
    document.getElementById('switchToSignup').addEventListener('click', function() {
        document.getElementById('loginBtn').classList.add('hidden');
        document.getElementById('signupBtn').classList.remove('hidden');
    });
    
    // Profile setup
    document.getElementById('completeProfileBtn').addEventListener('click', completeProfile);
    
    // Tab navigation
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
    
    // Ride type selection
    document.querySelectorAll('.ride-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.ride-option').forEach(opt => {
                opt.classList.remove('active');
            });
            this.classList.add('active');
            rideType = this.getAttribute('data-type');
            updateFareEstimate();
        });
    });
    
    // Payment method selection
    document.querySelectorAll('.payment-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.payment-option').forEach(opt => {
                opt.classList.remove('active');
            });
            this.classList.add('active');
            paymentMethod = this.getAttribute('data-method');
        });
    });
    
    // Request ride button
    document.getElementById('requestRideBtn').addEventListener('click', requestRide);
    
    // Schedule ride button
    document.getElementById('scheduleRideBtn').addEventListener('click', scheduleRide);
    
    // Cancel ride button
    document.getElementById('cancelRideBtn').addEventListener('click', cancelRide);
    
    // Contact driver button
    document.getElementById('contactDriverBtn').addEventListener('click', contactDriver);
    
    // Share ride buttons
    document.getElementById('shareRideBtn').addEventListener('click', shareRide);
    document.getElementById('shareRideLinkBtn').addEventListener('click', shareRideLink);
    
    // Add stop button
    document.getElementById('addStopBtn').addEventListener('click', addStop);
    
    // Complete payment button
    document.getElementById('completePaymentBtn').addEventListener('click', completePayment);
    
    // Save profile button
    document.getElementById('saveProfileBtn').addEventListener('click', saveProfile);
    
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Destination input for fare estimation and suggestions
    document.getElementById('destination').addEventListener('input', function() {
        const query = this.value;
        updateFareEstimate();
        if (query.length >= 2) {
            searchPlaces(query);
        } else {
            hideDestinationSuggestions();
        }
    });
    
    // Focus event for destination input
    document.getElementById('destination').addEventListener('focus', function() {
        const query = this.value;
        if (query.length >= 2) {
            searchPlaces(query);
        }
    });
    
    // Click outside to hide suggestions
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.input-group') && !e.target.closest('.suggestion-list')) {
            hideDestinationSuggestions();
        }
    });
    
    // Saved location buttons
    document.querySelectorAll('.saved-location-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const addressType = this.getAttribute('data-address');
            useSavedLocation(addressType);
        });
    });
    
    // Star rating
    document.querySelectorAll('.star').forEach(star => {
        star.addEventListener('click', function() {
            const rating = parseInt(this.getAttribute('data-rating'));
            setRating(rating);
        });
    });
    
    // History filter
    document.getElementById('historyFilter').addEventListener('change', loadRideHistory);
    document.getElementById('historyDate').addEventListener('change', loadRideHistory);
    
    // Dark mode toggle
    document.getElementById('darkModeToggle').addEventListener('change', toggleDarkMode);
    
    // Ride history item click for popup
    document.addEventListener('click', function(e) {
        if (e.target.closest('.history-item')) {
            const historyItem = e.target.closest('.history-item');
            const rideId = historyItem.getAttribute('data-ride-id');
            if (rideId) {
                showRideDetailsPopup(rideId);
            }
        }
    });
    
    // Close popup buttons
    document.getElementById('closeRidePopup').addEventListener('click', closeRideDetailsPopup);
    document.getElementById('closeRidePopupTop').addEventListener('click', closeRideDetailsPopup);
}

// Email authentication functions
function loginUser() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showNotification('Please enter both email and password.');
        return;
    }
    
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            localStorage.setItem('userAuthenticated', 'true');
            checkOnboardingStatus();
            showNotification('Login successful!');
        })
        .catch((error) => {
            console.error('Login error:', error);
            showNotification('Login failed: ' + error.message);
        });
}

function signupUser() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showNotification('Please enter both email and password.');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters long.');
        return;
    }
    
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            localStorage.setItem('userAuthenticated', 'true');
            showProfileSetupScreen();
            showNotification('Account created successfully!');
        })
        .catch((error) => {
            console.error('Signup error:', error);
            showNotification('Signup failed: ' + error.message);
        });
}

// Complete profile setup
function completeProfile() {
    const name = document.getElementById('profileName').value;
    const phone = document.getElementById('profilePhone').value;
    const paymentPreference = document.getElementById('paymentPreference').value;
    const homeAddress = document.getElementById('homeAddress').value;
    const workAddress = document.getElementById('workAddress').value;
    
    if (!name || !phone) {
        showNotification('Please complete all required fields.');
        return;
    }
    
    if (currentUser) {
        const userData = {
            name: name,
            phone: phone,
            email: currentUser.email,
            paymentPreference: paymentPreference,
            homeAddress: homeAddress,
            workAddress: workAddress,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            userType: 'passenger'
        };
        
        database.ref('users/' + currentUser.uid).update(userData)
            .then(() => {
                localStorage.setItem('profileCompleted', 'true');
                userFullName = name;
                showMainApp();
                showNotification('Profile completed successfully.');
                
                // Update user display
                currentUser.updateProfile({
                    displayName: name
                });
            })
            .catch(error => {
                console.error('Error saving profile:', error);
                showNotification('Error saving profile. Please try again.');
            });
    }
}

// Map initialization - Only show user's current location
function initializeMaps() {
    // Home map - only showing user location
    homeMap = L.map('homeMap').setView([-15.4167, 28.2833], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(homeMap);
    
    // Ride request map
    rideMap = L.map('rideMap').setView([-15.4167, 28.2833], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(rideMap);
    
    // Active ride map
    activeRideMap = L.map('activeRideMap').setView([-15.4167, 28.2833], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(activeRideMap);
    
    // Popup ride details map
    popupRideMap = L.map('popupRideMap').setView([-15.4167, 28.2833], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(popupRideMap);
    
    // Get user's current location
    getUserLocation();
}

// Get user location
function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            userLocation = { lat, lng };
            
            // Update all maps with current location
            homeMap.setView([lat, lng], 15);
            rideMap.setView([lat, lng], 15);
            activeRideMap.setView([lat, lng], 15);
            popupRideMap.setView([lat, lng], 15);
            
            // Add marker for current location only
            userMarker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'customer-marker',
                    html: '📍<div class="marker-label">You</div>',
                    iconSize: [30, 40]
                })
            }).addTo(homeMap)
                .bindPopup('Your current location')
                .openPopup();
                
            // Update pickup location field
            reverseGeocode(lat, lng).then(address => {
                document.getElementById('pickupLocation').value = address;
            });
            
            // Load nearby places list (not on map)
            loadNearbyPlaces();
        }, error => {
            console.error('Geolocation error:', error);
            showNotification('Unable to get your location. Please enable location services.');
        });
    }
}

// Start continuous location tracking
function startLocationTracking() {
    if (navigator.geolocation && currentUser) {
        navigator.geolocation.watchPosition(position => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            userLocation = { lat, lng };
            
            // Update user location in Firebase
            database.ref('userLocations/' + currentUser.uid).set({
                latitude: lat,
                longitude: lng,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            
            // Update marker if it exists
            if (userMarker) {
                userMarker.setLatLng([lat, lng]);
            }
            
            // Update destination marker if it exists and we have a destination
            if (destinationMarker) {
                const destination = document.getElementById('destination').value;
                if (destination) {
                    updateFareEstimate();
                }
            }
        }, error => {
            console.error('Location tracking error:', error);
        }, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 30000
        });
    }
}

// Load nearby places within 20km radius (displayed in list, not on map)
function loadNearbyPlaces() {
    if (!userLocation) return;
    
    const nearbyPlacesList = document.getElementById('nearbyPlacesList');
    nearbyPlacesList.innerHTML = '<div class="loading-text">Loading nearby places...</div>';
    
    // Clear existing markers
    clearNearbyPlacesMarkers();
    
    // Using Overpass API to get nearby places
    const radius = 20000; // 20km in meters
    const overpassQuery = `
        [out:json][timeout:25];
        (
          node["amenity"](around:${radius},${userLocation.lat},${userLocation.lng});
          node["shop"](around:${radius},${userLocation.lat},${userLocation.lng});
          node["tourism"](around:${radius},${userLocation.lat},${userLocation.lng});
          node["building"](around:${radius},${userLocation.lat},${userLocation.lng});
          node["historic"](around:${radius},${userLocation.lat},${userLocation.lng});
          node["leisure"](around:${radius},${userLocation.lat},${userLocation.lng});
        );
        out body;
        >;
        out skel qt;
    `;
    
    fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: overpassQuery
    })
    .then(response => response.json())
    .then(data => {
        nearbyPlacesList.innerHTML = '';
        
        if (data.elements && data.elements.length > 0) {
            // Process and display places
            const places = data.elements
                .filter(element => element.tags && element.tags.name)
                .map(place => {
                    // Calculate distance from user
                    const distance = calculateDistance(
                        userLocation.lat, userLocation.lng,
                        place.lat, place.lon
                    );
                    return { ...place, distance };
                })
                .sort((a, b) => a.distance - b.distance) // Sort by distance
                .filter((place, index, array) => {
                    // Filter to get one place approximately every 2km
                    if (index === 0) return true;
                    const prevPlace = array[index - 1];
                    return place.distance - prevPlace.distance >= 2000; // 2km in meters
                })
                .slice(0, 10); // Limit to 10 places (one every 2km for 20km radius)
            
            if (places.length === 0) {
                nearbyPlacesList.innerHTML = '<div class="no-places">No nearby places found within 20km</div>';
                return;
            }
            
            places.forEach(place => {
                const placeElement = createNearbyPlaceElement(place);
                nearbyPlacesList.appendChild(placeElement);
                
                // Add marker to map for each nearby place
                const marker = L.marker([place.lat, place.lon], {
                    icon: L.divIcon({
                        className: 'nearby-place-marker',
                        html: `${getPlaceIcon(place.tags.amenity || place.tags.shop || place.tags.tourism || 'place')}<div class="marker-label">${place.tags.name}</div>`,
                        iconSize: [30, 40]
                    })
                }).addTo(homeMap)
                    .bindPopup(`<strong>${place.tags.name}</strong><br>${formatPlaceType(place.tags.amenity || place.tags.shop || place.tags.tourism || 'place')}<br>${(place.distance / 1000).toFixed(1)} km away`);
                
                nearbyPlacesMarkers.push(marker);
            });
        } else {
            nearbyPlacesList.innerHTML = '<div class="no-places">No nearby places found within 20km</div>';
        }
    })
    .catch(error => {
        console.error('Error fetching nearby places:', error);
        // Fallback to predefined places
        loadFallbackNearbyPlaces();
    });
}

// Clear nearby places markers from map
function clearNearbyPlacesMarkers() {
    nearbyPlacesMarkers.forEach(marker => {
        homeMap.removeLayer(marker);
    });
    nearbyPlacesMarkers = [];
}

// Create nearby place element (for list display only)
function createNearbyPlaceElement(place) {
    const placeElement = document.createElement('div');
    placeElement.className = 'nearby-place-item';
    
    const placeType = place.tags.amenity || place.tags.shop || place.tags.tourism || 'place';
    const icon = getPlaceIcon(placeType);
    
    placeElement.innerHTML = `
        <div class="place-icon">${icon}</div>
        <div class="place-details">
            <div class="place-name">${place.tags.name}</div>
            <div class="place-type">${formatPlaceType(placeType)}</div>
            <div class="place-address">${getPlaceAddress(place)}</div>
            <div class="place-distance">${(place.distance / 1000).toFixed(1)} km away</div>
        </div>
    `;
    
    placeElement.addEventListener('click', function() {
        document.getElementById('destination').value = place.tags.name;
        updateFareEstimate();
        showNotification(`Selected: ${place.tags.name}`);
        
        // Highlight the selected place
        document.querySelectorAll('.nearby-place-item').forEach(item => {
            item.classList.remove('selected');
        });
        this.classList.add('selected');
        
        // Update destination marker on map
        updateDestinationMarker(place.lat, place.lon, place.tags.name);
        
        // Draw route from user location to destination
        drawRoute(userLocation.lat, userLocation.lng, place.lat, place.lon);
    });
    
    return placeElement;
}

// Update destination marker on map
function updateDestinationMarker(lat, lng, name) {
    // Remove existing destination marker
    if (destinationMarker) {
        homeMap.removeLayer(destinationMarker);
    }
    
    // Add new destination marker
    destinationMarker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'destination-marker',
            html: '🏁<div class="marker-label">Destination</div>',
            iconSize: [30, 40]
        })
    }).addTo(homeMap)
        .bindPopup(`<strong>${name}</strong><br>Your destination`)
        .openPopup();
    
    // Fit map to show both user location and destination
    const bounds = L.latLngBounds(
        [userLocation.lat, userLocation.lng],
        [lat, lng]
    );
    homeMap.fitBounds(bounds, { padding: [20, 20] });
}

// Draw route from user location to destination
function drawRoute(startLat, startLng, endLat, endLng) {
    // Remove existing route if any
    if (routePolyline) {
        homeMap.removeLayer(routePolyline);
    }
    
    // Use OSRM API to get route
    fetch(`https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`)
        .then(response => response.json())
        .then(data => {
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const routeCoordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                
                // Draw the route on the map
                routePolyline = L.polyline(routeCoordinates, {
                    color: '#FF6B35',
                    weight: 5,
                    opacity: 0.7,
                    dashArray: '10, 10'
                }).addTo(homeMap);
                
                // Fit map to show the entire route
                homeMap.fitBounds(routePolyline.getBounds(), { padding: [20, 20] });
            }
        })
        .catch(error => {
            console.error('Error fetching route:', error);
            // Fallback: draw a straight line
            routePolyline = L.polyline([
                [startLat, startLng],
                [endLat, endLng]
            ], {
                color: '#FF6B35',
                weight: 5,
                opacity: 0.7,
                dashArray: '10, 10'
            }).addTo(homeMap);
        });
}

// Search places based on user input with 20km radius filter
function searchPlaces(query) {
    if (!userLocation) return;
    
    const suggestionsContainer = document.getElementById('destinationSuggestions');
    suggestionsContainer.innerHTML = '<div class="loading-text">Searching...</div>';
    suggestionsContainer.style.display = 'block';
    
    // Using Overpass API for place search
    const radius = 20000; // 20km in meters
    const overpassQuery = `
        [out:json][timeout:25];
        (
          node["name"~"${query}",i](around:${radius},${userLocation.lat},${userLocation.lng});
          way["name"~"${query}",i](around:${radius},${userLocation.lat},${userLocation.lng});
          relation["name"~"${query}",i](around:${radius},${userLocation.lat},${userLocation.lng});
        );
        out center;
    `;
    
    fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: overpassQuery
    })
    .then(response => response.json())
    .then(data => {
        suggestionsContainer.innerHTML = '';
        destinationSearchResults = [];
        
        if (data.elements && data.elements.length > 0) {
            // Process search results
            const results = data.elements
                .filter(element => element.tags && element.tags.name)
                .map(element => {
                    // Calculate center coordinates for ways and relations
                    let lat, lon;
                    if (element.type === 'node') {
                        lat = element.lat;
                        lon = element.lon;
                    } else {
                        lat = element.center.lat;
                        lon = element.center.lon;
                    }
                    
                    // Calculate distance from user
                    const distance = calculateDistance(
                        userLocation.lat, userLocation.lng,
                        lat, lon
                    );
                    
                    return {
                        ...element,
                        displayLat: lat,
                        displayLon: lon,
                        distance
                    };
                })
                .sort((a, b) => a.distance - b.distance) // Sort by distance
                .slice(0, 10); // Limit to 10 results
            
            if (results.length === 0) {
                suggestionsContainer.innerHTML = '<div class="no-places">No places found matching your search</div>';
                return;
            }
            
            destinationSearchResults = results;
            
            results.forEach(result => {
                const suggestionItem = document.createElement('div');
                suggestionItem.className = 'suggestion-item';
                
                const placeType = result.tags.amenity || result.tags.shop || result.tags.tourism || result.tags.building || 'place';
                
                suggestionItem.innerHTML = `
                    <div class="suggestion-icon">${getPlaceIcon(placeType)}</div>
                    <div class="suggestion-details">
                        <div class="suggestion-name">${result.tags.name}</div>
                        <div class="suggestion-type">${formatPlaceType(placeType)}</div>
                        <div class="suggestion-address">${getPlaceAddress(result)}</div>
                        <div class="suggestion-distance">${(result.distance / 1000).toFixed(1)} km away</div>
                    </div>
                `;
                
                suggestionItem.addEventListener('click', function() {
                    document.getElementById('destination').value = result.tags.name;
                    suggestionsContainer.style.display = 'none';
                    updateFareEstimate();
                    
                    // Update destination marker on map
                    updateDestinationMarker(
                        result.displayLat, 
                        result.displayLon, 
                        result.tags.name
                    );
                    
                    // Draw route from user location to destination
                    drawRoute(userLocation.lat, userLocation.lng, result.displayLat, result.displayLon);
                    
                    selectedDestination = result;
                });
                
                suggestionsContainer.appendChild(suggestionItem);
            });
        } else {
            suggestionsContainer.innerHTML = '<div class="no-places">No places found matching your search</div>';
        }
    })
    .catch(error => {
        console.error('Error searching places:', error);
        suggestionsContainer.innerHTML = '<div class="no-places">Error searching places. Please try again.</div>';
    });
}

// Hide destination suggestions
function hideDestinationSuggestions() {
    const suggestionsContainer = document.getElementById('destinationSuggestions');
    suggestionsContainer.style.display = 'none';
}

// Get icon for place type
function getPlaceIcon(placeType) {
    const icons = {
        'restaurant': '🍽️',
        'cafe': '☕',
        'bar': '🍺',
        'pub': '🍻',
        'fast_food': '🍔',
        'bank': '🏦',
        'atm': '💳',
        'hospital': '🏥',
        'pharmacy': '💊',
        'school': '🏫',
        'university': '🎓',
        'library': '📚',
        'cinema': '🎬',
        'theatre': '🎭',
        'museum': '🏛️',
        'hotel': '🏨',
        'supermarket': '🛒',
        'mall': '🏪',
        'clothes': '👕',
        'fuel': '⛽',
        'parking': '🅿️',
        'bus_station': '🚌',
        'taxi': '🚕',
        'police': '👮',
        'market': '🛍️',
        'post_office': '📮',
        'place_of_worship': '🛐',
        'stadium': '🏟️',
        'park': '🏞️',
        'monument': '🗽',
        'castle': '🏰'
    };
    
    return icons[placeType] || '📍';
}

// Format place type for display
function formatPlaceType(type) {
    return type.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

// Get place address from tags
function getPlaceAddress(place) {
    if (place.tags['addr:street']) {
        return `${place.tags['addr:street']}${place.tags['addr:housenumber'] ? ' ' + place.tags['addr:housenumber'] : ''}`;
    }
    return 'Address not available';
}

// Fallback nearby places if API fails
function loadFallbackNearbyPlaces() {
    const nearbyPlacesList = document.getElementById('nearbyPlacesList');
    nearbyPlacesList.innerHTML = '';
    
    const fallbackPlaces = [
        { name: 'Lusaka City Center', type: 'city_center', lat: -15.4167, lng: 28.2833 },
        { name: 'Manda Hill Mall', type: 'mall', lat: -15.4096, lng: 28.2997 },
        { name: 'East Park Mall', type: 'mall', lat: -15.3928, lng: 28.3214 },
        { name: 'Levy Mall', type: 'mall', lat: -15.4250, lng: 28.2917 },
        { name: 'University of Zambia', type: 'university', lat: -15.3875, lng: 28.3278 },
        { name: 'Lusaka Airport', type: 'airport', lat: -15.3308, lng: 28.4528 },
        { name: 'Kamwala Market', type: 'market', lat: -15.4181, lng: 28.2750 },
        { name: 'Arcades Shopping Mall', type: 'mall', lat: -15.4053, lng: 28.3106 },
        { name: 'Lusaka Central Police', type: 'police', lat: -15.4147, lng: 28.2886 },
        { name: 'Lewanika General Hospital', type: 'hospital', lat: -15.4081, lng: 28.2808 }
    ];
    
    // Calculate distances and sort
    const placesWithDistance = fallbackPlaces.map(place => {
        const distance = calculateDistance(
            userLocation.lat, userLocation.lng,
            place.lat, place.lng
        );
        return { ...place, distance };
    }).sort((a, b) => a.distance - b.distance);
    
    placesWithDistance.forEach(place => {
        const placeElement = document.createElement('div');
        placeElement.className = 'nearby-place-item';
        
        placeElement.innerHTML = `
            <div class="place-icon">${getPlaceIcon(place.type)}</div>
            <div class="place-details">
                <div class="place-name">${place.name}</div>
                <div class="place-type">${formatPlaceType(place.type)}</div>
                <div class="place-address">Lusaka, Zambia</div>
                <div class="place-distance">${(place.distance / 1000).toFixed(1)} km away</div>
            </div>
        `;
        
        placeElement.addEventListener('click', function() {
            document.getElementById('destination').value = place.name;
            updateFareEstimate();
            showNotification(`Selected: ${place.name}`);
            
            document.querySelectorAll('.nearby-place-item').forEach(item => {
                item.classList.remove('selected');
            });
            this.classList.add('selected');
            
            // Update destination marker on map
            updateDestinationMarker(place.lat, place.lng, place.name);
            
            // Draw route from user location to destination
            drawRoute(userLocation.lat, userLocation.lng, place.lat, place.lng);
        });
        
        nearbyPlacesList.appendChild(placeElement);
    });
}

// Reverse geocoding function
function reverseGeocode(lat, lng) {
    return new Promise(resolve => {
        // Using OpenStreetMap Nominatim API
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
            .then(response => response.json())
            .then(data => {
                if (data && data.display_name) {
                    resolve(data.display_name);
                } else {
                    resolve(`Near ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
                }
            })
            .catch(error => {
                console.error('Geocoding error:', error);
                resolve(`Near ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            });
    });
}

// Forward geocoding function with 20km radius filter
function forwardGeocode(query) {
    return new Promise(resolve => {
        if (!userLocation) {
            resolve([]);
            return;
        }
        
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10`)
            .then(response => response.json())
            .then(data => {
                // Filter results within 20km radius
                const filteredResults = data.filter(result => {
                    const distance = calculateDistance(
                        userLocation.lat, userLocation.lng,
                        parseFloat(result.lat), parseFloat(result.lon)
                    );
                    return distance <= 20000; // 20km in meters
                });
                
                resolve(filteredResults);
            })
            .catch(error => {
                console.error('Forward geocoding error:', error);
                resolve([]);
            });
    });
}

// Tab switching
function switchTab(tabId) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Show selected tab content
    document.getElementById(tabId).classList.add('active');
    
    // Update active tab
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add('active');
    
    // Load data for specific tabs
    if (tabId === 'historyScreen') {
        loadRideHistory();
    } else if (tabId === 'homeScreen') {
        // Refresh map when returning to home
        if (homeMap && userLocation) {
            homeMap.setView([userLocation.lat, userLocation.lng], 15);
        }
        loadNearbyPlaces();
    } else if (tabId === 'settingsScreen') {
        loadSettings();
    }
}

// Use saved location
function useSavedLocation(addressType) {
    if (currentUser) {
        database.ref('users/' + currentUser.uid).once('value')
            .then(snapshot => {
                const userData = snapshot.val();
                const address = userData ? userData[addressType + 'Address'] : null;
                
                if (address) {
                    document.getElementById('destination').value = address;
                    updateFareEstimate();
                    showNotification(`${addressType.charAt(0).toUpperCase() + addressType.slice(1)} address set as destination.`);
                    
                    // Try to geocode the saved address to show on map
                    forwardGeocode(address).then(results => {
                        if (results.length > 0) {
                            updateDestinationMarker(
                                parseFloat(results[0].lat),
                                parseFloat(results[0].lon),
                                address
                            );
                            
                            // Draw route from user location to destination
                            drawRoute(userLocation.lat, userLocation.lng, parseFloat(results[0].lat), parseFloat(results[0].lon));
                        }
                    });
                } else {
                    showNotification(`No ${addressType} address saved. Please add it in settings.`);
                }
            });
    }
}

// Fare estimation based on distance (K11 minimum, then K1 per 90 meters)
function updateFareEstimate() {
    const destination = document.getElementById('destination').value;
    
    if (destination.length > 3 && userLocation) {
        // Calculate distance using Haversine formula (simplified)
        forwardGeocode(destination).then(results => {
            if (results.length > 0) {
                const destLat = parseFloat(results[0].lat);
                const destLng = parseFloat(results[0].lon);
                
                const distance = calculateDistance(
                    userLocation.lat, userLocation.lng,
                    destLat, destLng
                );
                
                // K11 minimum fare for distances below 90 meters, then K1 per 90 meters
                let baseFare;
                if (distance < 90) {
                    baseFare = 11;
                } else {
                    baseFare = Math.max(11, Math.ceil(distance / 90));
                }
                
                // Apply ride type multiplier
                switch(rideType) {
                    case 'standard':
                        baseFare = baseFare;
                        break;
                    case 'premium':
                        baseFare = baseFare * 1.5;
                        break;
                    case 'bike':
                        baseFare = baseFare * 0.7;
                        break;
                }
                
                document.getElementById('estimatedFare').textContent = `K${baseFare.toFixed(2)}`;
                
                // Calculate ETA (assuming average speed of 30 km/h)
                const etaMinutes = Math.ceil((distance / 1000) / 30 * 60);
                document.getElementById('etaDisplay').textContent = `ETA: ${etaMinutes} min`;
            }
        });
    } else {
        document.getElementById('estimatedFare').textContent = 'K0.00';
        document.getElementById('etaDisplay').textContent = 'ETA: -- min';
    }
}

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
}

// Enhanced Ride request with proper error handling and Firebase integration
function requestRide() {
    const pickup = document.getElementById('pickupLocation').value;
    const destination = document.getElementById('destination').value;
    
    if (!pickup || !destination) {
        showNotification('Please enter both pickup and destination locations.');
        return;
    }
    
    if (!userLocation) {
        showNotification('Unable to get your location. Please enable location services.');
        return;
    }
    
    if (!currentUser) {
        showNotification('Please log in to request a ride.');
        return;
    }
    
    // Show loading state
    document.getElementById('requestRideBtn').disabled = true;
    document.getElementById('requestRideBtn').textContent = 'Requesting...';
    
    // Calculate fare based on distance
    forwardGeocode(destination).then(results => {
        if (results.length === 0) {
            showNotification('Invalid destination address. Please select a valid destination.');
            document.getElementById('requestRideBtn').disabled = false;
            document.getElementById('requestRideBtn').textContent = 'Request Ride';
            return;
        }
        
        const destLat = parseFloat(results[0].lat);
        const destLng = parseFloat(results[0].lon);
        
        const distance = calculateDistance(
            userLocation.lat, userLocation.lng,
            destLat, destLng
        );
        
        // K11 minimum fare for distances below 90 meters, then K1 per 90 meters
        let fare;
        if (distance < 90) {
            fare = 11;
        } else {
            fare = Math.max(11, Math.ceil(distance / 90));
        }
        
        // Apply ride type multiplier
        switch(rideType) {
            case 'standard':
                fare = fare;
                break;
            case 'premium':
                fare = fare * 1.5;
                break;
            case 'bike':
                fare = fare * 0.7;
                break;
        }
        
        // Create ride request in Firebase with all details
        const rideId = database.ref().child('rides').push().key;
        const rideData = {
            id: rideId,
            passengerId: currentUser.uid,
            passengerName: userFullName || 'Passenger',
            passengerPhone: getUserPhone(),
            pickupLocation: pickup,
            destination: destination,
            pickupLat: userLocation.lat,
            pickupLng: userLocation.lng,
            destLat: destLat,
            destLng: destLng,
            rideType: rideType,
            fare: fare,
            distance: (distance / 1000).toFixed(2) + ' km',
            status: 'requested',
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        };
        
        database.ref('rides/' + rideId).set(rideData)
            .then(() => {
                currentRide = rideData;
                
                // Update UI
                document.getElementById('pickupAddress').textContent = pickup;
                document.getElementById('destinationAddress').textContent = destination;
                document.getElementById('rideFare').textContent = `K${fare.toFixed(2)}`;
                
                // Update active ride screen as well
                document.getElementById('activePickupAddress').textContent = pickup;
                document.getElementById('activeDestinationAddress').textContent = destination;
                document.getElementById('currentFare').textContent = `K${fare.toFixed(2)}`;
                
                // Switch to ride request screen
                switchTab('rideRequestScreen');
                
                // Setup ride map
                setupRideMap(userLocation.lat, userLocation.lng, destLat, destLng);
                
                // Start pulsing animation
                startPulsingAnimation();
                
                // Listen for driver assignment
                listenForDriverAssignment(rideId);
                
                // Show notification with ride request submitted
                showNotification('Ride request submitted! You will be notified once a driver is assigned.');
                
                // Reset button state
                document.getElementById('requestRideBtn').disabled = false;
                document.getElementById('requestRideBtn').textContent = 'Request Ride';
            })
            .catch(error => {
                console.error('Error requesting ride:', error);
                showNotification('Error requesting ride. Please check your connection and try again.');
                
                // Reset button state
                document.getElementById('requestRideBtn').disabled = false;
                document.getElementById('requestRideBtn').textContent = 'Request Ride';
            });
    }).catch(error => {
        console.error('Error geocoding destination:', error);
        showNotification('Error calculating route. Please try again.');
        
        // Reset button state
        document.getElementById('requestRideBtn').disabled = false;
        document.getElementById('requestRideBtn').textContent = 'Request Ride';
    });
}

// Get user phone number
function getUserPhone() {
    if (currentUser) {
        return document.getElementById('userPhone').value || 'Not provided';
    }
    return 'Not provided';
}

// Start pulsing animation for ride request
function startPulsingAnimation() {
    const loadingSpinner = document.querySelector('.loading-spinner');
    const spinner = document.querySelector('.spinner');
    const pulsingText = document.querySelector('.pulsing-text');
    
    // Show loading elements
    loadingSpinner.classList.remove('hidden');
    document.getElementById('assignedDriver').classList.add('hidden');
    
    // Add pulsing classes
    spinner.classList.add('pulsing');
    pulsingText.classList.add('pulsing');
    
    // Create pulsing effect
    ridePulsingAnimation = setInterval(() => {
        spinner.style.transform = spinner.style.transform === 'scale(1.2)' ? 'scale(1)' : 'scale(1.2)';
    }, 500);
}

// Stop pulsing animation
function stopPulsingAnimation() {
    if (ridePulsingAnimation) {
        clearInterval(ridePulsingAnimation);
        ridePulsingAnimation = null;
    }
    
    const spinner = document.querySelector('.spinner');
    const pulsingText = document.querySelector('.pulsing-text');
    
    if (spinner) {
        spinner.classList.remove('pulsing');
        spinner.style.transform = 'scale(1)';
    }
    
    if (pulsingText) {
        pulsingText.classList.remove('pulsing');
    }
}

// Enhanced driver assignment listener
function listenForDriverAssignment(rideId) {
    // Remove any existing listener
    if (driverAssignmentListener) {
        driverAssignmentListener();
    }
    
    // Listen for changes to the ride
    driverAssignmentListener = database.ref('rides/' + rideId).on('value', snapshot => {
        const ride = snapshot.val();
        if (!ride) {
            showNotification('Ride not found. Please try again.');
            return;
        }
        
        console.log('Ride status update:', ride.status, ride.driverId);
        
        if (ride.driverId && ride.status === 'accepted') {
            // Driver assigned and ride accepted
            handleDriverAssignment(ride);
        } else if (ride.status === 'completed') {
            // Ride completed
            showRideCompletion(ride);
        } else if (ride.status === 'cancelled') {
            // Ride cancelled
            handleRideCancellation(ride);
        } else if (ride.status === 'arrived') {
            // Driver arrived
            showNotification('Your driver has arrived at the pickup location.');
        } else if (ride.status === 'picked_up') {
            // Passenger picked up
            showNotification('You have been picked up. Enjoy your ride!');
        } else if (ride.status === 'started') {
            // Trip started
            showNotification('Your trip has started.');
        }
    }, error => {
        console.error('Error listening for driver assignment:', error);
        showNotification('Connection error. Please check your internet connection.');
    });
}

// Handle driver assignment
function handleDriverAssignment(ride) {
    // Stop pulsing animation
    stopPulsingAnimation();
    
    // Hide loading spinner and show driver info
    document.querySelector('.loading-spinner').classList.add('hidden');
    document.getElementById('assignedDriver').classList.remove('hidden');
    
    // Get driver details
    database.ref('users/' + ride.driverId).once('value')
        .then(driverSnapshot => {
            const driver = driverSnapshot.val();
            if (driver) {
                // Update driver information
                document.getElementById('driverName').textContent = driver.name || 'Driver';
                document.getElementById('driverPhone').textContent = `Phone: ${driver.phone || 'N/A'}`;
                document.getElementById('driverVehicle').textContent = `Vehicle: ${driver.vehicleType || 'N/A'} (${driver.licensePlate || 'N/A'})`;
                document.getElementById('driverRating').textContent = `Rating: ${driver.rating || '4.5'} ★`;
                
                // Update active ride screen as well
                document.getElementById('activeDriverName').textContent = driver.name || 'Driver';
                document.getElementById('activeDriverPhone').textContent = `Phone: ${driver.phone || 'N/A'}`;
                document.getElementById('activeDriverVehicle').textContent = `Vehicle: ${driver.vehicleType || 'N/A'} (${driver.licensePlate || 'N/A'})`;
                document.getElementById('activeDriverRating').textContent = `Rating: ${driver.rating || '4.5'} ★`;
                
                showNotification(`Driver ${driver.name} has accepted your ride!`);
                
                // Start tracking driver location
                trackDriverLocation(ride.driverId, ride.id);
                
                // Update map with driver and customer locations
                updateRideMapWithDriver(ride);
                
                // Switch to during ride screen after a short delay
                setTimeout(() => {
                    switchTab('duringRideScreen');
                    setupActiveRideMap(ride);
                }, 2000);
            }
        })
        .catch(error => {
            console.error('Error fetching driver details:', error);
            showNotification('Driver assigned but could not load details.');
        });
}

// Handle ride cancellation
function handleRideCancellation(ride) {
    stopPulsingAnimation();
    showNotification('Ride has been cancelled.');
    switchTab('homeScreen');
    currentRide = null;
    
    // Clean up
    if (driverMarker) {
        rideMap.removeLayer(driverMarker);
        driverMarker = null;
    }
    
    // Remove listener
    if (driverAssignmentListener) {
        driverAssignmentListener();
        driverAssignmentListener = null;
    }
}

// Schedule ride for later
function scheduleRide() {
    showNotification('Scheduled rides feature coming soon!');
}

// Setup ride map with route
function setupRideMap(pickupLat, pickupLng, destLat, destLng) {
    // Clear existing map
    rideMap.eachLayer(layer => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
            rideMap.removeLayer(layer);
        }
    });
    
    // Add markers
    L.marker([pickupLat, pickupLng], {
        icon: L.divIcon({
            className: 'customer-marker',
            html: '📍<div class="marker-label">Pickup</div>',
            iconSize: [30, 40]
        })
    }).addTo(rideMap).bindPopup('Pickup Location');
    
    L.marker([destLat, destLng], {
        icon: L.divIcon({
            className: 'destination-marker',
            html: '🏁<div class="marker-label">Destination</div>',
            iconSize: [30, 40]
        })
    }).addTo(rideMap).bindPopup('Destination');
    
    // Draw route on ride map
    drawRouteOnRideMap(pickupLat, pickupLng, destLat, destLng);
    
    // Fit map to show both locations
    const bounds = L.latLngBounds(
        [pickupLat, pickupLng],
        [destLat, destLng]
    );
    rideMap.fitBounds(bounds, { padding: [20, 20] });
}

// Draw route on ride map
function drawRouteOnRideMap(startLat, startLng, endLat, endLng) {
    // Use OSRM API to get route
    fetch(`https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`)
        .then(response => response.json())
        .then(data => {
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const routeCoordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                
                // Draw the route on the map
                L.polyline(routeCoordinates, {
                    color: '#FF6B35',
                    weight: 5,
                    opacity: 0.7
                }).addTo(rideMap);
            }
        })
        .catch(error => {
            console.error('Error fetching route:', error);
            // Fallback: draw a straight line
            L.polyline([
                [startLat, startLng],
                [endLat, endLng]
            ], {
                color: '#FF6B35',
                weight: 5,
                opacity: 0.7
            }).addTo(rideMap);
        });
}

// Update ride map with driver and customer locations
function updateRideMapWithDriver(ride) {
    // Clear existing map
    rideMap.eachLayer(layer => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
            rideMap.removeLayer(layer);
        }
    });
    
    // Add customer marker
    L.marker([ride.pickupLat, ride.pickupLng], {
        icon: L.divIcon({
            className: 'customer-marker',
            html: '📍<div class="marker-label">You</div>',
            iconSize: [30, 40]
        })
    }).addTo(rideMap).bindPopup('Your Location');
    
    // Add destination marker
    L.marker([ride.destLat, ride.destLng], {
        icon: L.divIcon({
            className: 'destination-marker',
            html: '🏁<div class="marker-label">Destination</div>',
            iconSize: [30, 40]
        })
    }).addTo(rideMap).bindPopup('Destination');
    
    // Draw route
    drawRouteOnRideMap(ride.pickupLat, ride.pickupLng, ride.destLat, ride.destLng);
    
    // Get driver location and add marker
    database.ref('driverLocations/' + ride.driverId).once('value')
        .then(snapshot => {
            const driverLocation = snapshot.val();
            if (driverLocation) {
                driverMarker = L.marker([driverLocation.latitude, driverLocation.longitude], {
                    icon: L.divIcon({
                        className: 'driver-marker',
                        html: '🚗<div class="marker-label">Driver</div>',
                        iconSize: [40, 40]
                    })
                }).addTo(rideMap).bindPopup('Your Driver');
                
                // Fit map to show all points
                const bounds = L.latLngBounds(
                    [ride.pickupLat, ride.pickupLng],
                    [ride.destLat, ride.destLng],
                    [driverLocation.latitude, driverLocation.longitude]
                );
                rideMap.fitBounds(bounds, { padding: [30, 30] });
            }
        });
}

// Track driver location
function trackDriverLocation(driverId, rideId) {
    database.ref('driverLocations/' + driverId).on('value', snapshot => {
        const location = snapshot.val();
        if (location && rideMap) {
            // Update driver marker on map
            if (!driverMarker) {
                driverMarker = L.marker([location.latitude, location.longitude], {
                    icon: L.divIcon({
                        className: 'driver-marker',
                        html: '🚗<div class="marker-label">Driver</div>',
                        iconSize: [40, 40]
                    })
                }).addTo(rideMap).bindPopup('Your Driver');
            } else {
                driverMarker.setLatLng([location.latitude, location.longitude]);
            }
        }
    });
}

// Setup active ride map
function setupActiveRideMap(ride) {
    // Clear existing map
    activeRideMap.eachLayer(layer => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
            activeRideMap.removeLayer(layer);
        }
    });
    
    // Add customer marker
    L.marker([ride.pickupLat, ride.pickupLng], {
        icon: L.divIcon({
            className: 'customer-marker',
            html: '📍<div class="marker-label">You</div>',
            iconSize: [30, 40]
        })
    }).addTo(activeRideMap).bindPopup('Pickup Location');
    
    // Add destination marker
    L.marker([ride.destLat, ride.destLng], {
        icon: L.divIcon({
            className: 'destination-marker',
            html: '🏁<div class="marker-label">Destination</div>',
            iconSize: [30, 40]
        })
    }).addTo(activeRideMap).bindPopup('Destination');
    
    // Draw route on active ride map
    drawRouteOnActiveRideMap(ride.pickupLat, ride.pickupLng, ride.destLat, ride.destLng);
    
    // Fit map to show both locations
    const bounds = L.latLngBounds(
        [ride.pickupLat, ride.pickupLng],
        [ride.destLat, ride.destLng]
    );
    activeRideMap.fitBounds(bounds, { padding: [20, 20] });
    
    // Start tracking both user and driver locations
    trackActiveRideLocations(ride);
}

// Draw route on active ride map
function drawRouteOnActiveRideMap(startLat, startLng, endLat, endLng) {
    // Use OSRM API to get route
    fetch(`https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`)
        .then(response => response.json())
        .then(data => {
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const routeCoordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                
                // Draw the route on the map
                L.polyline(routeCoordinates, {
                    color: '#FF6B35',
                    weight: 5,
                    opacity: 0.7
                }).addTo(activeRideMap);
            }
        })
        .catch(error => {
            console.error('Error fetching route:', error);
            // Fallback: draw a straight line
            L.polyline([
                [startLat, startLng],
                [endLat, endLng]
            ], {
                color: '#FF6B35',
                weight: 5,
                opacity: 0.7
            }).addTo(activeRideMap);
        });
}

// Track both user and driver locations during active ride
function trackActiveRideLocations(ride) {
    // Track driver location
    if (ride.driverId) {
        database.ref('driverLocations/' + ride.driverId).on('value', snapshot => {
            const location = snapshot.val();
            if (location && activeRideMap) {
                // Update driver marker
                if (!driverMarker) {
                    driverMarker = L.marker([location.latitude, location.longitude], {
                        icon: L.divIcon({
                            className: 'driver-marker',
                            html: '🚗<div class="marker-label">Driver</div>',
                            iconSize: [40, 40]
                        })
                    }).addTo(activeRideMap).bindPopup('Your Driver');
                } else {
                    driverMarker.setLatLng([location.latitude, location.longitude]);
                }
                
                // Update user marker
                if (userLocation && !userMarker) {
                    userMarker = L.marker([userLocation.lat, userLocation.lng], {
                        icon: L.divIcon({
                            className: 'customer-marker',
                            html: '📍<div class="marker-label">You</div>',
                            iconSize: [30, 40]
                        })
                    }).addTo(activeRideMap).bindPopup('Your Location');
                } else if (userLocation && userMarker) {
                    userMarker.setLatLng([userLocation.lat, userLocation.lng]);
                }
                
                // Fit map to show all points if available
                if (userLocation) {
                    const bounds = L.latLngBounds(
                        [userLocation.lat, userLocation.lng],
                        [location.latitude, location.longitude],
                        [ride.destLat, ride.destLng]
                    );
                    activeRideMap.fitBounds(bounds, { padding: [30, 30] });
                }
            }
        });
    }
}

// Cancel ride
function cancelRide() {
    if (currentRide) {
        if (confirm('Are you sure you want to cancel this ride?')) {
            stopPulsingAnimation();
            
            // Remove listener
            if (driverAssignmentListener) {
                driverAssignmentListener();
                driverAssignmentListener = null;
            }
            
            database.ref('rides/' + currentRide.id).update({
                status: 'cancelled',
                cancelledAt: firebase.database.ServerValue.TIMESTAMP,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            })
            .then(() => {
                showNotification('Ride cancelled successfully.');
                switchTab('homeScreen');
                currentRide = null;
                
                // Clean up
                if (driverMarker) {
                    rideMap.removeLayer(driverMarker);
                    driverMarker = null;
                }
            })
            .catch(error => {
                console.error('Error cancelling ride:', error);
                showNotification('Error cancelling ride. Please try again.');
            });
        }
    }
}

// Contact driver
function contactDriver() {
    if (currentRide && currentRide.driverId) {
        database.ref('users/' + currentRide.driverId).once('value')
            .then(snapshot => {
                const driver = snapshot.val();
                if (driver && driver.phone) {
                    // In a real app, this would initiate a call
                    showNotification(`Calling driver: ${driver.phone}`);
                    // Simulate calling - in a real app, you would use tel: protocol
                    window.open(`tel:${driver.phone}`, '_self');
                } else {
                    showNotification('Driver phone number not available.');
                }
            });
    }
}

// Share ride
function shareRide() {
    if (currentRide) {
        const shareData = {
            title: 'My Jubel Ride',
            text: `I'm taking a Jubel ride from ${currentRide.pickupLocation} to ${currentRide.destination}`,
            url: window.location.href
        };
        
        if (navigator.share) {
            navigator.share(shareData)
                .then(() => showNotification('Ride shared successfully!'))
                .catch(error => console.error('Error sharing:', error));
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(shareData.text)
                .then(() => showNotification('Ride details copied to clipboard!'));
        }
    }
}

// Share ride link
function shareRideLink() {
    if (currentRide) {
        const rideLink = `${window.location.origin}?ride=${currentRide.id}`;
        navigator.clipboard.writeText(rideLink)
            .then(() => showNotification('Ride link copied to clipboard!'));
    }
}

// Add stop during ride
function addStop() {
    const stopAddress = prompt('Enter stop address:');
    if (stopAddress) {
        showNotification(`Stop added: ${stopAddress}`);
        // In a real app, this would update the ride route
    }
}

// Ride completion
function showRideCompletion(ride) {
    // Update final fare
    document.getElementById('finalFare').textContent = `K${ride.fare.toFixed(2)}`;
    
    // Switch to completion screen
    switchTab('rideCompletionScreen');
    showNotification('Ride completed. Please complete payment and rating.');
    
    // Clean up
    if (driverMarker) {
        activeRideMap.removeLayer(driverMarker);
        driverMarker = null;
    }
    if (userMarker) {
        activeRideMap.removeLayer(userMarker);
        userMarker = null;
    }
    
    // Remove listener
    if (driverAssignmentListener) {
        driverAssignmentListener();
        driverAssignmentListener = null;
    }
}

// Set rating stars
function setRating(rating) {
    userRating = rating;
    document.querySelectorAll('.star').forEach(star => {
        const starRating = parseInt(star.getAttribute('data-rating'));
        if (starRating <= rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

// Complete payment
function completePayment() {
    const tipAmount = parseFloat(document.getElementById('tipAmount').value) || 0;
    const review = document.getElementById('driverReview').value;
    
    if (currentRide) {
        const totalAmount = currentRide.fare + tipAmount;
        
        // Update ride with payment and rating info
        database.ref('rides/' + currentRide.id).update({
            status: 'paid',
            tip: tipAmount,
            totalAmount: totalAmount,
            rating: userRating,
            review: review,
            paymentMethod: paymentMethod,
            paymentTimestamp: firebase.database.ServerValue.TIMESTAMP,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        })
        .then(() => {
            showNotification(`Payment of K${totalAmount.toFixed(2)} completed. Thank you for using Jubel!`);
            switchTab('homeScreen');
            currentRide = null;
            
            // Reset form
            document.getElementById('destination').value = '';
            document.getElementById('estimatedFare').textContent = 'K0.00';
            document.getElementById('tipAmount').value = '';
            document.getElementById('driverReview').value = '';
            setRating(0);
            
            // Clear route from map
            if (routePolyline) {
                homeMap.removeLayer(routePolyline);
                routePolyline = null;
            }
            
            // Clear destination marker
            if (destinationMarker) {
                homeMap.removeLayer(destinationMarker);
                destinationMarker = null;
            }
        })
        .catch(error => {
            console.error('Error completing payment:', error);
            showNotification('Error completing payment. Please try again.');
        });
    }
}

// Load user data
function loadUserData() {
    if (currentUser) {
        database.ref('users/' + currentUser.uid).once('value')
            .then(snapshot => {
                const userData = snapshot.val();
                if (userData) {
                    userFullName = userData.name || "Passenger";
                    document.getElementById('userName').value = userFullName;
                    document.getElementById('userPhone').value = userData.phone || '';
                    document.getElementById('userEmail').value = userData.email || '';
                    document.getElementById('savedHome').value = userData.homeAddress || '';
                    document.getElementById('savedWork').value = userData.workAddress || '';
                    
                    // Update user icon
                    document.getElementById('userIcon').textContent = userFullName ? 
                        userFullName.charAt(0).toUpperCase() : 'P';
                    
                    // Update greeting
                    updateUserGreeting();
                }
            });
    }
}

// Save profile
function saveProfile() {
    const name = document.getElementById('userName').value;
    const phone = document.getElementById('userPhone').value;
    const email = document.getElementById('userEmail').value;
    const homeAddress = document.getElementById('savedHome').value;
    const workAddress = document.getElementById('savedWork').value;
    
    if (currentUser) {
        database.ref('users/' + currentUser.uid).update({
            name: name,
            phone: phone,
            email: email,
            homeAddress: homeAddress,
            workAddress: workAddress,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        })
        .then(() => {
            userFullName = name;
            showNotification('Profile saved successfully.');
            
            // Update user display
            currentUser.updateProfile({
                displayName: name
            });
            
            document.getElementById('userIcon').textContent = name ? name.charAt(0).toUpperCase() : 'P';
            
            // Update greeting
            updateUserGreeting();
        })
        .catch(error => {
            console.error('Error saving profile:', error);
            showNotification('Error saving profile. Please try again.');
        });
    }
}

// Load ride history with all statuses including pending orders
function loadRideHistory() {
    if (currentUser) {
        const filter = document.getElementById('historyFilter').value;
        const dateFilter = document.getElementById('historyDate').value;
        
        // Remove existing listener
        if (rideHistoryListener) {
            rideHistoryListener();
        }
        
        // Set up real-time listener for ride history
        rideHistoryListener = database.ref('rides').orderByChild('passengerId').equalTo(currentUser.uid).on('value', snapshot => {
            const historyList = document.getElementById('historyList');
            historyList.innerHTML = '';
            
            const rides = snapshot.val();
            if (rides) {
                let ridesArray = Object.keys(rides).map(rideId => ({
                    id: rideId,
                    ...rides[rideId]
                }));
                
                // Apply filters
                if (filter !== 'all') {
                    ridesArray = ridesArray.filter(ride => ride.status === filter);
                }
                
                if (dateFilter) {
                    const filterDate = new Date(dateFilter);
                    ridesArray = ridesArray.filter(ride => {
                        const rideDate = new Date(ride.timestamp);
                        return rideDate.toDateString() === filterDate.toDateString();
                    });
                }
                
                // Sort by timestamp (newest first)
                ridesArray.sort((a, b) => b.timestamp - a.timestamp);
                
                if (ridesArray.length === 0) {
                    historyList.innerHTML = '<p style="text-align: center; padding: 20px; color: var(--medium-gray);">No rides found matching your criteria.</p>';
                    return;
                }
                
                ridesArray.forEach(ride => {
                    const historyItem = document.createElement('div');
                    historyItem.className = 'history-item';
                    historyItem.setAttribute('data-ride-id', ride.id);
                    
                    const date = new Date(ride.timestamp);
                    const formattedDate = date.toLocaleDateString();
                    const formattedTime = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    
                    // Determine status badge class
                    let statusClass = 'status-requested';
                    let statusText = getStatusText(ride.status);
                    
                    if (ride.status === 'accepted') {
                        statusClass = 'status-accepted';
                    } else if (ride.status === 'completed' || ride.status === 'paid') {
                        statusClass = 'status-completed';
                    } else if (ride.status === 'cancelled') {
                        statusClass = 'status-cancelled';
                    } else if (ride.status === 'requested') {
                        statusClass = 'status-pending';
                        statusText = 'Pending';
                    }
                    
                    historyItem.innerHTML = `
                        <div class="history-locations">
                            <div>
                                <strong>From:</strong> ${ride.pickupLocation}
                            </div>
                            <div>
                                <strong>To:</strong> ${ride.destination}
                            </div>
                        </div>
                        <div class="history-info">
                            <div>K${ride.fare ? ride.fare.toFixed(2) : '0.00'}</div>
                            <div>${formattedDate} ${formattedTime}</div>
                            <div class="status-badge ${statusClass}">
                                ${statusText}
                            </div>
                        </div>
                    `;
                    
                    historyList.appendChild(historyItem);
                });
            } else {
                historyList.innerHTML = '<p style="text-align: center; padding: 20px; color: var(--medium-gray);">No ride history found.</p>';
            }
        }, error => {
            console.error('Error loading ride history:', error);
            historyList.innerHTML = '<p style="text-align: center; padding: 20px; color: var(--danger-red);">Error loading ride history.</p>';
        });
    }
}

// Get display text for ride status
function getStatusText(status) {
    const statusMap = {
        'requested': 'Awaiting Driver',
        'accepted': 'In Progress',
        'completed': 'Completed',
        'paid': 'Completed',
        'cancelled': 'Cancelled',
        'arrived': 'Driver Arrived',
        'picked_up': 'Picked Up',
        'started': 'Trip Started'
    };
    
    return statusMap[status] || status;
}

// Show ride details popup
function showRideDetailsPopup(rideId) {
    database.ref('rides/' + rideId).once('value')
        .then(snapshot => {
            const ride = snapshot.val();
            if (ride) {
                // Update popup content
                document.getElementById('popupRidePickup').textContent = ride.pickupLocation;
                document.getElementById('popupRideDestination').textContent = ride.destination;
                document.getElementById('popupRideFare').textContent = `K${ride.fare ? ride.fare.toFixed(2) : '0.00'}`;
                document.getElementById('popupRideDistance').textContent = ride.distance || 'Calculating...';
                document.getElementById('popupRideStatus').textContent = getStatusText(ride.status);
                document.getElementById('popupRideType').textContent = ride.rideType ? ride.rideType.charAt(0).toUpperCase() + ride.rideType.slice(1) : 'Standard';
                
                // Format date
                const date = new Date(ride.timestamp);
                document.getElementById('popupRideDate').textContent = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                
                // Update map in popup
                updatePopupRideMap(ride);
                
                // Show driver details if available
                if (ride.driverId) {
                    database.ref('users/' + ride.driverId).once('value')
                        .then(driverSnapshot => {
                            const driver = driverSnapshot.val();
                            if (driver) {
                                document.getElementById('popupDriverName').textContent = driver.name || 'Driver';
                                document.getElementById('popupDriverPhone').textContent = driver.phone || 'N/A';
                                document.getElementById('popupDriverVehicle').textContent = `${driver.vehicleType || 'Car'} (${driver.licensePlate || 'N/A'})`;
                                document.getElementById('popupDriverRating').textContent = driver.rating || '4.5';
                                
                                // Show driver progress based on ride status
                                updateDriverProgress(ride.status);
                                
                                document.getElementById('popupDriverDetails').classList.remove('hidden');
                            }
                        });
                } else {
                    document.getElementById('popupDriverDetails').classList.add('hidden');
                }
                
                // Show popup
                document.getElementById('rideDetailsPopup').classList.remove('hidden');
            }
        })
        .catch(error => {
            console.error('Error loading ride details:', error);
            showNotification('Error loading ride details.');
        });
}

// Update driver progress in popup
function updateDriverProgress(status) {
    const progressElement = document.getElementById('popupDriverProgress');
    
    switch(status) {
        case 'requested':
            progressElement.textContent = 'Waiting for driver to accept';
            break;
        case 'accepted':
            progressElement.textContent = 'Driver on the way to pickup';
            break;
        case 'arrived':
            progressElement.textContent = 'Driver arrived at pickup location';
            break;
        case 'picked_up':
            progressElement.textContent = 'Passenger picked up';
            break;
        case 'started':
            progressElement.textContent = 'Trip in progress';
            break;
        case 'completed':
            progressElement.textContent = 'Trip completed';
            break;
        case 'paid':
            progressElement.textContent = 'Payment completed';
            break;
        default:
            progressElement.textContent = 'Status: ' + status;
    }
}

// Update popup ride map
function updatePopupRideMap(ride) {
    // Clear existing map
    popupRideMap.eachLayer(layer => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
            popupRideMap.removeLayer(layer);
        }
    });
    
    // Add pickup marker
    L.marker([ride.pickupLat, ride.pickupLng], {
        icon: L.divIcon({
            className: 'customer-marker',
            html: '📍<div class="marker-label">Pickup</div>',
            iconSize: [30, 40]
        })
    }).addTo(popupRideMap).bindPopup('Pickup Location');
    
    // Add destination marker
    L.marker([ride.destLat, ride.destLng], {
        icon: L.divIcon({
            className: 'destination-marker',
            html: '🏁<div class="marker-label">Destination</div>',
            iconSize: [30, 40]
        })
    }).addTo(popupRideMap).bindPopup('Destination');
    
    // Draw route
    drawRouteOnPopupMap(ride.pickupLat, ride.pickupLng, ride.destLat, ride.destLng);
    
    // Fit map to show both locations
    const bounds = L.latLngBounds(
        [ride.pickupLat, ride.pickupLng],
        [ride.destLat, ride.destLng]
    );
    popupRideMap.fitBounds(bounds, { padding: [20, 20] });
}

// Draw route on popup map
function drawRouteOnPopupMap(startLat, startLng, endLat, endLng) {
    // Use OSRM API to get route
    fetch(`https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`)
        .then(response => response.json())
        .then(data => {
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const routeCoordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                
                // Draw the route on the map
                L.polyline(routeCoordinates, {
                    color: '#FF6B35',
                    weight: 5,
                    opacity: 0.7
                }).addTo(popupRideMap);
            }
        })
        .catch(error => {
            console.error('Error fetching route:', error);
            // Fallback: draw a straight line
            L.polyline([
                [startLat, startLng],
                [endLat, endLng]
            ], {
                color: '#FF6B35',
                weight: 5,
                opacity: 0.7
            }).addTo(popupRideMap);
        });
}

// Close ride details popup
function closeRideDetailsPopup() {
    document.getElementById('rideDetailsPopup').classList.add('hidden');
}

// Check for active rides
function checkActiveRides() {
    if (currentUser) {
        database.ref('rides').orderByChild('passengerId').equalTo(currentUser.uid).once('value')
            .then(snapshot => {
                const rides = snapshot.val();
                if (rides) {
                    // Find any active rides
                    const activeRides = Object.keys(rides).filter(rideId => {
                        const ride = rides[rideId];
                        return ride.status === 'accepted' || ride.status === 'arrived' || 
                               ride.status === 'picked_up' || ride.status === 'started';
                    });
                    
                    if (activeRides.length > 0) {
                        // Switch to active ride screen
                        const activeRideId = activeRides[0];
                        const activeRide = rides[activeRideId];
                        currentRide = { id: activeRideId, ...activeRide };
                        
                        // Set up active ride
                        setupActiveRide(activeRide);
                    }
                }
            });
    }
}

// Set up active ride
function setupActiveRide(ride) {
    // Update UI
    document.getElementById('activePickupAddress').textContent = ride.pickupLocation;
    document.getElementById('activeDestinationAddress').textContent = ride.destination;
    document.getElementById('currentFare').textContent = `K${ride.fare ? ride.fare.toFixed(2) : '0.00'}`;
    
    // Get driver details if available
    if (ride.driverId) {
        database.ref('users/' + ride.driverId).once('value')
            .then(driverSnapshot => {
                const driver = driverSnapshot.val();
                if (driver) {
                    document.getElementById('activeDriverName').textContent = driver.name || 'Driver';
                    document.getElementById('activeDriverPhone').textContent = `Phone: ${driver.phone || 'N/A'}`;
                    document.getElementById('activeDriverVehicle').textContent = `Vehicle: ${driver.vehicleType || 'N/A'} (${driver.licensePlate || 'N/A'})`;
                    document.getElementById('activeDriverRating').textContent = `Rating: ${driver.rating || '4.5'} ★`;
                }
            });
        
        // Start tracking driver location
        trackDriverLocation(ride.driverId, ride.id);
    }
    
    // Set up active ride map
    setupActiveRideMap(ride);
    
    // Switch to during ride screen
    switchTab('duringRideScreen');
    
    // Set up listener for ride updates
    if (activeRideListener) {
        activeRideListener();
    }
    
    activeRideListener = database.ref('rides/' + ride.id).on('value', snapshot => {
        const updatedRide = snapshot.val();
        if (updatedRide) {
            // Update current ride
            currentRide = { id: ride.id, ...updatedRide };
            
            // Handle status changes
            if (updatedRide.status === 'completed') {
                showRideCompletion(updatedRide);
            } else if (updatedRide.status === 'cancelled') {
                handleRideCancellation(updatedRide);
            }
        }
    });
}

// Load settings
function loadSettings() {
    // Load user preferences
    const rideNotifications = localStorage.getItem('rideNotifications') !== 'false';
    const promoNotifications = localStorage.getItem('promoNotifications') === 'true';
    const language = localStorage.getItem('language') || 'en';
    const darkMode = localStorage.getItem('darkMode') === 'true';
    
    document.getElementById('rideNotifications').checked = rideNotifications;
    document.getElementById('promoNotifications').checked = promoNotifications;
    document.getElementById('languageSelect').value = language;
    document.getElementById('darkModeToggle').checked = darkMode;
    
    // Apply dark mode if enabled
    if (darkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

// Initialize app settings
function initializeAppSettings() {
    // Check for saved dark mode preference
    const darkMode = localStorage.getItem('darkMode') === 'true';
    if (darkMode) {
        document.body.classList.add('dark-mode');
        document.getElementById('darkModeToggle').checked = true;
    }
    
    // Check for saved language preference
    const language = localStorage.getItem('language') || 'en';
    document.getElementById('languageSelect').value = language;
    
    // Check notification preferences
    const rideNotifications = localStorage.getItem('rideNotifications') !== 'false';
    const promoNotifications = localStorage.getItem('promoNotifications') === 'true';
    
    document.getElementById('rideNotifications').checked = rideNotifications;
    document.getElementById('promoNotifications').checked = promoNotifications;
}

// Toggle dark mode
function toggleDarkMode() {
    const darkMode = document.getElementById('darkModeToggle').checked;
    
    if (darkMode) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'true');
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('darkMode', 'false');
    }
}

// Logout
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clean up any active listeners
        if (driverAssignmentListener) {
            driverAssignmentListener();
            driverAssignmentListener = null;
        }
        
        if (rideHistoryListener) {
            rideHistoryListener();
            rideHistoryListener = null;
        }
        
        if (activeRideListener) {
            activeRideListener();
            activeRideListener = null;
        }
        
        auth.signOut()
            .then(() => {
                currentUser = null;
                userFullName = "Passenger";
                localStorage.removeItem('userAuthenticated');
                localStorage.removeItem('profileCompleted');
                showAuthScreen();
                showNotification('Logged out successfully.');
            })
            .catch(error => {
                console.error('Error signing out:', error);
                showNotification('Error logging out. Please try again.');
            });
    }
}

// Show notification
function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 4000);
}

// Handle offline/online status
window.addEventListener('online', function() {
    showNotification('Connection restored.');
});

window.addEventListener('offline', function() {
    showNotification('You are currently offline. Some features may not work.');
});
