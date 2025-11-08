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
let homeMap, rideMap, activeRideMap, popupRideMap;
let rideType = 'standard';
let paymentMethod = 'airtel';
let userRating = 0;
let userLocation = null;
let driverMarker = null;
let userMarker = null;
let destinationMarker = null;
let routePolyline = null;
let rideRequestInterval = null;
let ridePulsingAnimation = null;
let userFullName = "Passenger";
let driverAssignmentListener = null;
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

// Show/hide screens
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
 
    updateUserGreeting();
    loadNearbyPlaces();
    loadRideHistory();
    checkActiveRides();
}

// Update user greeting
function updateUserGreeting() {
    const greetingElement = document.getElementById('userGreeting');
    greetingElement.textContent = userFullName && userFullName !== "Passenger" ? `Hi ${userFullName}, Where to?` : "Hi, Where to?";
}

// Authentication
function initializeAuth() {
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            document.getElementById('userIcon').textContent = user.displayName ? user.displayName.charAt(0).toUpperCase() : 'P';
            loadUserData();
            startLocationTracking();
        } else {
            const userAuthenticated = localStorage.getItem('userAuthenticated');
            if (!userAuthenticated) showAuthScreen();
        }
    });
}

function setupEventListeners() {
    // Onboarding
    document.getElementById('getStartedBtn').addEventListener('click', () => {
        localStorage.setItem('onboardingCompleted', 'true');
        showAuthScreen();
    });
 
    // Auth
    document.getElementById('loginBtn').addEventListener('click', loginUser);
    document.getElementById('signupBtn').addEventListener('click', signupUser);
    document.getElementById('switchToSignup').addEventListener('click', () => {
        document.getElementById('loginBtn').classList.add('hidden');
        document.getElementById('signupBtn').classList.remove('hidden');
    });
 
    // Profile
    document.getElementById('completeProfileBtn').addEventListener('click', completeProfile);
 
    // Tabs
    document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', e => switchTab(e.target.closest('.tab').getAttribute('data-tab'))));
 
    // Ride options
    document.querySelectorAll('.ride-option').forEach(option => option.addEventListener('click', e => {
        document.querySelectorAll('.ride-option').forEach(opt => opt.classList.remove('active'));
        e.target.closest('.ride-option').classList.add('active');
        rideType = e.target.closest('.ride-option').getAttribute('data-type');
        updateFareEstimate();
    }));
 
    // Payment
    document.querySelectorAll('.payment-option').forEach(option => option.addEventListener('click', e => {
        document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('active'));
        e.target.closest('.payment-option').classList.add('active');
        paymentMethod = e.target.closest('.payment-option').getAttribute('data-method');
    }));
 
    // Buttons
    document.getElementById('requestRideBtn').addEventListener('click', requestRide);
    document.getElementById('scheduleRideBtn').addEventListener('click', scheduleRide);
    document.getElementById('cancelRideBtn').addEventListener('click', cancelRide);
    document.getElementById('contactDriverBtn').addEventListener('click', contactDriver);
    document.getElementById('shareRideBtn').addEventListener('click', shareRide);
    document.getElementById('shareRideLinkBtn').addEventListener('click', shareRideLink);
    document.getElementById('addStopBtn').addEventListener('click', addStop);
    document.getElementById('completePaymentBtn').addEventListener('click', completePayment);
    document.getElementById('saveProfileBtn').addEventListener('click', saveProfile);
    document.getElementById('logoutBtn').addEventListener('click', logout);
 
    // Destination input
    const destInput = document.getElementById('destination');
    destInput.addEventListener('input', e => {
        updateFareEstimate();
        if (e.target.value.length >= 2) searchPlaces(e.target.value);
        else hideDestinationSuggestions();
    });
    destInput.addEventListener('focus', e => {
        if (e.target.value.length >= 2) searchPlaces(e.target.value);
    });
 
    document.addEventListener('click', e => {
        if (!e.target.closest('.input-group') && !e.target.closest('.suggestion-list')) hideDestinationSuggestions();
    });
 
    // Saved locations
    document.querySelectorAll('.saved-location-btn').forEach(btn => btn.addEventListener('click', e => useSavedLocation(e.target.getAttribute('data-address'))));
 
    // Stars
    document.querySelectorAll('.star').forEach(star => star.addEventListener('click', e => setRating(parseInt(e.target.getAttribute('data-rating')))));
 
    // History filter
    document.getElementById('historyFilter').addEventListener('change', loadRideHistory);
    document.getElementById('historyDate').addEventListener('change', loadRideHistory);
 
    // Dark mode
    document.getElementById('darkModeToggle').addEventListener('change', toggleDarkMode);
 
    // History click
    document.addEventListener('click', e => {
        if (e.target.closest('.history-item')) showRideDetailsPopup(e.target.closest('.history-item').getAttribute('data-ride-id'));
    });
 
    // Popup close
    document.getElementById('closeRidePopup').addEventListener('click', closeRideDetailsPopup);
    document.getElementById('closeRidePopupTop').addEventListener('click', closeRideDetailsPopup);
}

function loginUser() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
 
    if (!email || !password) return showNotification('Please enter both email and password.');
 
    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            localStorage.setItem('userAuthenticated', 'true');
            checkOnboardingStatus();
            showNotification('Login successful!');
        })
        .catch(error => showNotification('Login failed: ' + error.message));
}

function signupUser() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
 
    if (!email || !password) return showNotification('Please enter both email and password.');
    if (password.length < 6) return showNotification('Password must be at least 6 characters long.');
 
    auth.createUserWithEmailAndPassword(email, password)
        .then(() => {
            localStorage.setItem('userAuthenticated', 'true');
            showProfileSetupScreen();
            showNotification('Account created successfully!');
        })
        .catch(error => showNotification('Signup failed: ' + error.message));
}

function completeProfile() {
    const name = document.getElementById('profileName').value;
    const phone = document.getElementById('profilePhone').value;
    const paymentPreference = document.getElementById('paymentPreference').value;
    const homeAddress = document.getElementById('homeAddress').value;
    const workAddress = document.getElementById('workAddress').value;
 
    if (!name || !phone) return showNotification('Please complete all required fields.');
 
    if (currentUser) {
        const userData = {
            name, phone, email: currentUser.email, paymentPreference,
            homeAddress, workAddress, createdAt: firebase.database.ServerValue.TIMESTAMP, userType: 'passenger'
        };
     
        database.ref('users/' + currentUser.uid).update(userData)
            .then(() => {
                localStorage.setItem('profileCompleted', 'true');
                userFullName = name;
                showMainApp();
                showNotification('Profile completed successfully.');
                currentUser.updateProfile({ displayName: name });
            })
            .catch(error => showNotification('Error saving profile. Please try again.'));
    }
}

