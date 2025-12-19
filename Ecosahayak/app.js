// ================= GLOBAL VARIABLES =================
let map, userMarker, siteCircle;
let userLat, userLng;
let siteLat = localStorage.getItem('siteLat');
let siteLng = localStorage.getItem('siteLng');
const SITE_RADIUS_METERS = 500;
let adminChart = null; // Store chart instance

// ⚠️ PASTE YOUR GOOGLE SCRIPT URL HERE
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxUP8Is1TzlR-HBoHAgCwPfsB7WCecTP0HRZjG473ygKlTgP3lBfOM5Qt0akdskP6LDiQ/exec";


// ================= NAVIGATION =================
const views = {
    login: document.getElementById('loginSection'),
    register: document.getElementById('registerSection'),
    forgot: document.getElementById('forgotSection'),
    dashboard: document.getElementById('dashboardSection'),       // Worker
    admin: document.getElementById('adminDashboardSection'),      // Admin
    supervisor: document.getElementById('supervisorDashboardSection') // Supervisor
};

function showView(viewName) {
    // Hide all views
    Object.values(views).forEach(el => el.classList.add('hidden'));
    // Show selected view
    views[viewName].classList.remove('hidden');

    // --- SETUP FOR ADMIN ---
    if (viewName === 'admin') {
        setTimeout(() => {
            loadAdminChart();
            fetchReports();
            
            if (map) map.invalidateSize();
            initMap();
            startLocationTracking();
            updateSiteUI();
        }, 300);
    }

    // --- SETUP FOR WORKER ---
    if (viewName === 'dashboard') {
        setTimeout(() => {
            if (map) map.invalidateSize();
            initMap();
            startLocationTracking();
            updateSiteUI();
            initTaskLogic(); // <--- ADDED THIS (From Main Branch Logic)
        }, 300);
    }
}

// Button Listeners
document.getElementById('showRegister').onclick = () => showView('register');
document.getElementById('showForgot').onclick = () => showView('forgot');
document.getElementById('backToLogin1').onclick = () => showView('login');
document.getElementById('backToLogin2').onclick = () => showView('login');


// ================= AUTHENTICATION =================
const ADMIN_ID = "admin";
const ADMIN_PASS = "admin123";
const SUPER_ID = "sup";
const SUPER_PASS = "sup123";

document.getElementById('loginBtn').onclick = () => {
    const id = document.getElementById('workerId').value;
    const pass = document.getElementById('password').value;

    // 1. ADMIN CHECK
    if (id === ADMIN_ID && pass === ADMIN_PASS) {
        showView('admin');
        return;
    }

    // 2. SUPERVISOR CHECK
    if (id === SUPER_ID && pass === SUPER_PASS) {
        showView('supervisor');
        setTimeout(fetchActiveWorkers, 500); // Load Data
        return;
    }

    // 3. WORKER CHECK
    const storedPass = localStorage.getItem('user_' + id);
    if (storedPass && storedPass === pass) {
        localStorage.setItem('currentUser', id);
        showView('dashboard');
    } else {
        document.getElementById('loginError').innerText = "Invalid ID or Password";
    }
};

// 4. REGISTER LOGIC (From Feature Branch)
document.getElementById('registerBtn').onclick = () => {
    const id = document.getElementById('regWorkerId').value;
    const pass = document.getElementById('regPassword').value;
    if (id && pass) {
        localStorage.setItem('user_' + id, pass);
        alert("Registered! Please Login.");
        showView('login');
    }
};

