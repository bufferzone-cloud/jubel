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
let routePolyline = null;
let driverAssignmentListener = null;
let nearbyPlacesMarkers = [];
let destinationSearchResults = [];
let selectedDestination = null;
let rideHistoryListener = null;
let activeRideListener = null;
let userFullName = "Passenger";
let walletBalance = 0;
let userStats = {
    completed: 0,
    cancelled: 0,
    pending: 0
};

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeAuth();
    setupEventListeners();
    checkOnboardingStatus();
});

// Check onboarding status
function checkOnboardingStatus() {
    const onboardingCompleted = localStorage.getItem('onboardingCompleted');
    const userAuthenticated = localStorage.getItem('userAuthenticated');
    const profileCompleted = localStorage.getItem('profileCompleted');
    
    if (!onboardingCompleted) {
        showScreen('onboardingScreen');
    } else if (!userAuthenticated) {
        showScreen('authScreen');
    } else if (!profileCompleted) {
        showScreen('profileSetupScreen');
    } else {
        loadUserData();
        showScreen('mainApp');
    }
}

// Show specific screen
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Authentication functions
function initializeAuth() {
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            checkUserType(user.uid).then(isDriver => {
                if (isDriver) {
                    showNotification('Driver accounts cannot log in to passenger app');
                    auth.signOut();
                    return;
                }
                loadUserData();
            });
        }
    });
}

// Check if user is a driver
async function checkUserType(uid) {
    try {
        const snapshot = await database.ref('users/' + uid).once('value');
        const userData = snapshot.val();
        return userData && userData.userType === 'driver';
    } catch (error) {
        console.error('Error checking user type:', error);
        return false;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Onboarding
    document.getElementById('getStartedBtn').addEventListener('click', function() {
        localStorage.setItem('onboardingCompleted', 'true');
        showScreen('authScreen');
    });
    
    // Auth navigation
    document.getElementById('backToOnboarding').addEventListener('click', function() {
        showScreen('onboardingScreen');
    });
    
    document.getElementById('backToAuth').addEventListener('click', function() {
        showScreen('authScreen');
    });
    
    // Auth tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabType = this.getAttribute('data-tab');
            switchAuthTab(tabType);
        });
    });
    
    // Auth switch
    document.getElementById('switchAuth').addEventListener('click', function() {
        const currentTab = document.querySelector('.auth-tab.active').getAttribute('data-tab');
        const newTab = currentTab === 'login' ? 'signup' : 'login';
        switchAuthTab(newTab);
    });
    
    // Auth forms
    document.getElementById('loginForm').addEventListener('submit', loginUser);
    document.getElementById('signupForm').addEventListener('submit', signupUser);
    document.getElementById('profileForm').addEventListener('submit', completeProfile);
    
    // Main app navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const screenId = this.getAttribute('data-screen');
            switchMainScreen(screenId);
        });
    });
    
    // Ride options
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
    
    // Payment options
    document.querySelectorAll('.payment-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.payment-option').forEach(opt => {
                opt.classList.remove('active');
            });
            this.classList.add('active');
            paymentMethod = this.getAttribute('data-method');
        });
    });
    
    // Ride actions
    document.getElementById('requestRideBtn').addEventListener('click', requestRide);
    document.getElementById('cancelRideBtn').addEventListener('click', cancelRide);
    document.getElementById('contactDriverBtn').addEventListener('click', contactDriver);
    document.getElementById('addStopBtn').addEventListener('click', addStop);
    document.getElementById('shareRideBtn').addEventListener('click', shareRide);
    
    // Account actions
    document.getElementById('depositBtn').addEventListener('click', depositToWallet);
    document.getElementById('withdrawBtn').addEventListener('click', withdrawFromWallet);
    document.getElementById('shareReferralBtn').addEventListener('click', shareReferralCode);
    
    // Ride completion
    document.getElementById('completePaymentBtn').addEventListener('click', completePayment);
    document.getElementById('closeModal').addEventListener('click', closeModal);
    
    // Rating stars
    document.querySelectorAll('.star').forEach(star => {
        star.addEventListener('click', function() {
            const rating = parseInt(this.getAttribute('data-rating'));
            setRating(rating);
        });
    });
    
    // Saved locations
    document.querySelectorAll('.saved-location-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const locationType = this.getAttribute('data-type');
            useSavedLocation(locationType);
        });
    });
    
    // Destination input
    document.getElementById('destination').addEventListener('input', function() {
        const query = this.value;
        updateFareEstimate();
        if (query.length >= 2) {
            searchPlaces(query);
        } else {
            hideDestinationSuggestions();
        }
    });
    
    // Click outside to hide suggestions
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.input-group') && !e.target.closest('.suggestion-list')) {
            hideAllSuggestions();
        }
    });
    
    // History filter
    document.getElementById('historyFilter').addEventListener('change', loadRideHistory);
}

