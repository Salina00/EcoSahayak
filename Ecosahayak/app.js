// ================= GLOBAL VARIABLES =================
let map, userMarker, siteCircle;
let userLat, userLng; // Tracks the worker's current location
let siteLat = localStorage.getItem('siteLat'); // Tracks the office location
let siteLng = localStorage.getItem('siteLng');
let videoStream = null;

const SITE_RADIUS_METERS = 500;

// YOUR GOOGLE SCRIPT URL (I preserved yours here)
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxUP8Is1TzlR-HBoHAgCwPfsB7WCecTP0HRZjG473ygKlTgP3lBfOM5Qt0akdskP6LDiQ/exec";


// ================= NAVIGATION =================
const views = {
    login: document.getElementById('loginSection'),
    register: document.getElementById('registerSection'),
    forgot: document.getElementById('forgotSection'),
    dashboard: document.getElementById('dashboardSection')
};

function showView(viewName) {
    // Hide all views
    Object.values(views).forEach(el => el.classList.add('hidden'));
    // Show selected view
    views[viewName].classList.remove('hidden');

    // If entering dashboard, initialize map and tracking
    if (viewName === 'dashboard') {
        setTimeout(() => {
            if (map) map.invalidateSize();
            initMap();
            startLocationTracking(); // <--- CRITICAL: Starts GPS
            updateSiteUI();
        }, 300);
    }
}

document.getElementById('showRegister').onclick = () => showView('register');
document.getElementById('showForgot').onclick = () => showView('forgot');
document.getElementById('backToLogin1').onclick = () => showView('login');
document.getElementById('backToLogin2').onclick = () => showView('login');
document.getElementById('logoutBtn').onclick = () => location.reload();


// ================= AUTHENTICATION =================
document.getElementById('registerBtn').onclick = () => {
    const id = document.getElementById('regWorkerId').value;
    const pass = document.getElementById('regPassword').value;
    if (!id || !pass) return alert("Fill all fields");

    localStorage.setItem('user_' + id, pass);
    alert("Registered! Please Login.");
    showView('login');
};

document.getElementById('loginBtn').onclick = () => {
    const id = document.getElementById('workerId').value;
    const pass = document.getElementById('password').value;
    const storedPass = localStorage.getItem('user_' + id);

    if (storedPass && storedPass === pass) {
        localStorage.setItem('currentUser', id);
        document.getElementById('welcomeText').innerText = `Welcome, ${id}`;
        showView('dashboard');
    } else {
        document.getElementById('loginError').innerText = "Invalid ID or Password";
    }
};


// ================= MAP & GPS LOGIC =================
function initMap() {
    if (map) return;

    // Default view (India), will update once GPS is found
    map = L.map('map').setView([20.5937, 78.9629], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);

    // Draw Site Circle if it exists
    if (siteLat && siteLng) {
        drawSiteCircle(siteLat, siteLng);
    }
}

// THIS FUNCTION WAS MISSING IN YOUR CODE
// REPLACE your current startLocationTracking function with this:

function startLocationTracking() {
    const welcomeText = document.getElementById('welcomeText'); // We will use this to show status

    if (!navigator.geolocation) {
        alert("Geolocation not supported by this browser.");
        return;
    }

    welcomeText.innerText = "📡 Searching for GPS...";
    welcomeText.style.color = "orange";

    navigator.geolocation.watchPosition((pos) => {
        // SUCCESS: We got a signal!
        userLat = pos.coords.latitude;
        userLng = pos.coords.longitude;

        // Visual Feedback
        welcomeText.innerText = `✅ GPS Ready (${userLat.toFixed(4)}, ${userLng.toFixed(4)})`;
        welcomeText.style.color = "green";

        // Update Blue Marker
        if (!userMarker) {
            userMarker = L.marker([userLat, userLng]).addTo(map).bindPopup("You").openPopup();
            map.setView([userLat, userLng], 16);
        } else {
            userMarker.setLatLng([userLat, userLng]);
        }

    }, (err) => {
        // ERROR: GPS failed
        console.error(err);
        welcomeText.innerText = "❌ GPS Error: " + err.message;
        welcomeText.style.color = "red";
    }, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    });
}