// Maps
function initializeMaps() {
    const defaultView = [-15.4167, 28.2833];
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' });
 
    homeMap = L.map('homeMap').setView(defaultView, 13);
    tileLayer.clone().addTo(homeMap);
 
    rideMap = L.map('rideMap').setView(defaultView, 13);
    tileLayer.clone().addTo(rideMap);
 
    activeRideMap = L.map('activeRideMap').setView(defaultView, 13);
    tileLayer.clone().addTo(activeRideMap);
 
    popupRideMap = L.map('popupRideMap').setView(defaultView, 13);
    tileLayer.clone().addTo(popupRideMap);
 
    getUserLocation();
}

function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const { latitude: lat, longitude: lng } = position.coords;
            userLocation = { lat, lng };
         
            [homeMap, rideMap, activeRideMap, popupRideMap].forEach(map => map.setView([lat, lng], 15));
         
            userMarker = L.marker([lat, lng], {
                icon: L.divIcon({ className: 'customer-marker', html: '📍<div class="marker-label">You</div>', iconSize: [30, 40] })
            }).addTo(homeMap).bindPopup('Your current location').openPopup();
             
            reverseGeocode(lat, lng).then(address => document.getElementById('pickupLocation').value = address);
            loadNearbyPlaces();
        }, error => {
            console.error('Geolocation error:', error);
            showNotification('Unable to get your location. Please enable location services.');
        });
    }
}

function startLocationTracking() {
    if (navigator.geolocation && currentUser) {
        navigator.geolocation.watchPosition(position => {
            const { latitude: lat, longitude: lng } = position.coords;
            userLocation = { lat, lng };
         
            database.ref('userLocations/' + currentUser.uid).set({
                latitude: lat, longitude: lng, timestamp: firebase.database.ServerValue.TIMESTAMP
            });
         
            if (userMarker) userMarker.setLatLng([lat, lng]);
            if (destinationMarker && document.getElementById('destination').value) updateFareEstimate();
        }, error => console.error('Location tracking error:', error), {
            enableHighAccuracy: true, timeout: 5000, maximumAge: 30000
        });
    }
}

// Nearby places and search
function loadNearbyPlaces() {
    if (!userLocation) return;
 
    const nearbyPlacesList = document.getElementById('nearbyPlacesList');
    nearbyPlacesList.innerHTML = '<div class="loading-text">Loading nearby places...</div>';
    clearNearbyPlacesMarkers();
 
    const radius = 20000;
    const overpassQuery = `[out:json][timeout:25];(node["amenity"](around:${radius},${userLocation.lat},${userLocation.lng});node["shop"](around:${radius},${userLocation.lat},${userLocation.lng});node["tourism"](around:${radius},${userLocation.lat},${userLocation.lng}););out body;>;out skel qt;`;
 
    fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: overpassQuery })
    .then(response => response.json())
    .then(data => {
        nearbyPlacesList.innerHTML = '';
     
        if (data.elements && data.elements.length > 0) {
            const places = data.elements
                .filter(el => el.tags && el.tags.name)
                .map(place => ({ ...place, distance: calculateDistance(userLocation.lat, userLocation.lng, place.lat, place.lon) }))
                .sort((a, b) => a.distance - b.distance)
                .filter((_, i, arr) => i === 0 || arr[i].distance - arr[i-1].distance >= 2000)
                .slice(0, 10);
         
            if (places.length === 0) {
                nearbyPlacesList.innerHTML = '<div class="no-places">No nearby places found within 20km</div>';
                return;
            }
         
            places.forEach(place => {
                const placeElement = createNearbyPlaceElement(place);
                nearbyPlacesList.appendChild(placeElement);
             
                const marker = L.marker([place.lat, place.lon], {
                    icon: L.divIcon({
                        className: 'nearby-place-marker',
                        html: `${getPlaceIcon(place.tags.amenity || place.tags.shop || place.tags.tourism || 'place')}<div class="marker-label">${place.tags.name}</div>`,
                        iconSize: [30, 40]
                    })
                }).addTo(homeMap).bindPopup(`<strong>${place.tags.name}</strong><br>${formatPlaceType(place.tags.amenity || place.tags.shop || place.tags.tourism || 'place')}<br>${(place.distance / 1000).toFixed(1)} km away`);
             
                nearbyPlacesMarkers.push(marker);
            });
        } else {
            nearbyPlacesList.innerHTML = '<div class="no-places">No nearby places found within 20km</div>';
        }
    })
    .catch(() => loadFallbackNearbyPlaces());
}

function clearNearbyPlacesMarkers() {
    nearbyPlacesMarkers.forEach(marker => homeMap.removeLayer(marker));
    nearbyPlacesMarkers = [];
}

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
 
    placeElement.addEventListener('click', () => {
        document.getElementById('destination').value = place.tags.name;
        updateFareEstimate();
        showNotification(`Selected: ${place.tags.name}`);
     
        document.querySelectorAll('.nearby-place-item').forEach(item => item.classList.remove('selected'));
        placeElement.classList.add('selected');
     
        updateDestinationMarker(place.lat, place.lon, place.tags.name);
        drawRoute(userLocation.lat, userLocation.lng, place.lat, place.lon);
    });
 
    return placeElement;
}