// Switch auth tab
function switchAuthTab(tabType) {
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`.auth-tab[data-tab="${tabType}"]`).classList.add('active');
    
    document.getElementById('loginForm').classList.toggle('hidden', tabType !== 'login');
    document.getElementById('signupForm').classList.toggle('hidden', tabType !== 'signup');
    
    const switchText = document.getElementById('authSwitchText');
    const switchLink = document.getElementById('switchAuth');
    
    if (tabType === 'login') {
        switchText.innerHTML = 'Don\'t have an account? <span class="auth-link" id="switchAuth">Sign Up</span>';
        document.getElementById('switchAuth').addEventListener('click', function() {
            switchAuthTab('signup');
        });
    } else {
        switchText.innerHTML = 'Already have an account? <span class="auth-link" id="switchAuth">Log In</span>';
        document.getElementById('switchAuth').addEventListener('click', function() {
            switchAuthTab('login');
        });
    }
}

// Login user
function loginUser(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showNotification('Please enter both email and password.');
        return;
    }
    
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            return checkUserType(userCredential.user.uid);
        })
        .then(isDriver => {
            if (isDriver) {
                showNotification('Driver accounts cannot log in to passenger app. Please use the driver app.');
                return auth.signOut();
            }
            localStorage.setItem('userAuthenticated', 'true');
            checkOnboardingStatus();
            showNotification('Login successful!');
        })
        .catch((error) => {
            console.error('Login error:', error);
            showNotification('Login failed: ' + error.message);
        });
}

// Signup user
function signupUser(e) {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    const name = document.getElementById('signupName').value;
    const phone = document.getElementById('signupPhone').value;
    
    if (!email || !password || !name || !phone) {
        showNotification('Please fill in all required fields.');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('Passwords do not match.');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters long.');
        return;
    }
    
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            
            // Save basic user data
            return database.ref('users/' + user.uid).set({
                name: name,
                email: email,
                phone: phone,
                userType: 'passenger',
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                walletBalance: 0
            });
        })
        .then(() => {
            localStorage.setItem('userAuthenticated', 'true');
            showScreen('profileSetupScreen');
            showNotification('Account created successfully!');
        })
        .catch((error) => {
            console.error('Signup error:', error);
            showNotification('Signup failed: ' + error.message);
        });
}

