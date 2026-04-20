// 🔥 ВСТАВ СЮДИ СВІЙ Firebase config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
};

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
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
    }
  } else {
    video.src = url;
  }
}

// 🔗 Приєднання до кімнати
function joinRoom() {
  const room = document.getElementById("room").value;
  roomRef = db.ref("rooms/" + room);

  roomRef.on("value", (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    loadVideo(data.video || "");

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

// ▶️ Синхронізація
video.addEventListener("play", () => {
  if (!roomRef) return;

  roomRef.update({
    playing: true,
    time: video.currentTime
  });
});

video.addEventListener("pause", () => {
  if (!roomRef) return;

  roomRef.update({
    playing: false,
    time: video.currentTime
  });
});

video.addEventListener("seeked", () => {
  if (!roomRef) return;

  roomRef.update({
    time: video.currentTime
  });
});