function searchPlaces(query) {
    if (!userLocation) return;
 
    const suggestionsContainer = document.getElementById('destinationSuggestions');
    suggestionsContainer.innerHTML = '<div class="loading-text">Searching...</div>';
    suggestionsContainer.style.display = 'block';
 
    const radius = 20000;
    const overpassQuery = `[out:json][timeout:25];(node["name"~"${query}",i](around:${radius},${userLocation.lat},${userLocation.lng});way["name"~"${query}",i](around:${radius},${userLocation.lat},${userLocation.lng});relation["name"~"${query}",i](around:${radius},${userLocation.lat},${userLocation.lng}););out center;`;
 
    fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: overpassQuery })
    .then(response => response.json())
    .then(data => {
        suggestionsContainer.innerHTML = '';
        destinationSearchResults = [];
     
        if (data.elements && data.elements.length > 0) {
            const results = data.elements
                .filter(el => el.tags && el.tags.name)
                .map(el => {
                    let lat, lon;
                    if (el.type === 'node') { lat = el.lat; lon = el.lon; } else { lat = el.center.lat; lon = el.center.lon; }
                    const distance = calculateDistance(userLocation.lat, userLocation.lng, lat, lon);
                    return { ...el, displayLat: lat, displayLon: lon, distance };
                })
                .sort((a, b) => a.distance - b.distance)
                .slice(0, 10);
         
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
             
                suggestionItem.addEventListener('click', () => {
                    document.getElementById('destination').value = result.tags.name;
                    suggestionsContainer.style.display = 'none';
                    updateFareEstimate();
                 
                    updateDestinationMarker(result.displayLat, result.displayLon, result.tags.name);
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

function hideDestinationSuggestions() {
    document.getElementById('destinationSuggestions').style.display = 'none';
}

function getPlaceIcon(placeType) {
    const icons = {
        'restaurant': '🍽️', 'cafe': '☕', 'bar': '🍺', 'pub': '🍻', 'fast_food': '🍔',
        'bank': '🏦', 'atm': '💳', 'hospital': '🏥', 'pharmacy': '💊', 'school': '🏫',
        'university': '🎓', 'library': '📚', 'cinema': '🎬', 'theatre': '🎭', 'museum': '🏛️',
        'hotel': '🏨', 'supermarket': '🛒', 'mall': '🏪', 'clothes': '👕', 'fuel': '⛽',
        'parking': '🅿️', 'bus_station': '🚌', 'taxi': '🚕', 'police': '👮', 'market': '🛍️',
        'post_office': '📮', 'place_of_worship': '🛐', 'stadium': '🏟️', 'park': '🏞️',
        'monument': '🗽', 'castle': '🏰'
    };
    return icons[placeType] || '📍';
}

function formatPlaceType(type) {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function getPlaceAddress(place) {
    return place.tags['addr:street'] ? `${place.tags['addr:street']}${place.tags['addr:housenumber'] ? ' ' + place.tags['addr:housenumber'] : ''}` : 'Address not available';
}

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
 
    const placesWithDistance = fallbackPlaces.map(place => ({ ...place, distance: calculateDistance(userLocation.lat, userLocation.lng, place.lat, place.lng) })).sort((a, b) => a.distance - b.distance);
 
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
     
        placeElement.addEventListener('click', () => {
            document.getElementById('destination').value = place.name;
            updateFareEstimate();
            showNotification(`Selected: ${place.name}`);
         
            document.querySelectorAll('.nearby-place-item').forEach(item => item.classList.remove('selected'));
            placeElement.classList.add('selected');
         
            updateDestinationMarker(place.lat, place.lng, place.name);
            drawRoute(userLocation.lat, userLocation.lng, place.lat, place.lng);
        });
     
        nearbyPlacesList.appendChild(placeElement);
    });
}

function reverseGeocode(lat, lng) {
    return new Promise(resolve => {
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`, {
            headers: { 'User-Agent': 'JubelApp/1.0' }
        })
        .then(response => response.json())
        .then(data => resolve(data && data.display_name ? data.display_name : `Near ${lat.toFixed(4)}, ${lng.toFixed(4)}`))
        .catch(() => resolve(`Near ${lat.toFixed(4)}, ${lng.toFixed(4)}`));
    });
}

function forwardGeocode(query) {
    return new Promise(resolve => {
        if (!userLocation) { resolve([]); return; }
     
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10&addressdetails=1`, {
            headers: { 'User-Agent': 'JubelApp/1.0' }
        })
        .then(response => response.json())
        .then(data => {
            const filteredResults = data.filter(result => {
                const distance = calculateDistance(userLocation.lat, userLocation.lng, parseFloat(result.lat), parseFloat(result.lon));
                return distance <= 20000;
            });
            resolve(filteredResults);
        })
        .catch(() => resolve([]));
    });
}

// Tab switch
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
 
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add('active');
 
    if (tabId === 'historyScreen') loadRideHistory();
    else if (tabId === 'homeScreen') {
        if (homeMap && userLocation) homeMap.setView([userLocation.lat, userLocation.lng], 15);
        loadNearbyPlaces();
    } else if (tabId === 'settingsScreen') loadSettings();
}

function useSavedLocation(addressType) {
    if (currentUser) {
        database.ref('users/' + currentUser.uid).once('value').then(snapshot => {
            const userData = snapshot.val();
            const address = userData ? userData[addressType + 'Address'] : null;
         
            if (address) {
                document.getElementById('destination').value = address;
                updateFareEstimate();
                showNotification(`${addressType.charAt(0).toUpperCase() + addressType.slice(1)} address set.`);
             
                forwardGeocode(address).then(results => {
                    if (results.length > 0) {
                        updateDestinationMarker(parseFloat(results[0].lat), parseFloat(results[0].lon), address);
                        drawRoute(userLocation.lat, userLocation.lng, parseFloat(results[0].lat), parseFloat(results[0].lon));
                    }
                });
            } else {
                showNotification(`No ${addressType} address saved.`);
            }
        });
    }
}

function updateFareEstimate() {
    const destination = document.getElementById('destination').value;
 
    if (destination.length > 3 && userLocation) {
        forwardGeocode(destination).then(results => {
            if (results.length > 0) {
                const destLat = parseFloat(results[0].lat);
                const destLng = parseFloat(results[0].lon);
             
                const distance = calculateDistance(userLocation.lat, userLocation.lng, destLat, destLng);
             
                let baseFare = distance < 90 ? 11 : Math.max(11, Math.ceil(distance / 90));
             
                switch(rideType) {
                    case 'premium': baseFare *= 1.5; break;
                    case 'bike': baseFare *= 0.7; break;
                }
             
                document.getElementById('estimatedFare').textContent = `K${baseFare.toFixed(2)}`;
                const etaMinutes = Math.ceil((distance / 1000) / 30 * 60);
                document.getElementById('etaDisplay').textContent = `ETA: ${etaMinutes} min`;
            }
        });
    } else {
        document.getElementById('estimatedFare').textContent = 'K0.00';
        document.getElementById('etaDisplay').textContent = 'ETA: -- min';
    }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180, Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function updateDestinationMarker(lat, lng, name) {
    if (destinationMarker) homeMap.removeLayer(destinationMarker);
 
    destinationMarker = L.marker([lat, lng], {
        icon: L.divIcon({ className: 'destination-marker', html: '🏁<div class="marker-label">Destination</div>', iconSize: [30, 40] })
    }).addTo(homeMap).bindPopup(`<strong>${name}</strong><br>Your destination`).openPopup();
 
    const bounds = L.latLngBounds([userLocation.lat, userLocation.lng], [lat, lng]);
    homeMap.fitBounds(bounds, { padding: [20, 20] });
}

function drawRoute(startLat, startLng, endLat, endLng) {
    if (routePolyline) homeMap.removeLayer(routePolyline);
 
    fetch(`https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`)
        .then(response => response.json())
        .then(data => {
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const coords = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                routePolyline = L.polyline(coords, { color: '#FF6B35', weight: 4, opacity: 0.8, dashArray: '8, 8' }).addTo(homeMap);
                homeMap.fitBounds(routePolyline.getBounds(), { padding: [20, 20] });
            }
        })
        .catch(() => {
            routePolyline = L.polyline([[startLat, startLng], [endLat, endLng]], { color: '#FF6B35', weight: 4, opacity: 0.8, dashArray: '8, 8' }).addTo(homeMap);
        });
}

// Ride request with fix for connection error
function requestRide() {
    const pickup = document.getElementById('pickupLocation').value;
    const destination = document.getElementById('destination').value;
 
    if (!pickup || !destination) return showNotification('Please enter both pickup and destination.');
    if (!userLocation) return showNotification('Unable to get your location.');
    if (!currentUser) return showNotification('Please log in.');
 
    const btn = document.getElementById('requestRideBtn');
    btn.disabled = true;
    btn.textContent = 'Requesting...';
 
    forwardGeocode(destination).then(results => {
        if (results.length === 0) {
            showNotification('Invalid destination.');
            btn.disabled = false;
            btn.textContent = 'Request Ride';
            return;
        }
     
        const destLat = parseFloat(results[0].lat);
        const destLng = parseFloat(results[0].lon);
        const distance = calculateDistance(userLocation.lat, userLocation.lng, destLat, destLng);
        let fare = distance < 90 ? 11 : Math.max(11, Math.ceil(distance / 90));
        switch(rideType) { case 'premium': fare *= 1.5; break; case 'bike': fare *= 0.7; break; }
     
        const rideId = database.ref().child('rides').push().key;
        const rideData = {
            id: rideId, passengerId: currentUser.uid, passengerName: userFullName || 'Passenger',
            passengerPhone: getUserPhone(), pickupLocation: pickup, destination,
            pickupLat: userLocation.lat, pickupLng: userLocation.lng, destLat, destLng,
            rideType, fare, distance: (distance / 1000).toFixed(2) + ' km', status: 'requested',
            timestamp: firebase.database.ServerValue.TIMESTAMP, updatedAt: firebase.database.ServerValue.TIMESTAMP,
            tag: 'pending'  // Added pending tag
        };
     
        // Also add to user history
        database.ref(`users/${currentUser.uid}/history/${rideId}`).set(rideData);
     
        database.ref('rides/' + rideId).set(rideData)
            .then(() => {
                currentRide = rideData;
             
                document.getElementById('pickupAddress').textContent = pickup;
                document.getElementById('destinationAddress').textContent = destination;
                document.getElementById('rideFare').textContent = `K${fare.toFixed(2)}`;
             
                document.getElementById('activePickupAddress').textContent = pickup;
                document.getElementById('activeDestinationAddress').textContent = destination;
                document.getElementById('currentFare').textContent = `K${fare.toFixed(2)}`;
             
                switchTab('rideRequestScreen');
                setupRideMap(userLocation.lat, userLocation.lng, destLat, destLng);
                startPulsingAnimation();
                listenForDriverAssignment(rideId);
                showNotification('Ride requested! Waiting for driver.');
             
                btn.disabled = false;
                btn.textContent = 'Request Ride';
            })
            .catch(error => {
                console.error('Error requesting ride:', error);
                showNotification('Error requesting ride. Please check connection.');
                btn.disabled = false;
                btn.textContent = 'Request Ride';
            });
    }).catch(error => {
        console.error('Geocoding error:', error);
        showNotification('Error calculating route.');
        btn.disabled = false;
        btn.textContent = 'Request Ride';
    });
}

function getUserPhone() {
    return currentUser ? (document.getElementById('userPhone').value || 'Not provided') : 'Not provided';
}

function startPulsingAnimation() {
    const loadingSpinner = document.querySelector('.loading-spinner');
    const spinner = document.querySelector('.spinner');
    const pulsingText = document.querySelector('.pulsing-text');
 
    loadingSpinner.classList.remove('hidden');
    document.getElementById('assignedDriver').classList.add('hidden');
 
    spinner.classList.add('pulsing');
    pulsingText.classList.add('pulsing');
 
    ridePulsingAnimation = setInterval(() => {
        spinner.style.transform = spinner.style.transform === 'scale(1.1)' ? 'scale(1)' : 'scale(1.1)';
    }, 500);
}

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
 
    if (pulsingText) pulsingText.classList.remove('pulsing');
}