// Complete profile
function completeProfile(e) {
    e.preventDefault();
    const name = document.getElementById('profileName').value;
    const phone = document.getElementById('profilePhone').value;
    const paymentPreference = document.getElementById('paymentPreference').value;
    const homeAddress = document.getElementById('homeAddress').value;
    const workAddress = document.getElementById('workAddress').value;
    
    if (!name || !phone || !paymentPreference) {
        showNotification('Please complete all required fields.');
        return;
    }
    
    if (currentUser) {
        database.ref('users/' + currentUser.uid).update({
            name: name,
            phone: phone,
            paymentPreference: paymentPreference,
            homeAddress: homeAddress,
            workAddress: workAddress,
            profileCompleted: true,
            referralCode: generateReferralCode(name)
        })
        .then(() => {
            localStorage.setItem('profileCompleted', 'true');
            userFullName = name;
            initializeMaps();
            showScreen('mainApp');
            showNotification('Profile completed successfully!');
            
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

// Generate referral code
function generateReferralCode(name) {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `JUBEL-${initials}${randomNum}`;
}

// Load user data
function loadUserData() {
    if (currentUser) {
        database.ref('users/' + currentUser.uid).once('value')
            .then(snapshot => {
                const userData = snapshot.val();
                if (userData) {
                    userFullName = userData.name || "Passenger";
                    walletBalance = userData.walletBalance || 0;
                    
                    // Update UI
                    updateUserGreeting();
                    updateAccountInfo(userData);
                    
                    if (userData.profileCompleted) {
                        initializeMaps();
                        showScreen('mainApp');
                    } else {
                        showScreen('profileSetupScreen');
                    }
                }
            });
    }
}

// Update user greeting
function updateUserGreeting() {
    const greetingElement = document.getElementById('userGreeting');
    if (userFullName && userFullName !== "Passenger") {
        greetingElement.textContent = `Hi ${userFullName.split(' ')[0]}, Where to?`;
    } else {
        greetingElement.textContent = "Hi, Where to?";
    }
}

// Update account info
function updateAccountInfo(userData) {
    document.getElementById('accountName').textContent = userData.name || 'Passenger';
    document.getElementById('accountPhone').textContent = userData.phone || 'Not set';
    document.getElementById('accountEmail').textContent = userData.email || 'Not set';
    document.getElementById('walletBalance').textContent = `K${walletBalance.toFixed(2)}`;
    document.getElementById('referralCode').textContent = userData.referralCode || 'JUBEL-XXXX';
    
    // Update avatars
    const userAvatar = document.getElementById('userAvatar');
    const accountAvatar = document.getElementById('accountAvatar');
    
    if (userData.name) {
        userAvatar.textContent = userData.name.charAt(0).toUpperCase();
        accountAvatar.textContent = userData.name.charAt(0).toUpperCase();
    }
}

// Initialize maps
function initializeMaps() {
    // Home map
    homeMap = L.map('homeMap').setView([-15.4167, 28.2833], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(homeMap);
    
    // Ride map
    rideMap = L.map('rideMap').setView([-15.4167, 28.2833], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(rideMap);
    
    // Active ride map
    activeRideMap = L.map('activeRideMap').setView([-15.4167, 28.2833], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(activeRideMap);
    
    // Get user location
    getUserLocation();
}

// Get user location
function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            userLocation = { lat, lng };
            
            // Update maps
            homeMap.setView([lat, lng], 15);
            rideMap.setView([lat, lng], 15);
            activeRideMap.setView([lat, lng], 15);
            
            // Add user marker
            userMarker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'user-marker',
                    html: '📍<div class="marker-label">You</div>',
                    iconSize: [25, 35]
                })
            }).addTo(homeMap)
                .bindPopup('Your current location')
                .openPopup();
            
            // Update pickup location
            reverseGeocode(lat, lng).then(address => {
                document.getElementById('pickupLocation').value = address;
            });
            
            // Load nearby places
            loadNearbyPlaces();
            
            // Start location tracking
            startLocationTracking();
        }, error => {
            console.error('Geolocation error:', error);
            showNotification('Unable to get your location. Please enable location services.');
        });
    }
}

