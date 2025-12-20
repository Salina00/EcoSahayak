// --- CONFIG & STATE ---
let map, userMarker, siteCircle;
let userLat, userLng;
let siteLat = localStorage.getItem('siteLat');
let siteLng = localStorage.getItem('siteLng');
const SITE_RADIUS_METERS = 300;
let adminChart = null;

// CREDENTIALS (HASHED)
const ADMIN_HASH = "YWRtaW4xMjM="; // admin123
const SUPER_HASH = "c3VwMTIz";     // sup123

const views = {
    login: document.getElementById('loginSection'),
    register: document.getElementById('registerSection'),
    forgot: document.getElementById('forgotSection'),
    dashboard: document.getElementById('dashboardSection'),
    admin: document.getElementById('adminDashboardSection'),
    supervisor: document.getElementById('supervisorDashboardSection')
};

// --- INITIALIZATION (PERSISTENCE) ---
window.addEventListener('load', () => {
    const savedUser = localStorage.getItem('currentUser');
    const role = localStorage.getItem('currentRole');
    const isShiftStarted = localStorage.getItem('isShiftStarted');

    if (savedUser) {
        if (role === 'admin') showView('admin');
        else if (role === 'sup') showView('supervisor');
        else {
            showView('dashboard');
            document.getElementById('welcomeText').innerText = `Hello, ${savedUser}`;
            if (isShiftStarted === 'true') {
                const statusEl = document.getElementById('status');
                statusEl.innerHTML = "🟢 Active (On Shift)";
                statusEl.style.background = "#d1fae5";
                statusEl.style.color = "#065f46";
            }
        }
    } else {
        showView('login');
    }
});

// --- NAVIGATION ---
function showView(viewName) {
    Object.values(views).forEach(el => { if (el) el.classList.add('hidden'); });
    if (views[viewName]) views[viewName].classList.remove('hidden');

    if (viewName === 'dashboard') {
        setTimeout(() => {
            initMap();
            startLocationTracking();
            checkWorkerLeaveStatus();
            loadWorkerTasks(); // <--- ✅ ADDED: Loads tasks when worker logs in
        }, 300);
    }

    if (viewName === 'admin') {
        setTimeout(() => {
            updateAdminSiteUI();
            loadAdminChart();
            startLocationTracking();
        }, 300);
    }

    if (viewName === 'supervisor') {
        setTimeout(() => {
            fetchActiveWorkers();
            loadSupervisorLeaves();
            loadOpsFeed();
            loadAdminReports();
        }, 300);
    }
}

// Button Listeners
document.getElementById('showRegister').onclick = () => showView('register');
document.getElementById('showForgot').onclick = () => showView('forgot');
document.getElementById('backToLogin1').onclick = () => showView('login');
document.getElementById('backToLogin2').onclick = () => showView('login');

function handleLogout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentRole');
    localStorage.removeItem('isShiftStarted');
    location.reload();
}

// --- LOGIN LOGIC ---
document.getElementById('loginBtn').onclick = () => {
    const id = document.getElementById('workerId').value;
    const pass = document.getElementById('password').value;
    const err = document.getElementById('loginError');

    if (!id || !pass) {
        err.innerText = "Please fill all fields";
        return;
    }

    const inputHash = btoa(pass);

    if (id === 'admin' && inputHash === ADMIN_HASH) {
        localStorage.setItem('currentUser', 'admin');
        localStorage.setItem('currentRole', 'admin');
        showView('admin');
        return;
    }

    if (id === 'sup' && inputHash === SUPER_HASH) {
        localStorage.setItem('currentUser', 'Supervisor');
        localStorage.setItem('currentRole', 'sup');
        showView('supervisor');
        return;
    }

    if (id !== 'admin' && id !== 'sup') {
        localStorage.setItem('currentUser', id);
        localStorage.setItem('currentRole', 'worker');
        showView('dashboard');
    } else {
        err.innerText = "Invalid credentials";
    }
};

