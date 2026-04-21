// ===== ВАШ КОНФІГ FIREBASE (який ви отримали) =====
const firebaseConfig = {
  apiKey: "AIzaSyA45bS0mvdqH2xhlOAqCpRs6IXdKBrymwE",
  authDomain: "realtime-database-c1c57.firebaseapp.com",
  projectId: "realtime-database-c1c57",
  storageBucket: "realtime-database-c1c57.firebasestorage.app",
  messagingSenderId: "246127015513",
  appId: "1:246127015513:web:6e54cb07b9e3540b892348",
  measurementId: "G-Y2CFW4QD2T"
};

// Ініціалізація Firebase (працює з версією 8)
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let roomRef;
let currentHls = null;
const video = document.getElementById("video");

// Функція завантаження відео (підтримує mp4 та m3u8)
function loadVideo(url) {
  if (!url) return;
  
  // Знищуємо старий HLS об'єкт, якщо був
  if (currentHls) {
    currentHls.destroy();
    currentHls = null;
  }

  // Перевіряємо чи це .m3u8
  if (url.includes('.m3u8')) {
    if (Hls.isSupported()) {
      currentHls = new Hls();
      currentHls.loadSource(url);
      currentHls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
    }
  } else {
    // Звичайне відео (mp4)
    video.src = url;
  }
}

// Приєднання до кімнати
function joinRoom() {
  const room = document.getElementById("room").value;
  if (!room) {
    alert("Введіть назву кімнати!");
    return;
  }
  
  roomRef = db.ref("rooms/" + room);
  
  // Слухаємо зміни в кімнаті
  roomRef.on("value", (snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    
    // Завантажуємо відео
    if (data.video) {
      loadVideo(data.video);
    }
    
    // Синхронізуємо час
    if (Math.abs(video.currentTime - (data.time || 0)) > 1) {
      video.currentTime = data.time || 0;
    }
    
    // Синхронізуємо відтворення
    if (data.playing) {
      video.play().catch(e => console.log("Автовідтворення заблоковано:", e));
    } else {
      video.pause();
    }
  });
  
  alert("Ви в кімнаті: " + room);
}

// Встановити нове відео
function setVideo() {
  if (!roomRef) {
    alert("Спочатку приєднайтесь до кімнати (Join)!");
    return;
  }
  
  const url = document.getElementById("videoUrl").value;
  if (!url) {
    alert("Вставте посилання на відео!");
    return;
  }
  
  roomRef.set({
    video: url,
    time: 0,
    playing: false
  });
  
  alert("Відео завантажено!");
}

// ===== СИНХРОНІЗАЦІЯ ПОДІЙ =====
video.addEventListener("play", () => {
  if (roomRef) {
    roomRef.update({
      playing: true,
      time: video.currentTime
    });
  }
});

video.addEventListener("pause", () => {
  if (roomRef) {
    roomRef.update({
      playing: false,
      time: video.currentTime
    });
  }
});

video.addEventListener("seeked", () => {
  if (roomRef) {
    roomRef.update({
      time: video.currentTime
    });
  }
});

console.log("✅ Сайт готовий до роботи!");
