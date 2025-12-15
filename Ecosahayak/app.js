// --- CONFIGURATION ---
// Set the "Work Site" location (Example: A generic coordinate)
const SITE_LAT = 28.6139;
const SITE_LNG = 77.2090;
const ALLOWED_RADIUS_METERS = 500; // User must be within 500m

// --- 1. INDEXEDDB SETUP ---
let db;
const request = indexedDB.open("EcoSahayakDB", 1);

request.onupgradeneeded = function (event) {
    db = event.target.result;
    const objectStore = db.createObjectStore("attendance", { keyPath: "id", autoIncrement: true });
};

request.onsuccess = function (event) {
    db = event.target.result;
    loadOfflineRecords(); // Load old data when app starts
};

// --- 2. GEOFENCING LOGIC ---
function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Radius of earth in meters
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
}

function deg2rad(deg) { return deg * (Math.PI / 180); }

// --- 3. MAIN FUNCTION ---
document.getElementById('markBtn').addEventListener('click', () => {
    const statusText = document.getElementById('status');
    statusText.innerText = "Checking Location...";

    if (!navigator.geolocation) {
        statusText.innerText = "Geolocation not supported";
        return;
    }

    navigator.geolocation.getCurrentPosition((position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        const distance = getDistanceFromLatLonInM(userLat, userLng, SITE_LAT, SITE_LNG);

        if (distance <= ALLOWED_RADIUS_METERS) {
            // INSIDE GEOFENCE
            saveAttendance(userLat, userLng);
            statusText.innerText = `Success! You are ${Math.round(distance)}m away.`;
        } else {
            // OUTSIDE GEOFENCE
            statusText.innerText = `Blocked! You are too far (${Math.round(distance)}m).`;
            statusText.style.color = "red";
        }
    }, (error) => {
        statusText.innerText = "Error getting location: " + error.message;
    });
});

// --- 4. SAVE TO DB ---
function saveAttendance(lat, lng) {
    const transaction = db.transaction(["attendance"], "readwrite");
    const store = transaction.objectStore("attendance");
    const record = {
        timestamp: new Date().toLocaleString(),
        location: `${lat}, ${lng}`,
        synced: false
    };
    store.add(record);
    loadOfflineRecords(); // Refresh list
}

// --- 5. SHOW RECORDS ---
function loadOfflineRecords() {
    const list = document.getElementById('recordList');
    list.innerHTML = "";

    const transaction = db.transaction(["attendance"], "readonly");
    const store = transaction.objectStore("attendance");

    store.openCursor().onsuccess = function (event) {
        const cursor = event.target.result;
        if (cursor) {
            const li = document.createElement("li");
            li.textContent = `${cursor.value.timestamp} - ${cursor.value.location}`;
            list.appendChild(li);
            cursor.continue();
        }
    };
}