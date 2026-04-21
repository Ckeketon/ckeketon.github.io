// Імпорт Firebase (сучасний спосіб)
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
const video = document.getElementById("video");
const statusDiv = document.getElementById("status");

// Завантаження відео (mp4 або m3u8)
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
  
  statusDiv.innerText = "✅ Відео завантажено!";
}

// Приєднання до кімнати
window.joinRoom = function() {
  const room = document.getElementById("room").value;
  if (!room) {
    alert("Введіть назву кімнати!");
    return;
  }
  
  roomRef = ref(db, "rooms/" + room);
  
  // Слухаємо зміни
  onValue(roomRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    
    if (data.video) {
      loadVideo(data.video);
    }
    
    if (Math.abs(video.currentTime - (data.time || 0)) > 1) {
      video.currentTime = data.time || 0;
    }
    
    if (data.playing) {
      video.play().catch(e => {
        console.log("Потрібно клікнути по відео для авто відтворення");
        statusDiv.innerText = "⚠️ Клікніть по відео для відтворення";
      });
    } else {
      video.pause();
    }
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

// Синхронізація подій
video.addEventListener("play", () => {
  if (roomRef) {
    update(roomRef, { 
      playing: true, 
      time: video.currentTime 
    });
  }
});

video.addEventListener("pause", () => {
  if (roomRef) {
    update(roomRef, { 
      playing: false, 
      time: video.currentTime 
    });
  }
});

video.addEventListener("seeked", () => {
  if (roomRef) {
    update(roomRef, { 
      time: video.currentTime 
    });
  }
});

console.log("✅ Watch Party готовий до роботи!");
statusDiv.innerText = "✅ Сайт завантажено! Введіть кімнату та приєднуйтесь.";
