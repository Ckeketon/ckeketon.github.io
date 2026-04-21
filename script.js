// КОНФІГ FIREBASE (ваш)
const firebaseConfig = {
  apiKey: "AIzaSyDEqsA1VXrjLyTixw-urcIyhco_x56kVtw",
  authDomain: "watch2-7672f.firebaseapp.com",
  databaseURL: "https://watch2-7672f-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "watch2-7672f",
  storageBucket: "watch2-7672f.firebasestorage.app",
  messagingSenderId: "535788651838",
  appId: "1:535788651838:web:a77c7989426e4697a1586f"
};

// Ініціалізація
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let roomRef = null;
let isUpdating = false;
const video = document.getElementById("video");
const statusDiv = document.getElementById("status");

function updateStatus(message, type = "info") {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  console.log(`[${type}] ${message}`);
}

// Приєднання до кімнати
window.joinRoom = function() {
  const room = document.getElementById("room").value.trim();
  if (!room) {
    updateStatus("❌ Введіть назву кімнати!", "error");
    return;
  }
  
  if (roomRef) {
    roomRef.off();
  }
  
  roomRef = db.ref("rooms/" + room);
  
  roomRef.on("value", (snapshot) => {
    const data = snapshot.val();
    console.log("Отримано:", data);
    
    if (!data) {
      updateStatus(`📭 Кімната "${room}" порожня`, "warning");
      return;
    }
    
    updateStatus(`✅ В кімнаті: ${room}`, "success");
    isUpdating = true;
    
    // Завантажуємо відео
    if (data.video && video.src !== data.video) {
      video.src = data.video;
      video.load();
      updateStatus("📺 Відео завантажено", "success");
    }
    
    // Синхронізація часу
    if (data.time !== undefined && Math.abs(video.currentTime - data.time) > 1) {
      video.currentTime = data.time;
    }
    
    // Синхронізація відтворення
    if (data.playing) {
      video.play().catch(e => updateStatus("⚠️ Натисніть Play", "warning"));
    } else {
      video.pause();
    }
    
    isUpdating = false;
  });
  
  updateStatus(`✅ Приєднано до "${room}"`, "success");
};

// Встановити відео
window.setVideo = function() {
  if (!roomRef) {
    updateStatus("❌ Спочатку Join!", "error");
    return;
  }
  
  const url = document.getElementById("videoUrl").value.trim();
  if (!url) {
    updateStatus("❌ Вставте посилання!", "error");
    return;
  }
  
  updateStatus("📤 Відправка...", "info");
  
  roomRef.set({
    video: url,
    time: 0,
    playing: false
  }).then(() => {
    updateStatus("✅ Відео відправлено!", "success");
  }).catch((error) => {
    updateStatus(`❌ Помилка: ${error.message}`, "error");
  });
};

// Синхронізація подій
video.addEventListener("play", () => {
  if (roomRef && !isUpdating) {
    roomRef.update({ playing: true, time: video.currentTime });
    console.log("▶️ Play");
  }
});

video.addEventListener("pause", () => {
  if (roomRef && !isUpdating) {
    roomRef.update({ playing: false, time: video.currentTime });
    console.log("⏸️ Pause");
  }
});

video.addEventListener("seeked", () => {
  if (roomRef && !isUpdating) {
    roomRef.update({ time: video.currentTime });
    console.log("⏩ Seek");
  }
});

updateStatus("✅ Готово! Введіть кімнату", "success");
