# EcoSahayak
A robust workforce management solution designed for low-connectivity environments. Features include offline geofencing, auto-sync, biometric verification to prevent ghost workers, and an accessible icon-based UI.

## 🚀 Key Features
* **Offline-First:** Works completely without internet using **IndexedDB**.
* **Geofencing:** Restricts attendance marking to specific job sites using the **Geolocation API**.
* **Auto-Sync:** Automatically uploads locally stored data to the server once connectivity is restored.
* **PWA:** Installable on mobile devices directly from the browser (no App Store required).

## 🛠️ Tech Stack
* **Frontend:** HTML, CSS, JavaScript (PWA Service Workers)
* **Storage:** IndexedDB (Browser-based local database)
* **Location:** HTML5 Geolocation API
* **Backend:** [Mention your backend here, e.g., Node.js/Firebase]

## 🔄 How It Works (Step-by-Step)

### 1. User Login & Initialization
The worker opens the app. Service Workers cache the assets, allowing the app to load instantly even if the device is offline.

### 2. Location Verification (Geofencing)
When the worker attempts to mark attendance:
* The app requests the device's GPS coordinates.
* It calculates the distance between the worker and the assigned site.
* **Validation:** If the worker is outside the allowed radius (Geofence), the action is blocked.

### 3. Offline Data Storage (IndexedDB)
* **Scenario:** If there is NO internet.
* The attendance record (Time + Location + UserID) is saved locally in the browser's **IndexedDB**.
* The user gets a success message: *"Saved Offline"*.

### 4. Auto-Synchronization
* The app listens for the "online" event.
* Once the internet returns, a background process fetches data from **IndexedDB** and pushes it to the central database.
* Local data is cleared after a successful upload to prevent duplication.

## 📦 Installation
1. Clone the repository:
   ```bash
   git clone [https://github.com/Salina00/EcoSahayak.git](https://github.com/Salina00/EcoSahayak.git)