// Start location tracking
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
            
            // Update marker
            if (userMarker) {
                userMarker.setLatLng([lat, lng]);
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

// Reverse geocoding
function reverseGeocode(lat, lng) {
    return new Promise(resolve => {
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

// Load nearby places
function loadNearbyPlaces() {
    if (!userLocation) return;
    
    const nearbyPlaces = document.getElementById('nearbyPlaces');
    nearbyPlaces.innerHTML = '<div class="loading-text"><i class="fas fa-spinner fa-spin"></i> Loading nearby places...</div>';
    
    // Clear existing markers
    nearbyPlacesMarkers.forEach(marker => {
        homeMap.removeLayer(marker);
    });
    nearbyPlacesMarkers = [];
    
    // Sample nearby places (in a real app, this would use a places API)
    const samplePlaces = [
        { name: 'Lusaka City Center', type: 'city_center', lat: -15.4167, lng: 28.2833 },
        { name: 'Manda Hill Mall', type: 'shopping_mall', lat: -15.4096, lng: 28.2997 },
        { name: 'East Park Mall', type: 'shopping_mall', lat: -15.3928, lng: 28.3214 },
        { name: 'University of Zambia', type: 'university', lat: -15.3875, lng: 28.3278 },
        { name: 'Lusaka Airport', type: 'airport', lat: -15.3308, lng: 28.4528 }
    ];
    
    // Calculate distances and sort
    const placesWithDistance = samplePlaces.map(place => {
        const distance = calculateDistance(
            userLocation.lat, userLocation.lng,
            place.lat, place.lng
        );
        return { ...place, distance };
    }).sort((a, b) => a.distance - b.distance);
    
    // Update UI
    nearbyPlaces.innerHTML = '';
    placesWithDistance.forEach(place => {
        const placeElement = document.createElement('div');
        placeElement.className = 'nearby-place-item';
        
        placeElement.innerHTML = `
            <div class="place-icon">${getPlaceIcon(place.type)}</div>
            <div class="place-details">
                <div class="place-name">${place.name}</div>
                <div class="place-type">${formatPlaceType(place.type)}</div>
                <div class="place-distance">${(place.distance / 1000).toFixed(1)} km away</div>
            </div>
        `;
        
        placeElement.addEventListener('click', function() {
            document.getElementById('destination').value = place.name;
            updateFareEstimate();
            updateDestinationMarker(place.lat, place.lng, place.name);
            document.getElementById('requestRideBtn').disabled = false;
        });
        
        nearbyPlaces.appendChild(placeElement);
        
        // Add marker to map
        const marker = L.marker([place.lat, place.lng], {
            icon: L.divIcon({
                className: 'place-marker',
                html: `${getPlaceIcon(place.type)}<div class="marker-label">${place.name}</div>`,
                iconSize: [25, 35]
            })
        }).addTo(homeMap)
            .bindPopup(`<strong>${place.name}</strong><br>${formatPlaceType(place.type)}`);
        
        nearbyPlacesMarkers.push(marker);
    });
}

// Get place icon
function getPlaceIcon(type) {
    const icons = {
        'city_center': '🏙️',
        'shopping_mall': '🏪',
        'university': '🎓',
        'airport': '✈️',
        'hospital': '🏥',
        'restaurant': '🍽️'
    };
    return icons[type] || '📍';
}

// Format place type
function formatPlaceType(type) {
    return type.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

// Search places
function searchPlaces(query) {
    if (!userLocation) return;
    
    const suggestionsContainer = document.getElementById('destinationSuggestions');
    suggestionsContainer.innerHTML = '<div class="suggestion-item">Searching...</div>';
    suggestionsContainer.style.display = 'block';
    
    // Simulate API call (in real app, use Google Places API or similar)
    setTimeout(() => {
        const mockResults = [
            { name: `${query} Shopping Center`, address: 'Lusaka', distance: 1500 },
            { name: `${query} Market`, address: 'Lusaka', distance: 2500 },
            { name: `${query} Hospital`, address: 'Lusaka', distance: 3500 }
        ];
        
        suggestionsContainer.innerHTML = '';
        destinationSearchResults = mockResults;
        
        mockResults.forEach((result, index) => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'suggestion-item';
            suggestionItem.textContent = `${result.name} (${(result.distance / 1000).toFixed(1)} km)`;
            
            suggestionItem.addEventListener('click', function() {
                document.getElementById('destination').value = result.name;
                suggestionsContainer.style.display = 'none';
                updateFareEstimate();
                document.getElementById('requestRideBtn').disabled = false;
            });
            
            suggestionsContainer.appendChild(suggestionItem);
        });
    }, 500);
}

// Hide suggestions
function hideDestinationSuggestions() {
    document.getElementById('destinationSuggestions').style.display = 'none';
}

function hideAllSuggestions() {
    document.querySelectorAll('.suggestion-list').forEach(list => {
        list.style.display = 'none';
    });
}

// Update destination marker
function updateDestinationMarker(lat, lng, name) {
    if (destinationMarker) {
        homeMap.removeLayer(destinationMarker);
    }
    
    destinationMarker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'destination-marker',
            html: '🏁<div class="marker-label">Destination</div>',
            iconSize: [25, 35]
        })
    }).addTo(homeMap)
        .bindPopup(`<strong>${name}</strong><br>Your destination`);
    
    // Draw route
    drawRoute(userLocation.lat, userLocation.lng, lat, lng);
}

// Draw route
function drawRoute(startLat, startLng, endLat, endLng) {
    if (routePolyline) {
        homeMap.removeLayer(routePolyline);
    }
    
    // Simple straight line for demo (in real app, use routing service)
    routePolyline = L.polyline([
        [startLat, startLng],
        [endLat, endLng]
    ], {
        color: '#FF6B35',
        weight: 4,
        opacity: 0.7,
        dashArray: '8, 8'
    }).addTo(homeMap);
    
    // Fit map to show both points
    const bounds = L.latLngBounds(
        [startLat, startLng],
        [endLat, endLng]
    );
    homeMap.fitBounds(bounds, { padding: [15, 15] });
}