function listenForDriverAssignment(rideId) {
    if (driverAssignmentListener) driverAssignmentListener();
 
    driverAssignmentListener = database.ref('rides/' + rideId).on('value', snapshot => {
        const ride = snapshot.val();
        if (!ride) return showNotification('Ride not found.');
     
        if (ride.driverId && ride.status === 'accepted') handleDriverAssignment(ride);
        else if (ride.status === 'completed') showRideCompletion(ride);
        else if (ride.status === 'cancelled') handleRideCancellation(ride);
        else if (ride.status === 'arrived') showNotification('Driver arrived at pickup.');
        else if (ride.status === 'picked_up') showNotification('Picked up. Enjoy your ride!');
        else if (ride.status === 'started') showNotification('Trip started.');
    });
}

function handleDriverAssignment(ride) {
    stopPulsingAnimation();
 
    document.querySelector('.loading-spinner').classList.add('hidden');
    document.getElementById('assignedDriver').classList.remove('hidden');
 
    database.ref('users/' + ride.driverId).once('value').then(snapshot => {
        const driver = snapshot.val();
        if (driver) {
            document.getElementById('driverName').textContent = driver.name || 'Driver';
            document.getElementById('driverPhone').textContent = `Phone: ${driver.phone || 'N/A'}`;
            document.getElementById('driverVehicle').textContent = `Vehicle: ${driver.vehicleType || 'N/A'} (${driver.licensePlate || 'N/A'})`;
            document.getElementById('driverRating').textContent = `Rating: ${driver.rating || '4.5'} ★`;
         
            document.getElementById('activeDriverName').textContent = driver.name || 'Driver';
            document.getElementById('activeDriverPhone').textContent = `Phone: ${driver.phone || 'N/A'}`;
            document.getElementById('activeDriverVehicle').textContent = `Vehicle: ${driver.vehicleType || 'N/A'} (${driver.licensePlate || 'N/A'})`;
            document.getElementById('activeDriverRating').textContent = `Rating: ${driver.rating || '4.5'} ★`;
         
            showNotification(`Driver ${driver.name} accepted your ride!`);
         
            trackDriverLocation(ride.driverId, ride.id);
            updateRideMapWithDriver(ride);
         
            setTimeout(() => {
                switchTab('duringRideScreen');
                setupActiveRideMap(ride);
            }, 1500);
        }
    });
}