// 5. RESET PASSWORD LOGIC (From Main Branch)
document.getElementById('resetBtn').onclick = () => {
    const id = document.getElementById('forgotWorkerId').value;
    const newPass = document.getElementById('newPassword').value;

    if (!id || !newPass) return alert("Please fill all fields");

    if (localStorage.getItem('user_' + id)) {
        localStorage.setItem('user_' + id, newPass);
        alert("Password reset! Please login with new password.");
        showView('login');
    } else {
        alert("User ID not found.");
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


// ================= ADMIN: CHARTS & REPORTS =================
function loadAdminChart() {
    const ctx = document.getElementById('attendanceChart');
    if (!ctx) return;

    if (adminChart) adminChart.destroy();

    adminChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Present', 'Late', 'Absent'],
            datasets: [{
                data: [15, 3, 2],
                backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

function fetchReports() {
    const list = document.getElementById('reportsList');
    if (!list) return;

    list.innerHTML = '<li style="text-align:center; padding:10px;">⏳ Loading Feed...</li>';

    fetch(GOOGLE_SCRIPT_URL)
        .then(response => response.json())
        .then(data => {
            list.innerHTML = "";
            if (!data || data.length === 0) {
                list.innerHTML = '<li style="text-align:center; padding:10px; color:#666;">No recent reports ✅</li>';
                return;
            }
            data.forEach(report => {
                let li = document.createElement('li');
                li.style.cssText = "padding:10px; border-bottom:1px solid #eee; font-size:0.9rem;";
                li.innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                        <span style="font-weight:bold; color:#d97706;">⚠️ ${report.id}</span>
                        <span style="font-size:0.8rem; color:#999;">${report.date}</span>
                    </div>
                    <div style="color:#333;">${report.issue}</div>
                `;
                list.appendChild(li);
            });
        })
        .catch(err => {
            console.error("Full Error Details:", err);
            list.innerHTML = `<li style="text-align:center; color:red;">❌ Sync Failed: ${err.message}</li>`;
        });
}


// ================= SUPERVISOR: LIVE MUSTER ROLL =================
function fetchActiveWorkers() {
    const list = document.getElementById('activeWorkerList');
    if (!list) return;

    list.innerHTML = '<li style="text-align:center; padding:10px;">⏳ Syncing with Cloud...</li>';

    fetch(GOOGLE_SCRIPT_URL)
        .then(res => res.json())
        .then(data => {
            list.innerHTML = "";
            if (!data || data.length === 0) {
                list.innerHTML = '<li style="text-align:center; color:#999; padding:10px;">No active workers found.</li>';
                return;
            }
            data.forEach(item => {
                let li = document.createElement('li');
                li.style.cssText = "display:flex; justify-content:space-between; padding:12px; border-bottom:1px solid #eee; align-items:center;";
                li.innerHTML = `
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:12px; height:12px; background:#22c55e; border-radius:50%; box-shadow: 0 0 5px #22c55e;"></div>
                        <div>
                            <div style="font-weight:700; color:#333;">${item.id}</div>
                            <div style="font-size:0.75rem; color:#666;">${item.date}</div>
                        </div>
                    </div>
                    <span style="background:#dcfce7; color:#166534; padding:4px 10px; border-radius:12px; font-size:0.75rem; font-weight:600;">Active</span>
                `;
                list.appendChild(li);
            });
        })
        .catch(err => list.innerHTML = '<li style="text-align:center; color:red; padding:10px;">Connection Failed</li>');
}


// ================= WORKER: LEAVE REQUESTS =================
function toggleLeave() {
    const form = document.getElementById('leaveForm');
    const btn = document.getElementById('toggleLeaveBtn');

    if (form.style.display === 'none') {
        form.style.display = 'block';
        btn.innerText = "Cancel";
    } else {
        form.style.display = 'none';
        btn.innerText = "Request Time Off";
    }
}

function submitLeave() {
    const type = document.getElementById('leaveType').value;
    const days = document.getElementById('leaveDays').value;
    const reason = document.getElementById('leaveReason').value;
    const workerId = localStorage.getItem('currentUser');

    if (!days || !reason) {
        alert("Please fill all fields!");
        return;
    }

    const btn = document.querySelector('#leaveForm button');
    const originalText = btn.innerText;
    btn.innerText = "Submitting...";

    let data = {
        action: "applyLeave",
        workerId: workerId,
        leaveType: type,
        days: days,
        reason: reason
    };

    fetch(GOOGLE_SCRIPT_URL, {
        method: "POST", mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    }).then(() => {
        alert(`✅ ${type} request for ${days} days sent!`);
        document.getElementById('leaveDays').value = "";
        document.getElementById('leaveReason').value = "";
        toggleLeave();
        btn.innerText = originalText;
    }).catch(err => {
        alert("Error sending request");
        btn.innerText = originalText;
    });
}


// ================= WORKER: CAMERA LOGIC =================
const video = document.getElementById('videoFeed');
const photoPreview = document.getElementById('photoPreview');
const openBtn = document.getElementById('openCameraBtn');
const capBtn = document.getElementById('captureBtn');
const retakeBtn = document.getElementById('retakeBtn');

openBtn.onclick = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        video.srcObject = stream;
        video.style.display = 'block';
        photoPreview.style.display = 'none';
        openBtn.style.display = 'none';
        capBtn.style.display = 'inline-flex';
    } catch (e) { alert("Camera Error: Please allow permissions."); }
};

capBtn.onclick = () => {
    const canvas = document.getElementById('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    photoPreview.src = canvas.toDataURL('image/jpeg', 0.6);

    video.style.display = 'none';
    photoPreview.style.display = 'block';
    capBtn.style.display = 'none';
    retakeBtn.style.display = 'inline-flex';

    video.srcObject.getTracks().forEach(t => t.stop());
};

retakeBtn.onclick = () => {
    retakeBtn.style.display = 'none';
    openBtn.click();
};


// ================= WORKER: ATTENDANCE & REPORT =================
function handleStartDay() {
    const workerId = localStorage.getItem('currentUser');
    const statusTxt = document.getElementById('status');

    if (!userLat) return alert("Waiting for GPS...");
    if (photoPreview.style.display === 'none') return alert("📸 Please Take a Photo First!");

    // Geofence Check
    const dist = calculateDistance(siteLat, siteLng, userLat, userLng);
    if (siteLat && dist > SITE_RADIUS_METERS) {
        alert(`❌ Too Far! You are ${Math.round(dist)}m away from site.`);
        return;
    }

    statusTxt.innerText = "Starting...";
    statusTxt.style.background = "#fde047";

    sendData({
        action: "checkin",
        workerId: workerId,
        lat: userLat,
        lng: userLng,
        distance: Math.round(dist),
        photo: photoPreview.src
    });
}

function showCheckout() {
    document.getElementById('checkoutForm').style.display = 'block';
    document.getElementById('checkoutForm').scrollIntoView({ behavior: "smooth" });
}

function handleEndDay() {
    const workerId = localStorage.getItem('currentUser');
    const report = document.getElementById('workReport').value;

    if (photoPreview.style.display === 'none') {
        alert("📸 Please SNAP A PHOTO to verify your Checkout!");
        document.querySelector('.hero-section').scrollIntoView({ behavior: "smooth" });
        return;
    }

    sendData({
        action: "checkout",
        workerId: workerId,
        workReport: report || "No Report",
        photo: photoPreview.src
    });
}

function triggerSOS() {
    if (confirm("🚨 Trigger SOS? Calling 112...")) window.open('tel:112');
}

function triggerReport() {
    let issue = prompt("⚠️ Describe the issue (Safety/Equipment):");
    if (issue) {
        const btn = document.querySelector('.report');
        const originalText = btn.innerHTML;
        btn.innerHTML = 'Sending...';

        sendData({
            action: "report",
            workerId: localStorage.getItem('currentUser') || "Unknown",
            issue: issue
        });

        setTimeout(() => { btn.innerHTML = originalText; }, 2000);
    }
}

function sendData(data) {
    const statusTxt = document.getElementById('status');

    fetch(GOOGLE_SCRIPT_URL, {
        method: "POST", mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    }).then(() => {
        if (data.action === "checkin") {
            statusTxt.innerText = "Active";
            statusTxt.style.background = "#bbf7d0";
            alert("✅ Attendance Marked! Work Started.");
        } else if (data.action === "checkout") {
            statusTxt.innerText = "Done";
            statusTxt.style.background = "#e5e7eb";
            document.getElementById('checkoutForm').style.display = 'none';
            alert("✅ Day Ended Successfully!");
        } else if (data.action === "report") {
            alert("✅ Report Sent to Admin Dashboard!");
        }
    }).catch(err => alert("Error: " + err));
}


// ================= MAP UTILS =================
function startLocationTracking() {
    if (!navigator.geolocation) return;
    navigator.geolocation.watchPosition(pos => {
        userLat = pos.coords.latitude;
        userLng = pos.coords.longitude;
        if (document.getElementById('welcomeText')) document.getElementById('welcomeText').innerText = "GPS Active";

        if (!userMarker) {
            userMarker = L.marker([userLat, userLng]).addTo(map).bindPopup("You").openPopup();
            map.setView([userLat, userLng], 16);
        } else { userMarker.setLatLng([userLat, userLng]); }
    }, err => console.error(err), { enableHighAccuracy: true });
}

function drawSiteCircle(lat, lng) {
    if (siteCircle) map.removeLayer(siteCircle);
    siteCircle = L.circle([lat, lng], { color: 'green', radius: SITE_RADIUS_METERS }).addTo(map);
}

document.getElementById('setSiteBtn').onclick = () => {
    if (!userLat) return alert("No GPS");
    siteLat = userLat; siteLng = userLng;
    localStorage.setItem('siteLat', siteLat);
    localStorage.setItem('siteLng', siteLng);
    drawSiteCircle(siteLat, siteLng);
    updateSiteUI();
    alert("Site Location Set!");
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
    if (el) el.innerText = siteLat ? `${Number(siteLat).toFixed(4)}, ${Number(siteLng).toFixed(4)}` : "Not Set";
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1) return 0;
    var R = 6371;
    var dLat = (lat2 - lat1) * (Math.PI / 180);
    var dLon = (lon2 - lon1) * (Math.PI / 180);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // Returns Meters
}


// ================= TASK PROGRESS & UI INTERACTION =================
document.querySelectorAll('.ui-btn').forEach(btn => {
    btn.onclick = function() { alert("Button Clicked: " + this.innerText); }
});

function initTaskLogic() {
    const checkboxes = document.querySelectorAll('.task-check');
    const progressBar = document.getElementById('progressBar');
    const percentText = document.getElementById('taskPercent');

    if(!progressBar) return;

    function updateProgress() {
        const total = checkboxes.length;
        const checked = document.querySelectorAll('.task-check:checked').length;
        
        // Calculate percentage
        const percent = total === 0 ? 0 : Math.round((checked / total) * 100);
        
        // Update UI
        progressBar.style.width = percent + '%';
        if(percentText) percentText.innerText = percent + '%';
        
        // Change color when complete
        if(percent === 100) {
            progressBar.style.backgroundColor = '#059669'; // Dark Green
            if(percentText) {
                percentText.classList.add('completed');
                percentText.innerText = "DONE";
            }
        } else {
            progressBar.style.backgroundColor = '#10B981'; // Regular Green
        }
    }

    // Add click listeners
    checkboxes.forEach(box => {
        box.addEventListener('change', updateProgress);
    });

    // Run once on load
    updateProgress();
}