// Calculate distance
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

    return R * c;
}

// Update fare estimate
function updateFareEstimate() {
    const destination = document.getElementById('destination').value;
    
    if (destination && userLocation) {
        // Simple fare calculation based on distance
        const baseFare = 15;
        const distance = calculateDistance(
            userLocation.lat, userLocation.lng,
            -15.4167, 28.2833 // Default to city center
        );
        
        let fare = baseFare + (distance / 1000) * 5; // K5 per km
        
        // Apply ride type multiplier
        switch(rideType) {
            case 'premium':
                fare *= 1.2;
                break;
            case 'bike':
                fare *= 0.7;
                break;
        }
        
        document.getElementById('estimatedFare').textContent = `K${fare.toFixed(2)}`;
        
        // Calculate ETA
        const etaMinutes = Math.max(5, Math.ceil((distance / 1000) / 0.5)); // 30 km/h average
        document.getElementById('etaDisplay').textContent = `ETA: ${etaMinutes} min`;
        
        document.getElementById('requestRideBtn').disabled = false;
    } else {
        document.getElementById('estimatedFare').textContent = 'K0.00';
        document.getElementById('etaDisplay').textContent = 'ETA: -- min';
        document.getElementById('requestRideBtn').disabled = true;
    }
}

// Switch main screen
function switchMainScreen(screenId) {
    document.querySelectorAll('.screen-content').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`.nav-item[data-screen="${screenId}"]`).classList.add('active');
    
    // Load data for specific screens
    if (screenId === 'historyScreen') {
        loadRideHistory();
    } else if (screenId === 'accountScreen') {
        loadAccountData();
    }
}

// Use saved location
function useSavedLocation(locationType) {
    if (currentUser) {
        database.ref('users/' + currentUser.uid).once('value')
            .then(snapshot => {
                const userData = snapshot.val();
                const address = userData ? userData[locationType + 'Address'] : null;
                
                if (address) {
                    document.getElementById('destination').value = address;
                    updateFareEstimate();
                    showNotification(`${locationType.charAt(0).toUpperCase() + locationType.slice(1)} address set as destination.`);
                    document.getElementById('requestRideBtn').disabled = false;
                } else {
                    showNotification(`No ${locationType} address saved. Please add it in your profile.`);
                }
            });
    }
}

// Request ride
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
    
    // Calculate fare
    const estimatedFare = parseFloat(document.getElementById('estimatedFare').textContent.replace('K', ''));
    
    // Create ride request
    const rideId = database.ref().child('rides').push().key;
    const rideData = {
        id: rideId,
        passengerId: currentUser.uid,
        passengerName: userFullName,
        passengerPhone: getUserPhone(),
        pickupLocation: pickup,
        destination: destination,
        pickupLat: userLocation.lat,
        pickupLng: userLocation.lng,
        destLat: -15.4167, // Default to city center
        destLng: 28.2833,
        rideType: rideType,
        fare: estimatedFare,
        status: 'requested',
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    database.ref('rides/' + rideId).set(rideData)
        .then(() => {
            currentRide = rideData;
            
            // Update UI
            document.getElementById('pickupAddress').textContent = pickup;
            document.getElementById('destinationAddress').textContent = destination;
            document.getElementById('rideFare').textContent = `K${estimatedFare.toFixed(2)}`;
            
            // Update active ride screen
            document.getElementById('activePickupAddress').textContent = pickup;
            document.getElementById('activeDestinationAddress').textContent = destination;
            document.getElementById('currentFare').textContent = `K${estimatedFare.toFixed(2)}`;
            
            // Switch to ride request screen
            switchMainScreen('rideRequestScreen');
            
            // Setup ride map
            setupRideMap();
            
            // Listen for driver assignment
            listenForDriverAssignment(rideId);
            
            showNotification('Ride request submitted! Finding a driver...');
        })
        .catch(error => {
            console.error('Error requesting ride:', error);
            showNotification('Error requesting ride. Please try again.');
        });
}

// Get user phone
function getUserPhone() {
    if (currentUser) {
        const accountPhone = document.getElementById('accountPhone').textContent;
        return accountPhone !== 'Not set' ? accountPhone : 'Not provided';
    }
    return 'Not provided';
}