function handleRideCancellation(ride) {
    stopPulsingAnimation();
    showNotification('Ride cancelled.');
    switchTab('homeScreen');
    currentRide = null;
 
    if (driverMarker) {
        rideMap.removeLayer(driverMarker);
        driverMarker = null;
    }
 
    if (driverAssignmentListener) {
        driverAssignmentListener();
        driverAssignmentListener = null;
    }
}

function scheduleRide() {
    showNotification('Scheduled rides coming soon!');
}

function setupRideMap(pickupLat, pickupLng, destLat, destLng) {
    rideMap.eachLayer(layer => { if (layer instanceof L.Marker || layer instanceof L.Polyline) rideMap.removeLayer(layer); });
 
    L.marker([pickupLat, pickupLng], { icon: L.divIcon({ className: 'customer-marker', html: '📍<div class="marker-label">Pickup</div>', iconSize: [30, 40] }) }).addTo(rideMap).bindPopup('Pickup');
    L.marker([destLat, destLng], { icon: L.divIcon({ className: 'destination-marker', html: '🏁<div class="marker-label">Destination</div>', iconSize: [30, 40] }) }).addTo(rideMap).bindPopup('Destination');
 
    drawRouteOnRideMap(pickupLat, pickupLng, destLat, destLng);
 
    const bounds = L.latLngBounds([pickupLat, pickupLng], [destLat, destLng]);
    rideMap.fitBounds(bounds, { padding: [20, 20] });
}

function drawRouteOnRideMap(startLat, startLng, endLat, endLng) {
    fetch(`https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`)
        .then(response => response.json())
        .then(data => {
            if (data.routes && data.routes.length > 0) {
                const coords = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
                L.polyline(coords, { color: '#FF6B35', weight: 4, opacity: 0.8 }).addTo(rideMap);
            }
        })
        .catch(() => L.polyline([[startLat, startLng], [endLat, endLng]], { color: '#FF6B35', weight: 4, opacity: 0.8 }).addTo(rideMap));
}

function updateRideMapWithDriver(ride) {
    rideMap.eachLayer(layer => { if (layer instanceof L.Marker || layer instanceof L.Polyline) rideMap.removeLayer(layer); });
 
    L.marker([ride.pickupLat, ride.pickupLng], { icon: L.divIcon({ className: 'customer-marker', html: '📍<div class="marker-label">You</div>', iconSize: [30, 40] }) }).addTo(rideMap).bindPopup('Your Location');
    L.marker([ride.destLat, ride.destLng], { icon: L.divIcon({ className: 'destination-marker', html: '🏁<div class="marker-label">Destination</div>', iconSize: [30, 40] }) }).addTo(rideMap).bindPopup('Destination');
 
    drawRouteOnRideMap(ride.pickupLat, ride.pickupLng, ride.destLat, ride.destLng);
 
    database.ref('driverLocations/' + ride.driverId).once('value').then(snapshot => {
        const driverLocation = snapshot.val();
        if (driverLocation) {
            driverMarker = L.marker([driverLocation.latitude, driverLocation.longitude], {
                icon: L.divIcon({ className: 'driver-marker', html: '🚗<div class="marker-label">Driver</div>', iconSize: [40, 40] })
            }).addTo(rideMap).bindPopup('Your Driver');
         
            const bounds = L.latLngBounds([ride.pickupLat, ride.pickupLng], [ride.destLat, ride.destLng], [driverLocation.latitude, driverLocation.longitude]);
            rideMap.fitBounds(bounds, { padding: [30, 30] });
        }
    });
}

function trackDriverLocation(driverId, rideId) {
    database.ref('driverLocations/' + driverId).on('value', snapshot => {
        const location = snapshot.val();
        if (location && (rideMap || activeRideMap)) {
            const map = rideMap || activeRideMap;
            if (!driverMarker) {
                driverMarker = L.marker([location.latitude, location.longitude], {
                    icon: L.divIcon({ className: 'driver-marker', html: '🚗<div class="marker-label">Driver</div>', iconSize: [40, 40] })
                }).addTo(map).bindPopup('Your Driver');
            } else {
                driverMarker.setLatLng([location.latitude, location.longitude]);
            }
        }
    });
}

function setupActiveRideMap(ride) {
    activeRideMap.eachLayer(layer => { if (layer instanceof L.Marker || layer instanceof L.Polyline) activeRideMap.removeLayer(layer); });
 
    L.marker([ride.pickupLat, ride.pickupLng], { icon: L.divIcon({ className: 'customer-marker', html: '📍<div class="marker-label">You</div>', iconSize: [30, 40] }) }).addTo(activeRideMap).bindPopup('Pickup');
    L.marker([ride.destLat, ride.destLng], { icon: L.divIcon({ className: 'destination-marker', html: '🏁<div class="marker-label">Destination</div>', iconSize: [30, 40] }) }).addTo(activeRideMap).bindPopup('Destination');
 
    drawRouteOnActiveRideMap(ride.pickupLat, ride.pickupLng, ride.destLat, ride.destLng);
 
    const bounds = L.latLngBounds([ride.pickupLat, ride.pickupLng], [ride.destLat, ride.destLng]);
    activeRideMap.fitBounds(bounds, { padding: [20, 20] });
 
    trackActiveRideLocations(ride);
}

