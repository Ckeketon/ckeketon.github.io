import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, update, onValue } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDEqsA1VXrjLyTixw-urcIyhco_x56kVtw",
  authDomain: "watch2-7672f.firebaseapp.com",
  databaseURL: "https://watch2-767f2f-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "watch2-7672f",
  storageBucket: "watch2-7672f.firebasestorage.app",
  messagingSenderId: "535788651838",
  appId: "1:535788651838:web:a77c7989426e4697a1586f",
  measurementId: "G-F629PTYGLJ"
};

// Ініціалізація Firebase
let app, db;
try {
  app = initializeApp(firebaseConfig);
  db = getDatabase(app);
  updateStatus("✅ Firebase підключено", "success");
  console.log("✅ Firebase ініціалізовано");
} catch (e) {
  updateStatus("❌ Помилка Firebase: " + e.message, "error");
  console.error("Firebase error:", e);
}

let roomRef = null;
let currentHls = null;
let isUpdating = false;
let isConnected = false;

const video = document.getElementById("video");
const roomInput = document.getElementById("room");
const videoUrlInput = document.getElementById("videoUrl");

function updateStatus(message, type = "info") {
  const statusDiv = document.getElementById("status");
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  console.log(`[${type}] ${message}`);
}

// Завантаження відео
function loadVideo(url) {
  if (!url) {
    updateStatus("⚠️ Немає URL відео", "warning");
    return;
  }
  
  updateStatus(`📺 Завантаження відео...`, "info");
  console.log("Завантаження:", url);
  
  if (currentHls) {
    currentHls.destroy();
    currentHls = null;
  }

  if (url.includes('.m3u8')) {
    if (Hls.isSupported()) {
      currentHls = new Hls();
      currentHls.loadSource(url);
      currentHls.attachMedia(video);
      currentHls.on(Hls.Events.MANIFEST_PARSED, () => {
        updateStatus("✅ Відео готове (HLS)", "success");
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      updateStatus("✅ Відео готове (Safari)", "success");
    } else {
      updateStatus("❌ HLS не підтримується", "error");
    }
  } else {
    video.src = url;
    updateStatus("✅ Відео готове (MP4)", "success");
  }
}

// Приєднання до кімнати
window.joinRoom = function() {
  const room = roomInput.value.trim();
  if (!room) {
    updateStatus("❌ Введіть назву кімнати!", "error");
    return;
  }
  
  if (!db) {
    updateStatus("❌ Firebase не готовий. Оновіть сторінку.", "error");
    return;
  }
  
  updateStatus(`🔗 Підключення до кімнати: ${room}...`, "info");
  
  roomRef = ref(db, "rooms/" + room);
  
  // Перевіряємо підключення
  onValue(roomRef, (snapshot) => {
    const data = snapshot.val();
    console.log("Отримано дані:", data);
    
    if (!data) {
      updateStatus(`📭 Кімната "${room}" порожня. Завантажте відео.`, "warning");
      return;
    }
    
    updateStatus(`✅ В кімнаті: ${room}`, "success");
    isConnected = true;
    
    isUpdating = true;
    
    if (data.video && video.src !== data.video) {
      loadVideo(data.video);
    }
    
    if (data.time !== undefined && Math.abs(video.currentTime - data.time) > 1) {
      video.currentTime = data.time;
    }
    
    if (data.playing) {
      video.play().catch(e => {
        console.log("Автовідтворення заблоковано:", e);
        updateStatus("⚠️ Торкніться відео для відтворення", "warning");
      });
    } else {
      video.pause();
    }
    
    isUpdating = false;
  }, (error) => {
    updateStatus(`❌ Помилка: ${error.message}`, "error");
    console.error("Database error:", error);
  });
  
  updateStatus(`✅ Приєднано до кімнати "${room}"`, "success");
};

// Встановити відео
window.setVideo = function() {
  if (!roomRef) {
    updateStatus("❌ Спочатку приєднайтесь до кімнати (Join)!", "error");
    return;
  }
  
  const url = videoUrlInput.value.trim();
  if (!url) {
    updateStatus("❌ Вставте посилання на відео!", "error");
    return;
  }
  
  updateStatus(`📤 Відправка відео...`, "info");
  
  set(roomRef, {
    video: url,
    time: 0,
    playing: false
  }).then(() => {
    updateStatus("✅ Відео відправлено!", "success");
    console.log("Відео встановлено:", url);
  }).catch((error) => {
    updateStatus(`❌ Помилка: ${error.message}`, "error");
    console.error("Set error:", error);
  });
};

// Синхронізація
video.addEventListener("play", () => {
  if (roomRef && !isUpdating && isConnected) {
    console.log("▶️ Play");
    update(roomRef, { playing: true, time: video.currentTime });
  }
});

video.addEventListener("pause", () => {
  if (roomRef && !isUpdating && isConnected) {
    console.log("⏸️ Pause");
    update(roomRef, { playing: false, time: video.currentTime });
  }
});

video.addEventListener("seeked", () => {
  if (roomRef && !isUpdating && isConnected) {
    console.log("⏩ Seek to:", video.currentTime);
    update(roomRef, { time: video.currentTime });
  }
});

// Для мобільних: обробка дотиків
video.addEventListener("touchstart", () => {
  console.log("👆 Торкнулись відео");
});

updateStatus("✅ Готово! Введіть кімнату та натисніть Join", "success");
console.log("✅ Watch Party готовий!");