// Setup ride map
function setupRideMap() {
    rideMap.eachLayer(layer => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
            rideMap.removeLayer(layer);
        }
    });
    
    // Add pickup marker
    L.marker([userLocation.lat, userLocation.lng], {
        icon: L.divIcon({
            className: 'pickup-marker',
            html: '📍<div class="marker-label">Pickup</div>',
            iconSize: [25, 35]
        })
    }).addTo(rideMap);
    
    // Add destination marker
    L.marker([-15.4167, 28.2833], {
        icon: L.divIcon({
            className: 'destination-marker',
            html: '🏁<div class="marker-label">Destination</div>',
            iconSize: [25, 35]
        })
    }).addTo(rideMap);
    
    // Draw route
    L.polyline([
        [userLocation.lat, userLocation.lng],
        [-15.4167, 28.2833]
    ], {
        color: '#FF6B35',
        weight: 4,
        opacity: 0.7
    }).addTo(rideMap);
    
    // Fit map
    const bounds = L.latLngBounds(
        [userLocation.lat, userLocation.lng],
        [-15.4167, 28.2833]
    );
    rideMap.fitBounds(bounds, { padding: [15, 15] });
}

// Listen for driver assignment
function listenForDriverAssignment(rideId) {
    if (driverAssignmentListener) {
        driverAssignmentListener();
    }
    
    driverAssignmentListener = database.ref('rides/' + rideId).on('value', snapshot => {
        const ride = snapshot.val();
        if (!ride) return;
        
        if (ride.driverId && ride.status === 'accepted') {
            handleDriverAssignment(ride);
        } else if (ride.status === 'completed') {
            showRideCompletion(ride);
        } else if (ride.status === 'cancelled') {
            handleRideCancellation();
        }
    });
}

// Handle driver assignment
function handleDriverAssignment(ride) {
    // Show driver info
    document.querySelector('.loading-section').classList.add('hidden');
    document.getElementById('driverAssignment').classList.remove('hidden');
    
    // Get driver details
    database.ref('users/' + ride.driverId).once('value')
        .then(driverSnapshot => {
            const driver = driverSnapshot.val();
            if (driver) {
                document.getElementById('driverName').textContent = driver.name;
                document.getElementById('driverVehicle').textContent = `${driver.vehicle?.type || 'Car'} - ${driver.vehicle?.licensePlate || 'N/A'}`;
                document.getElementById('driverRating').textContent = driver.rating || '4.8 ★';
                
                // Update active ride screen
                document.getElementById('activeDriverName').textContent = driver.name;
                document.getElementById('activeDriverVehicle').textContent = `${driver.vehicle?.type || 'Car'} - ${driver.vehicle?.licensePlate || 'N/A'}`;
                document.getElementById('activeDriverRating').textContent = driver.rating || '4.8 ★';
                
                showNotification(`Driver ${driver.name} is on the way!`);
                
                // Switch to active ride screen after delay
                setTimeout(() => {
                    switchMainScreen('activeRideScreen');
                    setupActiveRideMap();
                }, 3000);
            }
        });
}

// Handle ride cancellation
function handleRideCancellation() {
    showNotification('Ride has been cancelled.');
    switchMainScreen('homeScreen');
    currentRide = null;
    
    if (driverAssignmentListener) {
        driverAssignmentListener();
        driverAssignmentListener = null;
    }
}

// Setup active ride map
function setupActiveRideMap() {
    activeRideMap.eachLayer(layer => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
            activeRideMap.removeLayer(layer);
        }
    });
    
    // Add markers and route (similar to ride map)
    L.marker([userLocation.lat, userLocation.lng], {
        icon: L.divIcon({
            className: 'pickup-marker',
            html: '📍<div class="marker-label">Pickup</div>',
            iconSize: [25, 35]
        })
    }).addTo(activeRideMap);
    
    L.marker([-15.4167, 28.2833], {
        icon: L.divIcon({
            className: 'destination-marker',
            html: '🏁<div class="marker-label">Destination</div>',
            iconSize: [25, 35]
        })
    }).addTo(activeRideMap);
    
    L.polyline([
        [userLocation.lat, userLocation.lng],
        [-15.4167, 28.2833]
    ], {
        color: '#FF6B35',
        weight: 4,
        opacity: 0.7
    }).addTo(activeRideMap);
    
    const bounds = L.latLngBounds(
        [userLocation.lat, userLocation.lng],
        [-15.4167, 28.2833]
    );
    activeRideMap.fitBounds(bounds, { padding: [15, 15] });
}