function drawRouteOnActiveRideMap(startLat, startLng, endLat, endLng) {
    fetch(`https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`)
        .then(response => response.json())
        .then(data => {
            if (data.routes && data.routes.length > 0) {
                const coords = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
                L.polyline(coords, { color: '#FF6B35', weight: 4, opacity: 0.8 }).addTo(activeRideMap);
            }
        })
        .catch(() => L.polyline([[startLat, startLng], [endLat, endLng]], { color: '#FF6B35', weight: 4, opacity: 0.8 }).addTo(activeRideMap));
}

function trackActiveRideLocations(ride) {
    if (ride.driverId) {
        database.ref('driverLocations/' + ride.driverId).on('value', snapshot => {
            const location = snapshot.val();
            if (location && activeRideMap) {
                if (!driverMarker) {
                    driverMarker = L.marker([location.latitude, location.longitude], {
                        icon: L.divIcon({ className: 'driver-marker', html: '🚗<div class="marker-label">Driver</div>', iconSize: [40, 40] })
                    }).addTo(activeRideMap).bindPopup('Your Driver');
                } else {
                    driverMarker.setLatLng([location.latitude, location.longitude]);
                }
             
                if (userLocation && !userMarker) {
                    userMarker = L.marker([userLocation.lat, userLocation.lng], {
                        icon: L.divIcon({ className: 'customer-marker', html: '📍<div class="marker-label">You</div>', iconSize: [30, 40] })
                    }).addTo(activeRideMap).bindPopup('Your Location');
                } else if (userLocation && userMarker) {
                    userMarker.setLatLng([userLocation.lat, userLocation.lng]);
                }
             
                if (userLocation) {
                    const bounds = L.latLngBounds([userLocation.lat, userLocation.lng], [location.latitude, location.longitude], [ride.destLat, ride.destLng]);
                    activeRideMap.fitBounds(bounds, { padding: [30, 30] });
                }
            }
        });
    }
}

function cancelRide() {
    if (currentRide && confirm('Cancel ride?')) {
        stopPulsingAnimation();
     
        if (driverAssignmentListener) {
            driverAssignmentListener();
            driverAssignmentListener = null;
        }
     
        database.ref('rides/' + currentRide.id).update({
            status: 'cancelled', cancelledAt: firebase.database.ServerValue.TIMESTAMP, updatedAt: firebase.database.ServerValue.TIMESTAMP
        })
        .then(() => {
            showNotification('Ride cancelled.');
            switchTab('homeScreen');
            currentRide = null;
         
            if (driverMarker) {
                rideMap.removeLayer(driverMarker);
                driverMarker = null;
            }
        })
        .catch(() => showNotification('Error cancelling ride.'));
    }
}

function contactDriver() {
    if (currentRide && currentRide.driverId) {
        database.ref('users/' + currentRide.driverId).once('value').then(snapshot => {
            const driver = snapshot.val();
            if (driver && driver.phone) {
                showNotification(`Calling: ${driver.phone}`);
                window.open(`tel:${driver.phone}`, '_self');
            } else {
                showNotification('Phone not available.');
            }
        });
    }
}

function shareRide() {
    if (currentRide) {
        const shareData = {
            title: 'My Jubel Ride',
            text: `Riding from ${currentRide.pickupLocation} to ${currentRide.destination}`,
            url: window.location.href
        };
     
        if (navigator.share) {
            navigator.share(shareData).then(() => showNotification('Shared!')).catch(console.error);
        } else {
            navigator.clipboard.writeText(shareData.text).then(() => showNotification('Copied to clipboard!'));
        }
    }
}

function shareRideLink() {
    if (currentRide) {
        const rideLink = `${window.location.origin}?ride=${currentRide.id}`;
        navigator.clipboard.writeText(rideLink).then(() => showNotification('Link copied!'));
    }
}

function addStop() {
    const stopAddress = prompt('Enter stop address:');
    if (stopAddress) showNotification(`Stop added: ${stopAddress}`);
}

function showRideCompletion(ride) {
    document.getElementById('finalFare').textContent = `K${ride.fare.toFixed(2)}`;
    switchTab('rideCompletionScreen');
    showNotification('Ride completed. Complete payment & rating.');
 
    if (driverMarker) {
        activeRideMap.removeLayer(driverMarker);
        driverMarker = null;
    }
    if (userMarker) {
        activeRideMap.removeLayer(userMarker);
        userMarker = null;
    }
 
    if (driverAssignmentListener) {
        driverAssignmentListener();
        driverAssignmentListener = null;
    }
}

function setRating(rating) {
    userRating = rating;
    document.querySelectorAll('.star').forEach(star => {
        star.classList.toggle('active', parseInt(star.getAttribute('data-rating')) <= rating);
    });
}

function completePayment() {
    const tipAmount = parseFloat(document.getElementById('tipAmount').value) || 0;
    const review = document.getElementById('driverReview').value;
 
    if (currentRide) {
        const totalAmount = currentRide.fare + tipAmount;
     
        database.ref('rides/' + currentRide.id).update({
            status: 'paid', tip: tipAmount, totalAmount, rating: userRating, review,
            paymentMethod, paymentTimestamp: firebase.database.ServerValue.TIMESTAMP, updatedAt: firebase.database.ServerValue.TIMESTAMP
        })
        .then(() => {
            showNotification(`Payment K${totalAmount.toFixed(2)} completed. Thanks!`);
            switchTab('homeScreen');
            currentRide = null;
         
            document.getElementById('destination').value = '';
            document.getElementById('estimatedFare').textContent = 'K0.00';
            document.getElementById('tipAmount').value = '';
            document.getElementById('driverReview').value = '';
            setRating(0);
         
            if (routePolyline) {
                homeMap.removeLayer(routePolyline);
                routePolyline = null;
            }
            if (destinationMarker) {
                homeMap.removeLayer(destinationMarker);
                destinationMarker = null;
            }
        })
        .catch(() => showNotification('Error completing payment.'));
    }
}

