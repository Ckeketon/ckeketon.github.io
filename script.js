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

// Ініціалізація
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let roomRef = null;
let currentHls = null;
let isUpdating = false;

const video = document.getElementById("video");
const statusDiv = document.getElementById("status");
const roomInput = document.getElementById("room");
const videoUrlInput = document.getElementById("videoUrl");

function updateStatus(message, type = "info") {
  const statusDiv = document.getElementById("status");
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  console.log(`[${type}] ${message}`);
}

// Функція для отримання прямого посилання з Telegram
function getTelegramDirectUrl(url) {
  // Якщо це посилання на Telegram пост
  if (url.includes('t.me/') && !url.includes('.mp4') && !url.includes('.mkv')) {
    updateStatus("⚠️ Telegram: потрібне пряме посилання на відео файл. Спробуйте ПКМ на відео → Копіювати посилання", "warning");
    return null;
  }
  return url;
}

// Завантаження відео
function loadVideo(url) {
  if (!url) {
    updateStatus("⚠️ Немає URL відео", "warning");
    return;
  }
  
  // Обробка Telegram
  url = getTelegramDirectUrl(url);
  if (!url) return;
  
  updateStatus(`📺 Завантаження: ${url.substring(0, 50)}...`, "info");
  console.log("Завантаження URL:", url);
  
  // Очищаємо старі HLS об'єкти
  if (currentHls) {
    currentHls.destroy();
    currentHls = null;
  }
  
  // Для HLS стрімів (m3u8)
  if (url.includes('.m3u8')) {
    if (Hls.isSupported()) {
      currentHls = new Hls();
      currentHls.loadSource(url);
      currentHls.attachMedia(video);
      currentHls.on(Hls.Events.MANIFEST_PARSED, () => {
        updateStatus("✅ HLS відео готове", "success");
      });
      currentHls.on(Hls.Events.ERROR, (event, data) => {
        console.error("HLS помилка:", data);
        updateStatus("❌ Помилка HLS: можливо відео захищене", "error");
      });
    } else {
      video.src = url;
    }
  } 
  // Для звичайних відео (mp4, mkv, mov)
  else {
    video.src = url;
    updateStatus("✅ Відео завантажено", "success");
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
  
  roomRef = ref(db, "rooms/" + room);
  
  // Слухаємо зміни
  onValue(roomRef, (snapshot) => {
    const data = snapshot.val();
    console.log("Отримано дані з Firebase:", data);
    
    if (!data) {
      updateStatus(`📭 Кімната "${room}" порожня. Завантажте відео.`, "warning");
      return;
    }
    
    updateStatus(`✅ В кімнаті: ${room}`, "success");
    
    isUpdating = true;
    
    // Завантажуємо нове відео
    if (data.video && video.src !== data.video) {
      loadVideo(data.video);
    }
    
    // Синхронізація часу
    if (data.time !== undefined && Math.abs(video.currentTime - data.time) > 1) {
      video.currentTime = data.time;
    }
    
    // Синхронізація відтворення
    if (data.playing) {
      video.play().catch(e => {
        console.log("Автовідтворення заблоковано:", e);
        updateStatus("⚠️ Натисніть Play на відео", "warning");
      });
    } else {
      video.pause();
    }
    
    isUpdating = false;
  }, (error) => {
    updateStatus(`❌ Помилка: ${error.message}`, "error");
    console.error("Database помилка:", error);
  });
  
  updateStatus(`✅ Приєднано до кімнати "${room}"`, "success");
};

// Встановити відео
window.setVideo = function() {
  if (!roomRef) {
    updateStatus("❌ Спочатку приєднайтесь до кімнати (Join)!", "error");
    return;
  }
  
  let url = videoUrlInput.value.trim();
  if (!url) {
    updateStatus("❌ Вставте посилання на відео!", "error");
    return;
  }
  
  updateStatus(`📤 Відправка...`, "info");
  
  set(roomRef, {
    video: url,
    time: 0,
    playing: false
  }).then(() => {
    updateStatus("✅ Відео відправлено! Очікуйте синхронізації.", "success");
    console.log("Відео збережено в Firebase:", url);
  }).catch((error) => {
    updateStatus(`❌ Помилка: ${error.message}`, "error");
    console.error("Firebase помилка:", error);
  });
};

// Синхронізація подій
video.addEventListener("play", () => {
  if (roomRef && !isUpdating) {
    console.log("▶️ Play на", video.currentTime);
    update(roomRef, { playing: true, time: video.currentTime });
  }
});

video.addEventListener("pause", () => {
  if (roomRef && !isUpdating) {
    console.log("⏸️ Pause на", video.currentTime);
    update(roomRef, { playing: false, time: video.currentTime });
  }
});

video.addEventListener("seeked", () => {
  if (roomRef && !isUpdating) {
    console.log("⏩ Перемотка на", video.currentTime);
    update(roomRef, { time: video.currentTime });
  }
});

updateStatus("✅ Сайт готовий! Введіть кімнату та натисніть Join", "success");
console.log("✅ Watch Party готовий!");