// Cancel ride
function cancelRide() {
    if (currentRide && confirm('Are you sure you want to cancel this ride?')) {
        database.ref('rides/' + currentRide.id).update({
            status: 'cancelled',
            cancelledAt: firebase.database.ServerValue.TIMESTAMP
        })
        .then(() => {
            showNotification('Ride cancelled successfully.');
            switchMainScreen('homeScreen');
            currentRide = null;
            
            if (driverAssignmentListener) {
                driverAssignmentListener();
                driverAssignmentListener = null;
            }
        })
        .catch(error => {
            console.error('Error cancelling ride:', error);
            showNotification('Error cancelling ride. Please try again.');
        });
    }
}

// Contact driver
function contactDriver() {
    if (currentRide && currentRide.driverId) {
        database.ref('users/' + currentRide.driverId).once('value')
            .then(snapshot => {
                const driver = snapshot.val();
                if (driver && driver.phone) {
                    showNotification(`Calling driver: ${driver.phone}`);
                    // In real app: window.open(`tel:${driver.phone}`, '_self');
                } else {
                    showNotification('Driver phone number not available.');
                }
            });
    }
}

// Add stop
function addStop() {
    const stopAddress = prompt('Enter stop address:');
    if (stopAddress) {
        showNotification(`Stop added: ${stopAddress}`);
    }
}

// Share ride
function shareRide() {
    if (currentRide) {
        const shareText = `I'm taking a Jubel ride from ${currentRide.pickupLocation} to ${currentRide.destination}`;
        navigator.clipboard.writeText(shareText)
            .then(() => showNotification('Ride details copied to clipboard!'));
    }
}

// Show ride completion
function showRideCompletion(ride) {
    document.getElementById('finalFare').textContent = `K${ride.fare.toFixed(2)}`;
    document.getElementById('rideCompletionModal').classList.remove('hidden');
    
    // Clean up
    if (driverAssignmentListener) {
        driverAssignmentListener();
        driverAssignmentListener = null;
    }
}

// Close modal
function closeModal() {
    document.getElementById('rideCompletionModal').classList.add('hidden');
    switchMainScreen('homeScreen');
    currentRide = null;
    
    // Reset form
    document.getElementById('destination').value = '';
    document.getElementById('tipAmount').value = '';
    document.getElementById('driverReview').value = '';
    setRating(0);
    
    // Clear map
    if (routePolyline) {
        homeMap.removeLayer(routePolyline);
        routePolyline = null;
    }
    if (destinationMarker) {
        homeMap.removeLayer(destinationMarker);
        destinationMarker = null;
    }
}

// Set rating
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
        
        database.ref('rides/' + currentRide.id).update({
            status: 'paid',
            tip: tipAmount,
            totalAmount: totalAmount,
            rating: userRating,
            review: review,
            paymentMethod: paymentMethod,
            paymentTimestamp: firebase.database.ServerValue.TIMESTAMP
        })
        .then(() => {
            showNotification(`Payment of K${totalAmount.toFixed(2)} completed. Thank you!`);
            closeModal();
            updateUserStats();
        })
        .catch(error => {
            console.error('Error completing payment:', error);
            showNotification('Error completing payment. Please try again.');
        });
    }
}