function loadUserData() {
    if (currentUser) {
        database.ref('users/' + currentUser.uid).once('value').then(snapshot => {
            const userData = snapshot.val();
            if (userData) {
                userFullName = userData.name || "Passenger";
                document.getElementById('userName').value = userFullName;
                document.getElementById('userPhone').value = userData.phone || '';
                document.getElementById('userEmail').value = userData.email || '';
                document.getElementById('savedHome').value = userData.homeAddress || '';
                document.getElementById('savedWork').value = userData.workAddress || '';
             
                document.getElementById('userIcon').textContent = userFullName.charAt(0).toUpperCase();
                updateUserGreeting();
            }
        });
    }
}

function saveProfile() {
    const name = document.getElementById('userName').value;
    const phone = document.getElementById('userPhone').value;
    const email = document.getElementById('userEmail').value;
    const homeAddress = document.getElementById('savedHome').value;
    const workAddress = document.getElementById('savedWork').value;
 
    if (currentUser) {
        database.ref('users/' + currentUser.uid).update({
            name, phone, email, homeAddress, workAddress, updatedAt: firebase.database.ServerValue.TIMESTAMP
        })
        .then(() => {
            userFullName = name;
            showNotification('Profile saved.');
            currentUser.updateProfile({ displayName: name });
            document.getElementById('userIcon').textContent = name.charAt(0).toUpperCase();
            updateUserGreeting();
        })
        .catch(() => showNotification('Error saving profile.'));
    }
}

function loadRideHistory() {
    if (currentUser) {
        const filter = document.getElementById('historyFilter').value;
        const dateFilter = document.getElementById('historyDate').value;
     
        if (rideHistoryListener) rideHistoryListener();
     
        rideHistoryListener = database.ref('rides').orderByChild('passengerId').equalTo(currentUser.uid).on('value', snapshot => {
            const historyList = document.getElementById('historyList');
            historyList.innerHTML = '';
         
            const rides = snapshot.val();
            if (rides) {
                let ridesArray = Object.keys(rides).map(rideId => ({ id: rideId, ...rides[rideId] }));
             
                if (filter !== 'all') ridesArray = ridesArray.filter(ride => ride.status === filter);
                if (dateFilter) ridesArray = ridesArray.filter(ride => new Date(ride.timestamp).toDateString() === new Date(dateFilter).toDateString());
             
                ridesArray.sort((a, b) => b.timestamp - a.timestamp);
             
                if (ridesArray.length === 0) {
                    historyList.innerHTML = '<p style="text-align: center; padding: 16px; color: var(--medium-gray);">No rides found.</p>';
                    return;
                }
             
                ridesArray.forEach(ride => {
                    const historyItem = document.createElement('div');
                    historyItem.className = 'history-item';
                    historyItem.setAttribute('data-ride-id', ride.id);
                 
                    const date = new Date(ride.timestamp);
                    const formattedDate = date.toLocaleDateString();
                    const formattedTime = date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
                 
                    let statusClass = 'status-requested', statusText = getStatusText(ride.status);
                    if (ride.status === 'accepted') statusClass = 'status-accepted';
                    else if (ride.status === 'completed' || ride.status === 'paid') statusClass = 'status-completed';
                    else if (ride.status === 'cancelled') statusClass = 'status-cancelled';
                    else if (ride.status === 'requested') { statusClass = 'status-pending'; statusText = 'Waiting for driver'; }
                 
                    historyItem.innerHTML = `
                        <div class="history-locations">
                            <div><strong>From:</strong> ${ride.pickupLocation}</div>
                            <div><strong>To:</strong> ${ride.destination}</div>
                        </div>
                        <div class="history-info">
                            <div>K${ride.fare ? ride.fare.toFixed(2) : '0.00'}</div>
                            <div>${formattedDate} ${formattedTime}</div>
                            <div class="status-badge ${statusClass}">${statusText}</div>
                        </div>
                    `;
                 
                    historyList.appendChild(historyItem);
                });
            } else {
                historyList.innerHTML = '<p style="text-align: center; padding: 16px; color: var(--medium-gray);">No ride history.</p>';
            }
        });
    }
}

function getStatusText(status) {
    const statusMap = {
        'requested': 'Waiting for driver', 'accepted': 'In Progress', 'completed': 'Completed',
        'paid': 'Completed', 'cancelled': 'Cancelled', 'arrived': 'Driver Arrived',
        'picked_up': 'Picked Up', 'started': 'Trip Started'
    };
    return statusMap[status] || status;
}

function showRideDetailsPopup(rideId) {
    database.ref('rides/' + rideId).once('value').then(snapshot => {
        const ride = snapshot.val();
        if (ride) {
            document.getElementById('popupRidePickup').textContent = ride.pickupLocation;
            document.getElementById('popupRideDestination').textContent = ride.destination;
            document.getElementById('popupRideFare').textContent = `K${ride.fare ? ride.fare.toFixed(2) : '0.00'}`;
            document.getElementById('popupRideDistance').textContent = ride.distance || 'Calculating...';
            document.getElementById('popupRideStatus').textContent = getStatusText(ride.status);
            document.getElementById('popupRideType').textContent = ride.rideType ? ride.rideType.charAt(0).toUpperCase() + ride.rideType.slice(1) : 'Standard';
         
            const date = new Date(ride.timestamp);
            document.getElementById('popupRideDate').textContent = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
         
            updatePopupRideMap(ride);
         
            if (ride.driverId) {
                database.ref('users/' + ride.driverId).once('value').then(driverSnapshot => {
                    const driver = driverSnapshot.val();
                    if (driver) {
                        document.getElementById('popupDriverName').textContent = driver.name || 'Driver';
                        document.getElementById('popupDriverPhone').textContent = driver.phone || 'N/A';
                        document.getElementById('popupDriverVehicle').textContent = `${driver.vehicleType || 'Car'} (${driver.licensePlate || 'N/A'})`;
                        document.getElementById('popupDriverRating').textContent = driver.rating || '4.5';
                     
                        updateDriverProgress(ride.status);
                     
                        document.getElementById('popupDriverDetails').classList.remove('hidden');
                    }
                });
            } else {
                document.getElementById('popupDriverDetails').classList.add('hidden');
            }
         
            document.getElementById('rideDetailsPopup').classList.remove('hidden');
        }
    }).catch(() => showNotification('Error loading details.'));
}

