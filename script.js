// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA45bS0mvdqH2xhlOAqCpRs6IXdKBrymwE",
  authDomain: "realtime-database-c1c57.firebaseapp.com",
  projectId: "realtime-database-c1c57",
  storageBucket: "realtime-database-c1c57.firebasestorage.app",
  messagingSenderId: "246127015513",
  appId: "1:246127015513:web:6e54cb07b9e3540b892348",
  measurementId: "G-Y2CFW4QD2T"
};

// Ініціалізація Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let roomRef;
let currentHls = null;

const video = document.getElementById("video");


// 🎬 Завантаження відео (mp4 + m3u8)
function loadVideo(url) {
  if (currentHls) {
    currentHls.destroy();
    currentHls = null;
  }

  if (url.endsWith(".m3u8")) {
    if (Hls.isSupported()) {
      currentHls = new Hls();
      currentHls.loadSource(url);
      currentHls.attachMedia(video);
    } else {
      video.src = url;
    }
  } else {
    video.src = url;
  }
}


// 🔗 Join кімнати
function joinRoom() {
  const room = document.getElementById("room").value;
  roomRef = db.ref("rooms/" + room);

  roomRef.on("value", (snap) => {
    const data = snap.val();
    if (!data) return;

    if (data.video) loadVideo(data.video);

    if (Math.abs(video.currentTime - data.time) > 1) {
      video.currentTime = data.time || 0;
    }

    if (data.playing) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  });
}


// 📺 Встановити відео
function setVideo() {
  const url = document.getElementById("videoUrl").value;

  roomRef.set({
    video: url,
    time: 0,
    playing: false
  });
}


// ▶️ Play
video.addEventListener("play", () => {
  if (!roomRef) return;

  roomRef.update({
    playing: true,
    time: video.currentTime
  });
});


// ⏸ Pause
video.addEventListener("pause", () => {
  if (!roomRef) return;

  roomRef.update({
    playing: false,
    time: video.currentTime
  });
});


// ⏩ Seek
video.addEventListener("seeked", () => {
  if (!roomRef) return;

  roomRef.update({
    time: video.currentTime
  });
});