// Load ride history
function loadRideHistory() {
    if (currentUser) {
        const filter = document.getElementById('historyFilter').value;
        
        if (rideHistoryListener) {
            rideHistoryListener();
        }
        
        rideHistoryListener = database.ref('rides').orderByChild('passengerId').equalTo(currentUser.uid).on('value', snapshot => {
            const historyList = document.getElementById('historyList');
            historyList.innerHTML = '';
            
            const rides = snapshot.val();
            if (rides) {
                let ridesArray = Object.keys(rides).map(rideId => ({
                    id: rideId,
                    ...rides[rideId]
                }));
                
                // Apply filter
                if (filter !== 'all') {
                    ridesArray = ridesArray.filter(ride => {
                        if (filter === 'active') {
                            return ride.status === 'accepted' || ride.status === 'started';
                        }
                        return ride.status === filter;
                    });
                }
                
                // Sort by timestamp
                ridesArray.sort((a, b) => b.timestamp - a.timestamp);
                
                if (ridesArray.length === 0) {
                    historyList.innerHTML = '<div class="loading-text">No rides found</div>';
                    return;
                }
                
                ridesArray.forEach(ride => {
                    const historyItem = document.createElement('div');
                    historyItem.className = 'history-item';
                    
                    const date = new Date(ride.timestamp);
                    const formattedDate = date.toLocaleDateString();
                    const formattedTime = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    
                    let statusClass = 'status-active';
                    let statusText = 'Active';
                    
                    if (ride.status === 'completed' || ride.status === 'paid') {
                        statusClass = 'status-completed';
                        statusText = 'Completed';
                    } else if (ride.status === 'cancelled') {
                        statusClass = 'status-cancelled';
                        statusText = 'Cancelled';
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
                            <div class="history-status ${statusClass}">${statusText}</div>
                        </div>
                    `;
                    
                    historyList.appendChild(historyItem);
                });
            } else {
                historyList.innerHTML = '<div class="loading-text">No ride history found</div>';
            }
        });
    }
}

// Load account data
function loadAccountData() {
    if (currentUser) {
        database.ref('users/' + currentUser.uid).once('value')
            .then(snapshot => {
                const userData = snapshot.val();
                if (userData) {
                    document.getElementById('walletBalance').textContent = `K${userData.walletBalance.toFixed(2)}`;
                    document.getElementById('referralCode').textContent = userData.referralCode || 'JUBEL-XXXX';
                }
            });
        
        updateUserStats();
    }
}

// Update user stats
function updateUserStats() {
    if (!currentUser) return;
    
    database.ref('rides').orderByChild('passengerId').equalTo(currentUser.uid).once('value')
        .then(snapshot => {
            const rides = snapshot.val();
            if (rides) {
                const ridesArray = Object.values(rides);
                
                userStats = {
                    completed: ridesArray.filter(ride => ride.status === 'completed' || ride.status === 'paid').length,
                    cancelled: ridesArray.filter(ride => ride.status === 'cancelled').length,
                    pending: ridesArray.filter(ride => ride.status === 'requested' || ride.status === 'accepted').length
                };
                
                document.getElementById('ridesCompleted').textContent = userStats.completed;
                document.getElementById('ridesCancelled').textContent = userStats.cancelled;
                document.getElementById('ridesPending').textContent = userStats.pending;
            }
        });
}

// Deposit to wallet
function depositToWallet() {
    const amount = prompt('Enter deposit amount (K):');
    if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
        const depositAmount = parseFloat(amount);
        const newBalance = walletBalance + depositAmount;
        
        database.ref('users/' + currentUser.uid).update({
            walletBalance: newBalance
        })
        .then(() => {
            walletBalance = newBalance;
            document.getElementById('walletBalance').textContent = `K${walletBalance.toFixed(2)}`;
            showNotification(`Successfully deposited K${depositAmount.toFixed(2)}`);
        })
        .catch(error => {
            console.error('Error depositing:', error);
            showNotification('Error processing deposit. Please try again.');
        });
    }
}

// Withdraw from wallet
function withdrawFromWallet() {
    if (walletBalance <= 0) {
        showNotification('Your wallet balance is zero.');
        return;
    }
    
    const amount = prompt(`Enter withdrawal amount (K). Available: K${walletBalance.toFixed(2)}:`);
    if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
        const withdrawalAmount = parseFloat(amount);
        
        if (withdrawalAmount > walletBalance) {
            showNotification('Insufficient balance.');
            return;
        }
        
        const newBalance = walletBalance - withdrawalAmount;
        
        database.ref('users/' + currentUser.uid).update({
            walletBalance: newBalance
        })
        .then(() => {
            walletBalance = newBalance;
            document.getElementById('walletBalance').textContent = `K${walletBalance.toFixed(2)}`;
            showNotification(`Withdrawal of K${withdrawalAmount.toFixed(2)} processed.`);
        })
        .catch(error => {
            console.error('Error withdrawing:', error);
            showNotification('Error processing withdrawal. Please try again.');
        });
    }
}

// Share referral code
function shareReferralCode() {
    const referralCode = document.getElementById('referralCode').textContent;
    const shareText = `Join me on Jubel! Use my code ${referralCode} for 20% off your first ride.`;
    
    navigator.clipboard.writeText(shareText)
        .then(() => showNotification('Referral code copied to clipboard!'));
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
    showNotification('You are offline. Some features may not work.');
});
