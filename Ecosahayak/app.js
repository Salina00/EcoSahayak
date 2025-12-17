// --- CONFIGURATION ---
// 1. Try to get saved location from LocalStorage, OR use default (New Delhi)
let SITE_LAT = parseFloat(localStorage.getItem('site_lat')) || 28.6139;
let SITE_LNG = parseFloat(localStorage.getItem('site_lng')) || 77.2090;
const ALLOWED_RADIUS = 500; // Meters

// Update the UI to show current target
updateSiteUI();

// --- ADMIN: SET LOCATION FUNCTION ---
document.getElementById('setSiteBtn').addEventListener('click', () => {
    if (!navigator.geolocation) {
        alert("GPS not supported");
        return;
    }

    // Get current spot and save it as the new "Work Site"
    navigator.geolocation.getCurrentPosition((position) => {
        SITE_LAT = position.coords.latitude;
        SITE_LNG = position.coords.longitude;

        // SAVE TO BROWSER MEMORY
        localStorage.setItem('site_lat', SITE_LAT);
        localStorage.setItem('site_lng', SITE_LNG);

        alert(`✅ Work Site Updated to: ${SITE_LAT.toFixed(4)}, ${SITE_LNG.toFixed(4)}`);

        // Refresh Map & UI
        updateSiteUI();
        initMap();
    });
});

document.getElementById('resetSiteBtn').addEventListener('click', () => {
    localStorage.removeItem('site_lat');
    localStorage.removeItem('site_lng');
    alert("Site reset to default.");
    location.reload();
});

function updateSiteUI() {
    document.getElementById('siteCoords').innerText = `${SITE_LAT.toFixed(4)}, ${SITE_LNG.toFixed(4)}`;
}

// --- MAP SETUP ---
let map, userMarker, fenceCircle;

function initMap() {
    // If map already exists, remove it (so we can redraw it at new location)
    if (map) { map.remove(); }

    // 1. Create Map centered on the Work Site
    map = L.map('map').setView([SITE_LAT, SITE_LNG], 15);

    // 2. Add OpenStreetMap Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // 3. Draw the Geofence Circle (Blue)
    fenceCircle = L.circle([SITE_LAT, SITE_LNG], {
        color: 'blue',
        fillColor: '#30f',
        fillOpacity: 0.2,
        radius: ALLOWED_RADIUS
    }).addTo(map);

    // 4. Add a Popup
    fenceCircle.bindPopup("Allowed Work Zone").openPopup();
}

// --- MAIN ATTENDANCE LOGIC ---
document.getElementById('markBtn').addEventListener('click', () => {
    const statusText = document.getElementById('status');
    statusText.innerText = "Locating you...";

    if (!navigator.geolocation) {
        statusText.innerText = "Error: Geolocation not supported";
        return;
    }

    // High Accuracy Mode
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;

            // 1. Calculate Distance
            const distance = getDistanceFromLatLonInM(userLat, userLng, SITE_LAT, SITE_LNG);

            // 2. Update Map (Show User)
            updateMapUserLocation(userLat, userLng);

            // 3. Validate
            if (distance <= ALLOWED_RADIUS) {
                // SUCCESS
                statusText.innerText = `Success! You are inside the zone (${Math.round(distance)}m).`;
                statusText.style.color = "green";

                // Trigger the Database Save (Member 3's function)
                if (typeof saveAttendance === "function") {
                    saveAttendance(userLat, userLng);
                }
            } else {
                // FAILURE
                statusText.innerText = `Blocked! You are ${Math.round(distance)}m away from site.`;
                statusText.style.color = "red";
            }
        },
        (error) => {
            statusText.innerText = "GPS Error: " + error.message;
        },
        { enableHighAccuracy: true } // Request best GPS signal
    );
});

// --- HELPER: UPDATE MAP MARKER ---
function updateMapUserLocation(lat, lng) {
    if (!map) initMap(); // Initialize map if not ready

    // Remove old marker if exists
    if (userMarker) map.removeLayer(userMarker);

    // Add new marker (Red)
    userMarker = L.marker([lat, lng]).addTo(map)
        .bindPopup("You are here")
        .openPopup();

    // Zoom to fit both User and Site
    const group = new L.featureGroup([userMarker, fenceCircle]);
    map.fitBounds(group.getBounds());
}

// --- HELPER: MATH (HAVERSINE FORMULA) ---
function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function deg2rad(deg) { return deg * (Math.PI / 180); }

// Initialize Map immediately so it's visible on load
initMap();