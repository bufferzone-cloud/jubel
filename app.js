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
let onboardingStep = 0;
let userRating = 0;
let driverLocationInterval = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeAuth();
    initializeMaps();
    setupEventListeners();
    checkOnboardingStatus();
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
}

// Authentication functions
function initializeAuth() {
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            document.getElementById('userIcon').textContent = user.displayName ? user.displayName.charAt(0).toUpperCase() : 'P';
            loadUserData();
        } else {
            // Check if we need to show auth screen
            const userAuthenticated = localStorage.getItem('userAuthenticated');
            if (!userAuthenticated) {
                showAuthScreen();
            }
        }
    });
}

// Map initialization
function initializeMaps() {
    // Home map
    homeMap = L.map('homeMap').setView([-15.4167, 28.2833], 13); // Default to Lusaka
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
    
    // Get user's current location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            // Update all maps with current location
            homeMap.setView([lat, lng], 15);
            rideMap.setView([lat, lng], 15);
            activeRideMap.setView([lat, lng], 15);
            
            // Add marker for current location
            L.marker([lat, lng]).addTo(homeMap)
                .bindPopup('Your location')
                .openPopup();
                
            // Update pickup location field
            reverseGeocode(lat, lng).then(address => {
                document.getElementById('pickupLocation').value = address;
            });
            
            // Save user location to Firebase
            if (currentUser) {
                database.ref('users/' + currentUser.uid + '/location').set({
                    latitude: lat,
                    longitude: lng,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                });
            }
        }, error => {
            console.error('Geolocation error:', error);
            showNotification('Unable to get your location. Please enable location services.');
        });
    }
}