// --- MAP & GEOFENCING ---
function initMap() {
    if (map) return;
    map = L.map('map').setView([20.5937, 78.9629], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
    if (siteLat && siteLng) drawSiteCircle(siteLat, siteLng);
}

function startLocationTracking() {
    if (!navigator.geolocation) {
        document.getElementById('gpsAccuracy').innerText = "Not Supported";
        return;
    }
    navigator.geolocation.watchPosition(pos => {
        userLat = pos.coords.latitude;
        userLng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;
        const accEl = document.getElementById('gpsAccuracy');
        if (accEl) accEl.innerText = `Active (±${Math.round(accuracy)}m)`;

        if (!userMarker) {
            userMarker = L.marker([userLat, userLng]).addTo(map).bindPopup("You").openPopup();
            map.setView([userLat, userLng], 16);
        } else {
            userMarker.setLatLng([userLat, userLng]);
        }
    }, err => console.error(err), { enableHighAccuracy: true });
}

function drawSiteCircle(lat, lng) {
    if (siteCircle) map.removeLayer(siteCircle);
    siteCircle = L.circle([lat, lng], {
        color: 'green', fillColor: '#22c55e', fillOpacity: 0.2, radius: SITE_RADIUS_METERS
    }).addTo(map);
}

function isInsideGeofence(lat, lng) {
    if (!siteLat || !siteLng) return true;
    const userLoc = L.latLng(lat, lng);
    const siteLoc = L.latLng(siteLat, siteLng);
    return userLoc.distanceTo(siteLoc) <= SITE_RADIUS_METERS;
}

// --- WORKER FUNCTIONS ---
function handleStartDay() {
    if (!userLat) return alert("⚠️ Waiting for GPS...");
    if (isInsideGeofence(userLat, userLng)) {
        const statusEl = document.getElementById('status');
        statusEl.innerHTML = "🟢 Active (On Shift)";
        statusEl.style.background = "#d1fae5";
        statusEl.style.color = "#065f46";
        localStorage.setItem('isShiftStarted', 'true');
        alert("✅ Check-in Successful!");
    } else {
        alert("❌ You are outside the work zone!");
    }
}

function triggerSOS() {
    if (confirm("Send SOS Alert?")) alert("🚨 SOS SENT!");
}
function triggerReport() {
    const issue = prompt("Describe issue:");
    if (issue) alert("Report logged.");
}

// --- CAMERA FUNCTIONS ---
const video = document.getElementById('videoFeed');
const photoPreview = document.getElementById('photoPreview');
const openBtn = document.getElementById('openCameraBtn');
const capBtn = document.getElementById('captureBtn');
const retakeBtn = document.getElementById('retakeBtn');

if (openBtn) {
    openBtn.onclick = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            video.srcObject = stream;
            openBtn.classList.add('hidden');
            capBtn.classList.remove('hidden');
        } catch (e) { alert("Camera Error"); }
    };
}

if (capBtn) {
    capBtn.onclick = () => {
        const camBox = document.querySelector('.camera-box');
        camBox.classList.add('flash-effect');
        setTimeout(() => camBox.classList.remove('flash-effect'), 300);

        const canvas = document.getElementById('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        photoPreview.src = canvas.toDataURL('image/jpeg');

        video.style.display = 'none';
        photoPreview.style.display = 'block';
        capBtn.classList.add('hidden');
        retakeBtn.classList.remove('hidden');
        video.srcObject.getTracks().forEach(t => t.stop());
    };
}

if (retakeBtn) {
    retakeBtn.onclick = () => {
        photoPreview.style.display = 'none';
        video.style.display = 'block';
        retakeBtn.classList.add('hidden');
        openBtn.click();
    };
}

// --- SUPERVISOR FUNCTIONS ---
function fetchActiveWorkers() {
    const list = document.getElementById('activeWorkerList');
    // Mock Data
    const workers = [
        { id: "101", status: "Active", time: "08:00 AM" },
        { id: "102", status: "Active", time: "08:15 AM" },
        { id: "104", status: "Break", time: "09:30 AM" }
    ];

    list.innerHTML = "";
    workers.forEach(w => {
        let li = document.createElement('li');
        li.style.padding = "10px";
        li.style.borderBottom = "1px solid #eee";
        li.innerHTML = `🟢 <strong>Worker-${w.id}</strong>: ${w.status} <br><small style='color:gray'>In since ${w.time}</small>`;
        list.appendChild(li);
    });
}

// --- ADMIN FUNCTIONS ---
function updateAdminSiteUI() {
    const el = document.getElementById('adminSiteCoords');
    if (el) el.innerText = siteLat ? `${Number(siteLat).toFixed(4)}, ${Number(siteLng).toFixed(4)}` : "Not Set";
}

if (document.getElementById('setSiteBtn')) {
    document.getElementById('setSiteBtn').onclick = () => {
        if (!userLat) return alert("Waiting for GPS...");
        siteLat = userLat;
        siteLng = userLng;
        localStorage.setItem('siteLat', siteLat);
        localStorage.setItem('siteLng', siteLng);
        updateAdminSiteUI();
        alert("✅ Geofence Set!");
    };
}

if (document.getElementById('resetSiteBtn')) {
    document.getElementById('resetSiteBtn').onclick = () => {
        localStorage.removeItem('siteLat');
        localStorage.removeItem('siteLng');
        siteLat = null; siteLng = null;
        updateAdminSiteUI();
    };
}

function loadAdminChart() {
    const ctx = document.getElementById('attendanceChart');
    if (!ctx || adminChart) return;
    adminChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Present', 'Absent', 'Late'],
            datasets: [{
                data: [15, 3, 2],
                backgroundColor: ['#166534', '#dc2626', '#f59e0b']
            }]
        }
    });
}