function drawSiteCircle(lat, lng) {
    if (siteCircle) map.removeLayer(siteCircle);
    siteCircle = L.circle([lat, lng], {
        color: 'green',
        fillColor: '#28a745',
        fillOpacity: 0.2,
        radius: SITE_RADIUS_METERS
    }).addTo(map);
}


// ================= ADMIN: SET SITE =================
document.getElementById('setSiteBtn').onclick = () => {
    if (!userLat) return alert("Waiting for GPS...");

    siteLat = userLat;
    siteLng = userLng;
    localStorage.setItem('siteLat', siteLat);
    localStorage.setItem('siteLng', siteLng);

    drawSiteCircle(siteLat, siteLng);
    updateSiteUI();
    alert("Site Location Set Successfully!");
};

document.getElementById('resetSiteBtn').onclick = () => {
    localStorage.removeItem('siteLat');
    localStorage.removeItem('siteLng');
    if (siteCircle) map.removeLayer(siteCircle);
    siteLat = null; siteLng = null;
    updateSiteUI();
};

function updateSiteUI() {
    const el = document.getElementById('siteCoords');
    el.innerText = siteLat ? `${Number(siteLat).toFixed(4)}, ${Number(siteLng).toFixed(4)}` : "Not Set";
}


// ================= CAMERA =================
const video = document.getElementById('videoFeed');
const canvas = document.getElementById('canvas');
const photoPreview = document.getElementById('photoPreview');

document.getElementById('openCameraBtn').onclick = async () => {
    try {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        video.srcObject = videoStream;
        video.style.display = 'block';
        photoPreview.style.display = 'none';
        document.getElementById('captureBtn').style.display = 'inline-block';
        document.getElementById('openCameraBtn').style.display = 'none';
    } catch (err) {
        alert("Camera error. Use HTTPS!");
    }
};

document.getElementById('captureBtn').onclick = () => {
    canvas.width = 320; // Lower resolution for Google Sheets
    canvas.height = 240;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

    videoStream.getTracks().forEach(track => track.stop());
    video.style.display = 'none';

    photoPreview.src = canvas.toDataURL('image/jpeg', 0.7);
    photoPreview.style.display = 'block';

    document.getElementById('captureBtn').style.display = 'none';
    document.getElementById('retakeBtn').style.display = 'inline-block';
};

document.getElementById('retakeBtn').onclick = () => {
    document.getElementById('openCameraBtn').click();
    document.getElementById('retakeBtn').style.display = 'none';
};


// ================= MARK ATTENDANCE =================
document.getElementById('markBtn').onclick = () => {
    const statusEl = document.getElementById('status');
    const markBtn = document.getElementById('markBtn');

    // 1. Validate Inputs
    if (photoPreview.style.display === 'none') return alert("Take a photo first.");
    if (!siteLat) return alert("Admin has not set a Site Location yet.");
    if (!userLat) return alert("Waiting for GPS signal...");

    // 2. Calculate Distance
    const distance = getDistanceFromLatLonInMeters(userLat, userLng, siteLat, siteLng);

    // 3. Geofence Check
    if (distance > SITE_RADIUS_METERS) {
        statusEl.style.color = 'red';
        statusEl.innerHTML = `❌ <b>Failed!</b><br>Too far from site (${Math.round(distance)}m).<br>Allowed: ${SITE_RADIUS_METERS}m`;
        return;
    }

    // 4. Send to Google Sheets
    statusEl.style.color = 'blue';
    statusEl.innerHTML = "⏳ Sending data to cloud...";
    markBtn.disabled = true;

    const payload = {
        workerId: localStorage.getItem('currentUser'),
        lat: userLat,
        lng: userLng,
        distance: Math.round(distance),
        photo: photoPreview.src
    };

    fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
        .then(() => {
            statusEl.style.color = 'green';
            statusEl.innerHTML = `✅ <b>Success!</b><br>Attendance Saved.<br>Distance: ${Math.round(distance)}m`;
            markBtn.disabled = false;
            setTimeout(() => document.getElementById('retakeBtn').click(), 3000); // Reset camera
        })
        .catch(error => {
            statusEl.style.color = 'red';
            statusEl.innerHTML = "❌ Network Error.";
            markBtn.disabled = false;
        });
};

// Helper Math Function
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var dLat = (lat2 - lat1) * (Math.PI / 180);
    var dLon = (lon2 - lon1) * (Math.PI / 180);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // Meters
}