// Reverse geocoding function
function reverseGeocode(lat, lng) {
    return new Promise(resolve => {
        // Using OpenStreetMap Nominatim API for reverse geocoding
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
                console.error('Reverse geocoding error:', error);
                resolve(`Near ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            });
    });
}

// Event listeners setup
function setupEventListeners() {
    // Onboarding
    document.getElementById('getStartedBtn').addEventListener('click', function() {
        localStorage.setItem('onboardingCompleted', 'true');
        showAuthScreen();
    });
    
    document.getElementById('loginBtn').addEventListener('click', login);
    document.getElementById('signupBtn').addEventListener('click', signup);
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
    
    // Cancel ride button
    document.getElementById('cancelRideBtn').addEventListener('click', cancelRide);
    
    // Contact driver button
    document.getElementById('contactDriverBtn').addEventListener('click', contactDriver);
    
    // Share ride button
    document.getElementById('shareRideBtn').addEventListener('click', shareRide);
    
    // Complete payment button
    document.getElementById('completePaymentBtn').addEventListener('click', completePayment);
    
    // Save profile button
    document.getElementById('saveProfileBtn').addEventListener('click', saveProfile);
    
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Destination input for fare estimation and suggestions
    document.getElementById('destination').addEventListener('input', function() {
        updateFareEstimate();
        showDestinationSuggestions(this.value);
    });
    
    // Star rating
    document.querySelectorAll('.star').forEach(star => {
        star.addEventListener('click', function() {
            const rating = parseInt(this.getAttribute('data-rating'));
            setRating(rating);
        });
    });
    
    // Saved locations
    document.querySelectorAll('.saved-location').forEach(location => {
        location.addEventListener('click', function() {
            const locationName = this.getAttribute('data-location');
            setSavedLocation(locationName);
        });
    });
}

// Login function
function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showNotification('Please enter both email and password.');
        return;
    }
    
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            currentUser = userCredential.user;
            localStorage.setItem('userAuthenticated', 'true');
            
            // Check if profile is completed
            database.ref('users/' + currentUser.uid).once('value')
                .then(snapshot => {
                    const userData = snapshot.val();
                    if (userData && userData.name) {
                        localStorage.setItem('profileCompleted', 'true');
                        showMainApp();
                    } else {
                        showProfileSetupScreen();
                    }
                });
            
            showNotification('Login successful.');
        })
        .catch(error => {
            console.error('Login error:', error);
            showNotification('Login failed. Please check your credentials.');
        });
}

// Signup function
function signup() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showNotification('Please enter both email and password.');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters.');
        return;
    }
    
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            currentUser = userCredential.user;
            localStorage.setItem('userAuthenticated', 'true');
            showProfileSetupScreen();
            showNotification('Account created successfully.');
        })
        .catch(error => {
            console.error('Signup error:', error);
            showNotification('Signup failed. Please try again.');
        });
}

// Complete profile setup
function completeProfile() {
    const name = document.getElementById('profileName').value;
    const phone = document.getElementById('profilePhone').value;
    const paymentPreference = document.getElementById('paymentPreference').value;
    
    if (!name || !phone) {
        showNotification('Please complete all required fields.');
        return;
    }
    
    if (currentUser) {
        database.ref('users/' + currentUser.uid).update({
            name: name,
            phone: phone,
            email: currentUser.email,
            paymentPreference: paymentPreference
        })
        .then(() => {
            localStorage.setItem('profileCompleted', 'true');
            showMainApp();
            showNotification('Profile completed successfully.');
        })
        .catch(error => {
            console.error('Error saving profile:', error);
            showNotification('Error saving profile. Please try again.');
        });
    }
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
    }
}

// Show destination suggestions
function showDestinationSuggestions(query) {
    const suggestionsContainer = document.getElementById('destinationSuggestions');
    
    if (query.length < 2) {
        suggestionsContainer.style.display = 'none';
        return;
    }
    
    // Using OpenStreetMap Nominatim API for search suggestions
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=5&countrycodes=zm`)
        .then(response => response.json())
        .then(data => {
            suggestionsContainer.innerHTML = '';
            
            if (data && data.length > 0) {
                data.forEach(place => {
                    const suggestionItem = document.createElement('div');
                    suggestionItem.className = 'suggestion-item';
                    suggestionItem.textContent = place.display_name;
                    suggestionItem.addEventListener('click', function() {
                        document.getElementById('destination').value = place.display_name;
                        suggestionsContainer.style.display = 'none';
                        updateFareEstimate();
                    });
                    suggestionsContainer.appendChild(suggestionItem);
                });
                suggestionsContainer.style.display = 'block';
            } else {
                suggestionsContainer.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Geocoding error:', error);
            suggestionsContainer.style.display = 'none';
        });
}

// Set saved location
function setSavedLocation(locationName) {
    const locations = {
        'Home': '123 Home Street, Lusaka',
        'Work': '456 Work Avenue, Lusaka',
        'University': '789 University Road, Lusaka'
    };
    
    if (locations[locationName]) {
        document.getElementById('destination').value = locations[locationName];
        updateFareEstimate();
        showNotification(`${locationName} location set.`);
    }
}

// Fare estimation
function updateFareEstimate() {
    const destination = document.getElementById('destination').value;
    
    if (destination.length > 3) {
        // In a real app, calculate fare based on distance (K1 per 90 meters)
        let baseFare = 0;
        
        switch(rideType) {
            case 'standard':
                baseFare = 15;
                break;
            case 'premium':
                baseFare = 25;
                break;
            case 'bike':
                baseFare = 10;
                break;
        }
        
        document.getElementById('estimatedFare').textContent = `K${baseFare.toFixed(2)}`;
    } else {
        document.getElementById('estimatedFare').textContent = 'K0.00';
    }
}

// Ride request
function requestRide() {
    const pickup = document.getElementById('pickupLocation').value;
    const destination = document.getElementById('destination').value;
    
    if (!pickup || !destination) {
        showNotification('Please enter both pickup and destination locations.');
        return;
    }
    
    // Calculate fare (simplified for demo)
    let fare = 0;
    switch(rideType) {
        case 'standard':
            fare = 15;
            break;
        case 'premium':
            fare = 25;
            break;
        case 'bike':
            fare = 10;
            break;
    }
    
    // Create ride request in Firebase
    const rideId = database.ref().child('rides').push().key;
    const rideData = {
        passengerId: currentUser.uid,
        passengerName: document.getElementById('userName').value || 'Passenger',
        pickupLocation: pickup,
        destination: destination,
        rideType: rideType,
        fare: fare,
        status: 'requested',
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    database.ref('rides/' + rideId).set(rideData)
        .then(() => {
            currentRide = {
                id: rideId,
                ...rideData
            };
            
            // Update UI
            document.getElementById('pickupAddress').textContent = pickup;
            document.getElementById('destinationAddress').textContent = destination;
            document.getElementById('rideFare').textContent = `K${fare.toFixed(2)}`;
            
            // Switch to ride request screen
            switchTab('rideRequestScreen');
            
            // Listen for driver assignment
            listenForDriverAssignment(rideId);
            
            showNotification('Ride requested. Looking for drivers...');
        })
        .catch(error => {
            console.error('Error requesting ride:', error);
            showNotification('Error requesting ride. Please try again.');
        });
}

// Listen for driver assignment
function listenForDriverAssignment(rideId) {
    database.ref('rides/' + rideId).on('value', snapshot => {
        const ride = snapshot.val();
        if (ride && ride.driverId) {
            // Driver assigned
            document.getElementById('assignedDriver').classList.remove('hidden');
            
            // Get driver details
            database.ref('users/' + ride.driverId).once('value')
                .then(driverSnapshot => {
                    const driver = driverSnapshot.val();
                    if (driver) {
                        document.getElementById('driverName').textContent = driver.name || 'Driver';
                        document.getElementById('driverPhone').textContent = `Phone: ${driver.phone || 'N/A'}`;
                        document.getElementById('driverVehicle').textContent = `Vehicle: ${driver.vehicle || 'N/A'}`;
                        document.getElementById('driverId').textContent = `ID: ${driver.driverId || 'N/A'}`;
                        
                        // Update active ride screen as well
                        document.getElementById('activeDriverName').textContent = driver.name || 'Driver';
                        document.getElementById('activeDriverPhone').textContent = `Phone: ${driver.phone || 'N/A'}`;
                        document.getElementById('activeDriverVehicle').textContent = `Vehicle: ${driver.vehicle || 'N/A'}`;
                        document.getElementById('activePickupAddress').textContent = ride.pickupLocation;
                        document.getElementById('activeDestinationAddress').textContent = ride.destination;
                        document.getElementById('currentFare').textContent = `K${ride.fare.toFixed(2)}`;
                        
                        showNotification(`Driver ${driver.name} assigned to your ride.`);
                        
                        // Start tracking driver location
                        trackDriverLocation(ride.driverId);
                    }
                });
        }
        
        if (ride && ride.status === 'accepted') {
            // Switch to during ride screen
            switchTab('duringRideScreen');
            showNotification('Your ride has started.');
        }
        
        if (ride && ride.status === 'completed') {
            // Show completion screen
            showRideCompletion(ride);
        }
    });
}

// Track driver location
function trackDriverLocation(driverId) {
    // Clear any existing interval
    if (driverLocationInterval) {
        clearInterval(driverLocationInterval);
    }
    
    // Set up real-time tracking every 5 seconds
    driverLocationInterval = setInterval(() => {
        database.ref('users/' + driverId + '/location').once('value')
            .then(snapshot => {
                const location = snapshot.val();
                if (location) {
                    // Update driver marker on map
                    // In a real app, you would update the map with the driver's current location
                    console.log('Driver location updated:', location);
                }
            });
    }, 5000);
}

// Cancel ride
function cancelRide() {
    if (currentRide) {
        database.ref('rides/' + currentRide.id).update({
            status: 'cancelled'
        })
        .then(() => {
            showNotification('Ride cancelled.');
            switchTab('homeScreen');
            currentRide = null;
            
            // Clear tracking interval
            if (driverLocationInterval) {
                clearInterval(driverLocationInterval);
                driverLocationInterval = null;
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
    // In a real app, this would initiate a call or in-app messaging
    showNotification('Contacting driver...');
}

// Share ride
function shareRide() {
    // In a real app, this would share ride details
    showNotification('Ride sharing activated.');
}

// Ride completion
function showRideCompletion(ride) {
    // Update final fare
    document.getElementById('finalFare').textContent = `K${ride.fare.toFixed(2)}`;
    
    // Switch to completion screen
    switchTab('rideCompletionScreen');
    showNotification('Ride completed. Please complete payment and rating.');
    
    // Clear tracking interval
    if (driverLocationInterval) {
        clearInterval(driverLocationInterval);
        driverLocationInterval = null;
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
        // Update ride with payment and rating info
        database.ref('rides/' + currentRide.id).update({
            status: 'paid',
            tip: tipAmount,
            rating: userRating,
            review: review,
            paymentMethod: paymentMethod,
            paymentTimestamp: firebase.database.ServerValue.TIMESTAMP
        })
        .then(() => {
            showNotification('Payment completed. Thank you for using Jubel!');
            switchTab('homeScreen');
            currentRide = null;
            
            // Reset form
            document.getElementById('destination').value = '';
            document.getElementById('estimatedFare').textContent = 'K0.00';
            document.getElementById('tipAmount').value = '';
            document.getElementById('driverReview').value = '';
            setRating(0);
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
                    document.getElementById('userName').value = userData.name || '';
                    document.getElementById('userPhone').value = userData.phone || '';
                    document.getElementById('userEmail').value = userData.email || '';
                    
                    // Update user icon
                    document.getElementById('userIcon').textContent = userData.name ? userData.name.charAt(0).toUpperCase() : 'P';
                }
            });
    }
}

// Save profile
function saveProfile() {
    const name = document.getElementById('userName').value;
    const phone = document.getElementById('userPhone').value;
    const email = document.getElementById('userEmail').value;
    
    if (currentUser) {
        database.ref('users/' + currentUser.uid).update({
            name: name,
            phone: phone,
            email: email
        })
        .then(() => {
            showNotification('Profile saved successfully.');
            
            // Update user icon
            document.getElementById('userIcon').textContent = name ? name.charAt(0).toUpperCase() : 'P';
        })
        .catch(error => {
            console.error('Error saving profile:', error);
            showNotification('Error saving profile. Please try again.');
        });
    }
}

// Load ride history
function loadRideHistory() {
    if (currentUser) {
        database.ref('rides').orderByChild('passengerId').equalTo(currentUser.uid).once('value')
            .then(snapshot => {
                const historyList = document.getElementById('historyList');
                historyList.innerHTML = '';
                
                const rides = snapshot.val();
                if (rides) {
                    Object.keys(rides).forEach(rideId => {
                        const ride = rides[rideId];
                        const historyItem = document.createElement('div');
                        historyItem.className = 'history-item';
                        
                        const date = new Date(ride.timestamp);
                        const formattedDate = date.toLocaleDateString();
                        const formattedTime = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                        
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
                                <div class="status-badge ${ride.status === 'completed' || ride.status === 'paid' ? 'status-completed' : 'status-cancelled'}">${ride.status}</div>
                            </div>
                        `;
                        
                        historyList.appendChild(historyItem);
                    });
                } else {
                    historyList.innerHTML = '<p>No ride history found.</p>';
                }
            })
            .catch(error => {
                console.error('Error loading ride history:', error);
                document.getElementById('historyList').innerHTML = '<p>Error loading ride history.</p>';
            });
    }
}

// Logout
function logout() {
    auth.signOut()
        .then(() => {
            currentUser = null;
            localStorage.removeItem('userAuthenticated');
            localStorage.removeItem('profileCompleted');
            showAuthScreen();
        })
        .catch(error => {
            console.error('Error signing out:', error);
        });
}

// Show notification
function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}