// --- LEAVE MANAGEMENT SYSTEM ---
function submitLeave() {
    const type = document.getElementById('leaveType').value;
    const reason = document.getElementById('leaveReason').value;
    const workerId = localStorage.getItem('currentUser');

    if (!reason) return alert("Please provide a reason.");

    const newRequest = {
        id: Date.now(),
        workerId: workerId,
        type: type,
        reason: reason,
        status: 'Pending',
        date: new Date().toLocaleDateString()
    };

    const requests = JSON.parse(localStorage.getItem('leaveRequests') || "[]");
    requests.push(newRequest);
    localStorage.setItem('leaveRequests', JSON.stringify(requests));

    document.getElementById('leaveReason').value = "";
    alert("✅ Leave Request Submitted!");
    checkWorkerLeaveStatus();
}

function checkWorkerLeaveStatus() {
    const workerId = localStorage.getItem('currentUser');
    const requests = JSON.parse(localStorage.getItem('leaveRequests') || "[]");
    const myRequests = requests.filter(r => r.workerId === workerId);
    const lastRequest = myRequests[myRequests.length - 1];

    const statusDiv = document.getElementById('workerLeaveStatus');

    if (lastRequest) {
        statusDiv.style.display = 'block';
        let color = '#fef3c7'; // Yellow
        let icon = '⏳';

        if (lastRequest.status === 'Approved') { color = '#d1fae5'; icon = '✅'; }
        if (lastRequest.status === 'Rejected') { color = '#fee2e2'; icon = '❌'; }

        statusDiv.style.background = color;
        statusDiv.innerHTML = `<strong>${icon} Last Request:</strong> ${lastRequest.status}<br><small>${lastRequest.type}: "${lastRequest.reason}"</small>`;
    } else {
        statusDiv.style.display = 'none';
    }
}

