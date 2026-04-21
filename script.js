// Імпорт Firebase
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, update, onValue } from "firebase/database";

// ВАШ КОНФІГ FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyDEqsA1VXrjLyTixw-urcIyhco_x56kVtw",
  authDomain: "watch2-7672f.firebaseapp.com",
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
let isUpdating = false; // Запобігаємо зацикленню

const video = document.getElementById("video");
const statusDiv = document.getElementById("status");

// Завантаження відео
function loadVideo(url) {
  if (!url) return;
  
  if (currentHls) {
    currentHls.destroy();
    currentHls = null;
  }

  if (url.includes('.m3u8')) {
    if (Hls.isSupported()) {
      currentHls = new Hls();
      currentHls.loadSource(url);
      currentHls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
    }
  } else {
    video.src = url;
  }
}

// Приєднання до кімнати
window.joinRoom = function() {
  const room = document.getElementById("room").value;
  if (!room) {
    alert("Введіть назву кімнати!");
    return;
  }
  
  roomRef = ref(db, "rooms/" + room);
  
  // Слухаємо зміни в базі
  onValue(roomRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    
    // Оновлюємо стан відео без зациклення
    isUpdating = true;
    
    // Завантажуємо відео якщо нове
    if (data.video && video.src !== data.video) {
      loadVideo(data.video);
    }
    
    // Синхронізуємо час
    if (Math.abs(video.currentTime - data.time) > 0.5) {
      video.currentTime = data.time;
    }
    
    // Синхронізуємо відтворення/паузу
    if (data.playing) {
      video.play().catch(e => {
        console.log("Автовідтворення заблоковано");
        statusDiv.innerText = "⚠️ Клікніть по відео для відтворення";
      });
    } else {
      video.pause();
    }
    
    isUpdating = false;
  });
  
  statusDiv.innerText = `✅ Ви в кімнаті: ${room}`;
  alert(`✅ Ви в кімнаті: ${room}\nДайте другу цю назву!`);
};

// Встановити відео
window.setVideo = function() {
  if (!roomRef) {
    alert("Спочатку приєднайтесь до кімнати (Join)!");
    return;
  }
  
  const url = document.getElementById("videoUrl").value;
  if (!url) {
    alert("Вставте посилання на відео!");
    return;
  }
  
  set(roomRef, {
    video: url,
    time: 0,
    playing: false
  });
  
  statusDiv.innerText = "📺 Відео встановлено!";
};

// ВІДПРАВЛЯЄМО ПОДІЇ В БАЗУ (без зациклення)
video.addEventListener("play", () => {
  if (roomRef && !isUpdating) {
    update(roomRef, { 
      playing: true, 
      time: video.currentTime 
    });
  }
});

video.addEventListener("pause", () => {
  if (roomRef && !isUpdating) {
    update(roomRef, { 
      playing: false, 
      time: video.currentTime 
    });
  }
});

video.addEventListener("seeked", () => {
  if (roomRef && !isUpdating) {
    update(roomRef, { 
      time: video.currentTime 
    });
  }
});

// Додатково: синхронізація під час відтворення (кожну секунду)
video.addEventListener("timeupdate", () => {
  if (roomRef && !isUpdating && video.playing) {
    // Оновлюємо час в базі раз на секунду
    if (Math.abs(video.currentTime - (window._lastSentTime || 0)) > 1) {
      window._lastSentTime = video.currentTime;
      update(roomRef, { time: video.currentTime });
    }
  }
});

console.log("✅ Watch Party готовий до роботи!");
statusDiv.innerText = "✅ Сайт завантажено! Введіть кімнату та приєднуйтесь.";
