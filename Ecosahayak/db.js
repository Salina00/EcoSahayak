let db = null;
const DB_NAME = "ecoSahayakDB";
const DB_VERSION = 1;
const STORE_NAME = "attendance";

/* -------------------------------
   OPEN / CREATE DATABASE
-------------------------------- */
export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {
      const database = event.target.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true
        });
      }
    };

    request.onsuccess = event => {
      db = event.target.result;
      resolve(db);
    };

    request.onerror = () => {
      reject("Failed to open IndexedDB");
    };
  });
}

/* -------------------------------
   ADD ATTENDANCE RECORD
-------------------------------- */
export function addAttendanceRecord(data) {
  if (!db) return;

  const transaction = db.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);

  const record = {
    workerName: data.workerName,
    latitude: data.latitude,
    longitude: data.longitude,
    distance: data.distance,
    timestamp: Date.now(),
    synced: false
  };

  store.add(record);
}

/* -------------------------------
   GET ALL RECORDS (HISTORY)
-------------------------------- */
export function getAllAttendance() {
  return new Promise(resolve => {
    if (!db) {
      resolve([]);
      return;
    }

    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

/* -------------------------------
   DELETE RECORD (CHALLENGE)
-------------------------------- */
export function deleteAttendance(id) {
  if (!db) return;

  const transaction = db.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  store.delete(id);
}

/* -------------------------------
   SYNC LOGIC (OFFLINE → ONLINE)
-------------------------------- */
export async function syncAttendance() {
  if (!navigator.onLine || !db) return;

  const records = await getAllAttendance();
  const unsyncedRecords = records.filter(r => r.synced === false);

  if (unsyncedRecords.length === 0) return;

  try {
    // Dummy API (for demo / judging)
    await fetch("https://example.com/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(unsyncedRecords)
    });

    // On success, delete local copies
    unsyncedRecords.forEach(r => deleteAttendance(r.id));

    console.log("Attendance synced successfully");
  } catch (error) {
    console.error("Sync failed, will retry later");
  }
}

/* -------------------------------
   AUTO-SYNC WHEN INTERNET RETURNS
-------------------------------- */
window.addEventListener("online", syncAttendance);