function loadSupervisorLeaves() {
    const list = document.getElementById('supervisorLeaveList');
    if (!list) return; // Guard clause
    const requests = JSON.parse(localStorage.getItem('leaveRequests') || "[]");
    const pending = requests.filter(r => r.status === 'Pending');

    list.innerHTML = "";

    if (pending.length === 0) {
        list.innerHTML = `<li style="text-align:center; color:#999; padding:10px;">No pending requests</li>`;
        return;
    }

    pending.forEach(req => {
        const li = document.createElement('li');
        li.style.padding = "15px";
        li.style.borderBottom = "1px solid #eee";
        li.style.background = "#fff";
        li.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <strong>Worker ${req.workerId}</strong>
                <span style="font-size:0.8rem; background:#eee; padding:2px 8px; border-radius:10px;">${req.type}</span>
            </div>
            <p style="margin:5px 0; color:#555; font-size:0.9rem;">"${req.reason}"</p>
            <div style="display:flex; gap:10px; margin-top:10px;">
                <button onclick="handleLeaveDecision(${req.id}, 'Approved')" class="btn-primary" style="padding:5px 15px; font-size:0.8rem; background:#166534;">Approve</button>
                <button onclick="handleLeaveDecision(${req.id}, 'Rejected')" class="btn-secondary" style="padding:5px 15px; font-size:0.8rem; background:#dc2626; color:white;">Reject</button>
            </div>
        `;
        list.appendChild(li);
    });
}

function handleLeaveDecision(id, decision) {
    const requests = JSON.parse(localStorage.getItem('leaveRequests') || "[]");
    const index = requests.findIndex(r => r.id === id);
    if (index !== -1) {
        requests[index].status = decision;
        localStorage.setItem('leaveRequests', JSON.stringify(requests));
        alert(`Request marked as ${decision}`);
        loadSupervisorLeaves();
    }
}

// --- DYNAMIC TASK MANAGER (NEW SECTIONS) ---

// 1. SUPERVISOR: Assign a Task
function assignTask() {
    const desc = document.getElementById('newTaskDesc').value;
    const assignedTo = document.getElementById('assignWorkerSelect').value;

    if (!desc || !assignedTo) return alert("Please fill all fields");

    const newTask = {
        id: Date.now(),
        desc: desc,
        assignedTo: assignedTo,
        completed: false,
        assignedBy: "Supervisor"
    };

    const allTasks = JSON.parse(localStorage.getItem('allTasks') || "[]");
    allTasks.push(newTask);
    localStorage.setItem('allTasks', JSON.stringify(allTasks));

    alert(`✅ Task assigned to Worker ${assignedTo}`);
    document.getElementById('newTaskDesc').value = "";
}

// 2. WORKER: Load My Tasks
function loadWorkerTasks() {
    const myId = localStorage.getItem('currentUser');
    const container = document.getElementById('workerTaskList');
    if (!container) return; // Safety Check

    const allTasks = JSON.parse(localStorage.getItem('allTasks') || "[]");
    const myTasks = allTasks.filter(t => t.assignedTo === myId);

    container.innerHTML = "";

    if (myTasks.length === 0) {
        container.innerHTML = `<p style="color:#999; text-align:center;">No tasks assigned.</p>`;
        updateProgress(0, 0);
        return;
    }

    myTasks.forEach(task => {
        const div = document.createElement('div');
        div.className = "task-item";
        div.innerHTML = `
            <input type="checkbox" class="task-check" 
                ${task.completed ? "checked" : ""} 
                onchange="toggleTask(${task.id})"> 
            <span style="${task.completed ? 'text-decoration:line-through; color:#999;' : ''}">
                ${task.desc}
            </span>
        `;
        container.appendChild(div);
    });

    const completedCount = myTasks.filter(t => t.completed).length;
    updateProgress(completedCount, myTasks.length);
}

// 3. WORKER: Toggle Task Completion
function toggleTask(taskId) {
    const allTasks = JSON.parse(localStorage.getItem('allTasks') || "[]");
    const taskIndex = allTasks.findIndex(t => t.id === taskId);

    if (taskIndex > -1) {
        allTasks[taskIndex].completed = !allTasks[taskIndex].completed;
        localStorage.setItem('allTasks', JSON.stringify(allTasks));
        loadWorkerTasks();
    }
}

// 4. WORKER: Update Progress Bar
function updateProgress(done, total) {
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    const bar = document.getElementById('progressBar');
    const text = document.getElementById('taskPercent');

    if (bar) bar.style.width = percent + "%";
    if (text) text.innerText = percent + "%";
}
// --- FIELD DATA COLLECTION SYSTEM ---

// 1. WORKER: Submit Field Report
function submitFieldReport() {
    const category = document.getElementById('reportCategory').value;
    const qty = document.getElementById('reportQty').value;
    const unit = document.getElementById('reportUnit').value;
    const notes = document.getElementById('reportNotes').value;
    const workerId = localStorage.getItem('currentUser');

    if (!qty || !notes) return alert("Please fill in Quantity and Notes.");

    const report = {
        id: Date.now(),
        workerId: workerId,
        category: category,
        qty: qty,
        unit: unit,
        notes: notes,
        timestamp: new Date().toLocaleTimeString(),
        date: new Date().toLocaleDateString()
    };

    // Save to LocalStorage
    const reports = JSON.parse(localStorage.getItem('fieldReports') || "[]");
    reports.push(report);
    localStorage.setItem('fieldReports', JSON.stringify(reports));

    alert("✅ Data Logged Successfully!");

    // Clear Form
    document.getElementById('reportQty').value = "";
    document.getElementById('reportNotes').value = "";
}

// 2. SUPERVISOR: Load Operations Feed
function loadOpsFeed() {
    const list = document.getElementById('opsFeedList');
    if (!list) return;

    const reports = JSON.parse(localStorage.getItem('fieldReports') || "[]");

    // Sort by newest first
    reports.reverse();

    list.innerHTML = "";
    if (reports.length === 0) {
        list.innerHTML = `<li style="text-align:center; color:#999; padding:10px;">No reports yet.</li>`;
        return;
    }

    reports.forEach(rpt => {
        const li = document.createElement('li');
        li.style.padding = "15px";
        li.style.borderBottom = "1px solid #eee";
        li.innerHTML = `
            <div style="display:flex; justify-content:space-between;">
                <strong>Worker ${rpt.workerId}</strong>
                <small style="color:gray">${rpt.timestamp}</small>
            </div>
            <div style="margin-top:5px;">
                <span style="background:#dcfce7; color:#166534; padding:2px 8px; border-radius:10px; font-size:0.8rem; font-weight:bold;">
                    ${rpt.category}
                </span>
                <span style="font-weight:bold; margin-left:5px;">${rpt.qty} ${rpt.unit}</span>
            </div>
            <p style="margin:5px 0; color:#555; font-size:0.9rem;">"${rpt.notes}"</p>
        `;
        list.appendChild(li);
    });
}
// --- ADMIN REPORTING SYSTEM ---

// 1. WORKER: Submit Report to Admin
function submitAdminReport() {
    const type = document.getElementById('issueType').value;
    const desc = document.getElementById('issueDesc').value;
    const workerId = localStorage.getItem('currentUser');

    if (!desc) return alert("Please describe the issue.");

    const newReport = {
        id: Date.now(),
        workerId: workerId,
        type: type,
        desc: desc,
        status: 'Open',
        timestamp: new Date().toLocaleString()
    };

    // Save to LocalStorage (adminReports key)
    const reports = JSON.parse(localStorage.getItem('adminReports') || "[]");
    reports.push(newReport);
    localStorage.setItem('adminReports', JSON.stringify(reports));

    alert("🚨 Report sent to Admin successfully.");
    document.getElementById('issueDesc').value = ""; // Clear form
}

// 2. ADMIN: Load Reports
function loadAdminReports() {
    const list = document.getElementById('adminReportList');
    if (!list) return;

    const reports = JSON.parse(localStorage.getItem('adminReports') || "[]");

    // Sort by newest first
    reports.reverse();

    list.innerHTML = "";

    if (reports.length === 0) {
        list.innerHTML = `<li style="text-align:center; color:#999; padding:10px;">No active issues.</li>`;
        return;
    }

    reports.forEach(rpt => {
        const li = document.createElement('li');
        li.style.padding = "15px";
        li.style.borderBottom = "1px solid #eee";

        // Color code based on status
        const statusColor = rpt.status === 'Open' ? '#dc2626' : '#166534';
        const bg = rpt.status === 'Open' ? '#fee2e2' : '#dcfce7';

        li.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong>Worker ${rpt.workerId}</strong>
                <span style="font-size:0.75rem; color:#666;">${rpt.timestamp}</span>
            </div>
            <div style="margin:5px 0;">
                <span style="background:${bg}; color:${statusColor}; padding:2px 8px; border-radius:4px; font-size:0.8rem; font-weight:bold;">
                    ${rpt.type}
                </span>
            </div>
            <p style="margin:5px 0; color:#333;">"${rpt.desc}"</p>
            
            ${rpt.status === 'Open' ?
                `<button onclick="resolveIssue(${rpt.id})" class="btn-secondary" style="font-size:0.8rem; width:100%; margin-top:5px;">Mark as Resolved</button>`
                :
                `<div style="text-align:center; font-size:0.8rem; color:green; margin-top:5px;"><i class="fa-solid fa-check"></i> Resolved</div>`
            }
        `;
        list.appendChild(li);
    });
}

// 3. ADMIN: Resolve Issue
function resolveIssue(id) {
    const reports = JSON.parse(localStorage.getItem('adminReports') || "[]");
    const index = reports.findIndex(r => r.id === id);

    if (index !== -1) {
        reports[index].status = 'Resolved';
        localStorage.setItem('adminReports', JSON.stringify(reports));
        loadAdminReports(); // Refresh list
    }
}