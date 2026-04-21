// Імпорт Firebase
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, update, onValue } from "firebase/database";

// ВИПРАВЛЕНИЙ КОНФІГ
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

window.joinRoom = function() {
  const room = document.getElementById("room").value;
  if (!room) {
    alert("Введіть назву кімнати!");
    return;
  }
  
  roomRef = ref(db, "rooms/" + room);
  
  onValue(roomRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    
    isUpdating = true;
    
    if (data.video && video.src !== data.video) {
      loadVideo(data.video);
    }
    
    if (Math.abs(video.currentTime - data.time) > 0.5) {
      video.currentTime = data.time;
    }
    
    if (data.playing) {
      video.play().catch(e => {
        console.log("Автовідтворення заблоковано");
      });
    } else {
      video.pause();
    }
    
    isUpdating = false;
  });
  
  statusDiv.innerText = `✅ Ви в кімнаті: ${room}`;
  console.log(`✅ Приєднались до кімнати: ${room}`);
};

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

video.addEventListener("play", () => {
  if (roomRef && !isUpdating) {
    console.log("▶️ Play");
    update(roomRef, { playing: true, time: video.currentTime });
  }
});

video.addEventListener("pause", () => {
  if (roomRef && !isUpdating) {
    console.log("⏸️ Pause");
    update(roomRef, { playing: false, time: video.currentTime });
  }
});

video.addEventListener("seeked", () => {
  if (roomRef && !isUpdating) {
    console.log("⏩ Seek");
    update(roomRef, { time: video.currentTime });
  }
});

console.log("✅ Watch Party готовий!");
statusDiv.innerText = "✅ Сайт завантажено! Введіть кімнату.";
