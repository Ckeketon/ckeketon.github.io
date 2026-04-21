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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let roomRef = null;
let isUpdating = false;
let currentVideoType = null;
let youtubePlayer = null;
let currentHls = null;

const roomInput = document.getElementById("room");
const videoUrlInput = document.getElementById("videoUrl");
const container = document.getElementById("video-container");
const statusDiv = document.getElementById("status");

function updateStatus(message, type = "info") {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  console.log(`[${type}] ${message}`);
}

// Функція для визначення типу відео
function getVideoType(url) {
  if (!url) return null;
  if (url.includes('youtube.com/watch') || url.includes('youtu.be/') || url.includes('youtube.com/embed')) {
    return 'youtube';
  }
  if (url.includes('.m3u8')) return 'hls';
  if (url.includes('.mp4') || url.includes('.mkv') || url.includes('.mov')) return 'mp4';
  return null;
}

// Отримати YouTube ID
function getYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&]+)/,
    /(?:youtu\.be\/)([^?]+)/,
    /(?:youtube\.com\/embed\/)([^?]+)/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Створити YouTube плеєр
function createYouTubePlayer(videoId, currentTime = 0, isPlaying = false) {
  container.innerHTML = '<div id="youtube-player"></div>';
  
  if (youtubePlayer) {
    youtubePlayer.destroy();
  }
  
  new YT.Player('youtube-player', {
    height: '450',
    width: '100%',
    videoId: videoId,
    playerVars: {
      'autoplay': isPlaying ? 1 : 0,
      'controls': 1,
      'enablejsapi': 1,
      'modestbranding': 1,
      'rel': 0
    },
    events: {
      'onReady': (event) => {
        youtubePlayer = event.target;
        if (currentTime > 0) {
          youtubePlayer.seekTo(currentTime, true);
        }
        updateStatus("✅ YouTube плеєр готовий", "success");
      },
      'onStateChange': (event) => {
        if (!roomRef || isUpdating) return;
        
        const state = event.data;
        const time = youtubePlayer.getCurrentTime();
        
        if (state === YT.PlayerState.PLAYING) {
          update(roomRef, { playing: true, time: time });
        } else if (state === YT.PlayerState.PAUSED) {
          update(roomRef, { playing: false, time: time });
        }
      }
    }
  });
}

// Створити HLS плеєр
function createHlsPlayer(url, currentTime = 0, isPlaying = false) {
  container.innerHTML = '<video id="video-player" width="100%" controls></video>';
  const video = document.getElementById('video-player');
  
  if (currentHls) {
    currentHls.destroy();
    currentHls = null;
  }
  
  currentHls = new Hls();
  currentHls.loadSource(url);
  currentHls.attachMedia(video);
  
  currentHls.on(Hls.Events.MANIFEST_PARSED, () => {
    if (currentTime > 0) video.currentTime = currentTime;
    if (isPlaying) video.play();
  });
  
  // Синхронізація
  video.addEventListener('play', () => {
    if (roomRef && !isUpdating) {
      update(roomRef, { playing: true, time: video.currentTime });
    }
  });
  
  video.addEventListener('pause', () => {
    if (roomRef && !isUpdating) {
      update(roomRef, { playing: false, time: video.currentTime });
    }
  });
  
  video.addEventListener('seeked', () => {
    if (roomRef && !isUpdating) {
      update(roomRef, { time: video.currentTime });
    }
  });
}

// Створити MP4 плеєр
function createMp4Player(url, currentTime = 0, isPlaying = false) {
  container.innerHTML = '<video id="video-player" width="100%" controls></video>';
  const video = document.getElementById('video-player');
  video.src = url;
  
  if (currentTime > 0) video.currentTime = currentTime;
  if (isPlaying) video.play();
  
  video.addEventListener('play', () => {
    if (roomRef && !isUpdating) {
      update(roomRef, { playing: true, time: video.currentTime });
    }
  });
  
  video.addEventListener('pause', () => {
    if (roomRef && !isUpdating) {
      update(roomRef, { playing: false, time: video.currentTime });
    }
  });
  
  video.addEventListener('seeked', () => {
    if (roomRef && !isUpdating) {
      update(roomRef, { time: video.currentTime });
    }
  });
}

