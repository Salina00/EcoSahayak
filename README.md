# 🏗️ EcoSahayak - Smart Workforce Management System

![Status](https://img.shields.io/badge/Status-Prototype-orange) ![PWA](https://img.shields.io/badge/PWA-Offline%20Ready-green) ![Stack](https://img.shields.io/badge/Tech-HTML%20%7C%20JS%20%7C%20Google%20Apps%20Script-blue)

**EcoSahayak** is a serverless, offline-first Progressive Web App (PWA) designed to eliminate "ghost workers" and streamline attendance tracking for remote construction sites. It combines GPS geofencing, selfie verification, and real-time cloud syncing without requiring expensive hardware.

---

### 🚩 The Problem
Construction and remote industrial sites face three critical challenges:
1.  **Attendance Fraud:** "Ghost workers" who mark attendance without being on-site.
2.  **Connectivity Issues:** Remote sites often have poor internet, breaking traditional apps.
3.  **Safety Delays:** Reporting hazards (like a leak or fire risk) takes too long to reach HQ.

### 💡 The Solution
EcoSahayak turns any standard smartphone into a secure biometric terminal.
* **Zero Hardware:** Runs entirely in the browser.
* **Offline First:** Workers can check in without internet; data syncs when back online.
* **Role-Based:** Distinct interfaces for Workers, Supervisors, and Admins.

---

### 🚀 Key Features

#### 👷 For Workers
* **Geo-Fenced Attendance:** "Start Day" button unlocks only within 500m of the site.
* **Selfie Verification:** Captures photo proof with timestamp and location.
* **Offline Mode:** Fully functional UI even in "Airplane Mode" (PWA) via Service Workers.
* **Safety Reporting:** One-click SOS and hazard reporting to the dashboard.
* **Leave Requests:** Apply for time off directly from the app.
* **Task List:** Track daily assigned tasks.

#### 👷‍♂️ For Supervisors (On-Site)
* **Live Muster Roll:** See exactly who is "Active" on-site in real-time.
* **High-Vis Dashboard:** Orange-themed UI designed for field use.
* **Upcoming Leaves:** View leave requests from the team.

#### 👨‍💼 For Admins (HQ)
* **Live Analytics:** Doughnut charts showing Present vs. Absent vs. Late.
* **Safety Feed:** Instant alerts for reported hazards.
* **Leave Management:** Centralized view of all leave requests.
* **Google Sheets Backend:** All data exports automatically to a structured spreadsheet (Attendance, Reports, Leaves).

---

### 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3, Vanilla JavaScript.
* **Maps:** Leaflet.js (OpenStreetMap).
* **Charts:** Chart.js.
* **Backend (Serverless):** Google Apps Script.
* **Database:** Google Sheets (Tabs: `Attendance`, `Reports`, `Leaves`).
* **Offline Storage:** PWA Service Workers (`sw.js`) & LocalStorage.

---

### 🔄 How It Works (Step-by-Step)

#### 1. User Login & Initialization
The user logs in. If offline, the app validates credentials against locally stored data (`localStorage`). Service Workers cache assets so the UI loads instantly.

#### 2. Location Verification (Geofencing)
When a worker attempts to mark attendance:
* The app requests GPS coordinates.
* It calculates the distance to the job site.
* **Validation:** If the worker is outside the 500m radius, the action is blocked.

#### 3. Data Syncing
* **Online:** Data (Attendance, Reports, Leaves) is sent instantly to the Google Apps Script backend.
* **Offline:** (Future Scope) Data is stored locally and auto-synced when the connection returns.

#### 4. Supervisor & Admin Monitoring
* Admins and Supervisors pull real-time data from the Google Sheet via the `doGet` API to update their dashboards and charts.

---

### 📦 Installation & Setup

#### Prerequisites
* A Google Account (for the database).
* A code editor (VS Code).
* A local server (e.g., Live Server extension).

#### Step 1: Clone the Repo
```bash
git clone [https://github.com/Salina00/EcoSahayak.git](https://github.com/Salina00/EcoSahayak.git)
cd EcoSahayak