function updateDriverProgress(status) {
    const progressElement = document.getElementById('popupDriverProgress');
    const progressMap = {
        'requested': 'Waiting for driver', 'accepted': 'Driver en route', 'arrived': 'At pickup',
        'picked_up': 'Passenger picked up', 'started': 'In progress', 'completed': 'Completed', 'paid': 'Paid'
    };
    progressElement.textContent = progressMap[status] || status;
}

function updatePopupRideMap(ride) {
    popupRideMap.eachLayer(layer => { if (layer instanceof L.Marker || layer instanceof L.Polyline) popupRideMap.removeLayer(layer); });
 
    L.marker([ride.pickupLat, ride.pickupLng], { icon: L.divIcon({ className: 'customer-marker', html: '📍<div class="marker-label">Pickup</div>', iconSize: [30, 40] }) }).addTo(popupRideMap).bindPopup('Pickup');
    L.marker([ride.destLat, ride.destLng], { icon: L.divIcon({ className: 'destination-marker', html: '🏁<div class="marker-label">Destination</div>', iconSize: [30, 40] }) }).addTo(popupRideMap).bindPopup('Destination');
 
    drawRouteOnPopupMap(ride.pickupLat, ride.pickupLng, ride.destLat, ride.destLng);
 
    const bounds = L.latLngBounds([ride.pickupLat, ride.pickupLng], [ride.destLat, ride.destLng]);
    popupRideMap.fitBounds(bounds, { padding: [20, 20] });
}

function drawRouteOnPopupMap(startLat, startLng, endLat, endLng) {
    fetch(`https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`)
        .then(response => response.json())
        .then(data => {
            if (data.routes && data.routes.length > 0) {
                const coords = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
                L.polyline(coords, { color: '#FF6B35', weight: 4, opacity: 0.8 }).addTo(popupRideMap);
            }
        })
        .catch(() => L.polyline([[startLat, startLng], [endLat, endLng]], { color: '#FF6B35', weight: 4, opacity: 0.8 }).addTo(popupRideMap));
}

function closeRideDetailsPopup() {
    document.getElementById('rideDetailsPopup').classList.add('hidden');
}

function checkActiveRides() {
    if (currentUser) {
        database.ref('rides').orderByChild('passengerId').equalTo(currentUser.uid).once('value').then(snapshot => {
            const rides = snapshot.val();
            if (rides) {
                const activeRides = Object.keys(rides).filter(rideId => {
                    const ride = rides[rideId];
                    return ['accepted', 'arrived', 'picked_up', 'started'].includes(ride.status);
                });
             
                if (activeRides.length > 0) {
                    const activeRideId = activeRides[0];
                    const activeRide = rides[activeRideId];
                    currentRide = { id: activeRideId, ...activeRide };
                    setupActiveRide(activeRide);
                }
            }
        });
    }
}

function setupActiveRide(ride) {
    document.getElementById('activePickupAddress').textContent = ride.pickupLocation;
    document.getElementById('activeDestinationAddress').textContent = ride.destination;
    document.getElementById('currentFare').textContent = `K${ride.fare ? ride.fare.toFixed(2) : '0.00'}`;
 
    if (ride.driverId) {
        database.ref('users/' + ride.driverId).once('value').then(driverSnapshot => {
            const driver = driverSnapshot.val();
            if (driver) {
                document.getElementById('activeDriverName').textContent = driver.name || 'Driver';
                document.getElementById('activeDriverPhone').textContent = `Phone: ${driver.phone || 'N/A'}`;
                document.getElementById('activeDriverVehicle').textContent = `Vehicle: ${driver.vehicleType || 'N/A'} (${driver.licensePlate || 'N/A'})`;
                document.getElementById('activeDriverRating').textContent = `Rating: ${driver.rating || '4.5'} ★`;
            }
        });
     
        trackDriverLocation(ride.driverId, ride.id);
    }
 
    setupActiveRideMap(ride);
    switchTab('duringRideScreen');
 
    if (activeRideListener) activeRideListener();
 
    activeRideListener = database.ref('rides/' + ride.id).on('value', snapshot => {
        const updatedRide = snapshot.val();
        if (updatedRide) {
            currentRide = { id: ride.id, ...updatedRide };
         
            if (updatedRide.status === 'completed') showRideCompletion(updatedRide);
            else if (updatedRide.status === 'cancelled') handleRideCancellation(updatedRide);
        }
    });
}

function loadSettings() {
    const rideNotifications = localStorage.getItem('rideNotifications') !== 'false';
    const promoNotifications = localStorage.getItem('promoNotifications') === 'true';
    const language = localStorage.getItem('language') || 'en';
    const darkMode = localStorage.getItem('darkMode') === 'true';
 
    document.getElementById('rideNotifications').checked = rideNotifications;
    document.getElementById('promoNotifications').checked = promoNotifications;
    document.getElementById('languageSelect').value = language;
    document.getElementById('darkModeToggle').checked = darkMode;
 
    if (darkMode) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
}

function initializeAppSettings() {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    if (darkMode) {
        document.body.classList.add('dark-mode');
        document.getElementById('darkModeToggle').checked = true;
    }
 
    const language = localStorage.getItem('language') || 'en';
    document.getElementById('languageSelect').value = language;
 
    const rideNotifications = localStorage.getItem('rideNotifications') !== 'false';
    const promoNotifications = localStorage.getItem('promoNotifications') === 'true';
 
    document.getElementById('rideNotifications').checked = rideNotifications;
    document.getElementById('promoNotifications').checked = promoNotifications;
}

function toggleDarkMode() {
    const darkMode = document.getElementById('darkModeToggle').checked;
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('darkMode', darkMode);
}

function logout() {
    if (confirm('Logout?')) {
        if (driverAssignmentListener) driverAssignmentListener();
        if (rideHistoryListener) rideHistoryListener();
        if (activeRideListener) activeRideListener();
     
        auth.signOut().then(() => {
            currentUser = null;
            userFullName = "Passenger";
            localStorage.removeItem('userAuthenticated');
            localStorage.removeItem('profileCompleted');
            showAuthScreen();
            showNotification('Logged out.');
        }).catch(() => showNotification('Error logging out.'));
    }
}

function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.style.display = 'block';
    setTimeout(() => notification.style.display = 'none', 3000);
}

// Offline/online
window.addEventListener('online', () => showNotification('Connection restored.'));
window.addEventListener('offline', () => showNotification('Offline. Some features limited.'));