// Завантажити відео
function loadVideo(url, currentTime = 0, isPlaying = false) {
  const type = getVideoType(url);
  if (!type) {
    updateStatus("❌ Невідомий тип відео. Спробуйте YouTube або .mp4", "error");
    return;
  }
  
  currentVideoType = type;
  updateStatus(`📺 Завантаження ${type.toUpperCase()}...`, "info");
  
  if (type === 'youtube') {
    const videoId = getYouTubeId(url);
    if (!videoId) {
      updateStatus("❌ Неправильне YouTube посилання", "error");
      return;
    }
    createYouTubePlayer(videoId, currentTime, isPlaying);
  } else if (type === 'hls') {
    createHlsPlayer(url, currentTime, isPlaying);
  } else if (type === 'mp4') {
    createMp4Player(url, currentTime, isPlaying);
  }
}

// Синхронізація для YouTube
function syncYouTubePlayer(time, playing) {
  if (youtubePlayer && typeof youtubePlayer.seekTo === 'function') {
    if (Math.abs(youtubePlayer.getCurrentTime() - time) > 1) {
      youtubePlayer.seekTo(time, true);
    }
    if (playing && youtubePlayer.getPlayerState() !== YT.PlayerState.PLAYING) {
      youtubePlayer.playVideo();
    } else if (!playing && youtubePlayer.getPlayerState() === YT.PlayerState.PLAYING) {
      youtubePlayer.pauseVideo();
    }
  }
}

// Синхронізація для відео плеєра
function syncVideoPlayer(time, playing) {
  const video = document.getElementById('video-player');
  if (!video) return;
  
  if (Math.abs(video.currentTime - time) > 1) {
    video.currentTime = time;
  }
  if (playing) {
    video.play().catch(e => console.log("Автовідтворення заблоковано"));
  } else {
    video.pause();
  }
}

// Приєднання до кімнати
window.joinRoom = function() {
  const room = roomInput.value.trim();
  if (!room) {
    updateStatus("❌ Введіть назву кімнати!", "error");
    return;
  }
  
  roomRef = ref(db, "rooms/" + room);
  
  onValue(roomRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      updateStatus(`📭 Кімната "${room}" порожня`, "warning");
      return;
    }
    
    updateStatus(`✅ В кімнаті: ${room}`, "success");
    isUpdating = true;
    
    // Завантажуємо нове відео
    if (data.video) {
      loadVideo(data.video, data.time || 0, data.playing || false);
    }
    
    // Синхронізація для поточного плеєра
    setTimeout(() => {
      if (currentVideoType === 'youtube') {
        syncYouTubePlayer(data.time || 0, data.playing || false);
      } else {
        syncVideoPlayer(data.time || 0, data.playing || false);
      }
      isUpdating = false;
    }, 500);
  });
  
  updateStatus(`✅ Приєднано до "${room}"`, "success");
};

// Встановити відео
window.setVideo = function() {
  if (!roomRef) {
    updateStatus("❌ Спочатку Join!", "error");
    return;
  }
  
  const url = videoUrlInput.value.trim();
  if (!url) {
    updateStatus("❌ Вставте посилання!", "error");
    return;
  }
  
  updateStatus(`📤 Відправка...`, "info");
  
  set(roomRef, {
    video: url,
    time: 0,
    playing: false
  }).then(() => {
    updateStatus("✅ Відео відправлено!", "success");
  }).catch((error) => {
    updateStatus(`❌ Помилка: ${error.message}`, "error");
  });
};

updateStatus("✅ Готово! Введіть кімнату та YouTube посилання", "success");
