// ===== ВАЖЛИВО: ВСТАВТЕ СЮДИ ВАШ URL З FIREBASE =====
// Він має виглядати так: https://watch2-7672f-default-rtdb.europe-west1.firebasedatabase.app

const firebaseConfig = {
  apiKey: "AIzaSyDEqsA1VXrjLyTixw-urcIyhco_x56kVtw",
  authDomain: "watch2-7672f.firebaseapp.com",
 databaseURL: "https://watch2-7672f-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "watch2-7672f",
  storageBucket: "watch2-7672f.firebasestorage.app",
  messagingSenderId: "535788651838",
  appId: "1:535788651838:web:a77c7989426e4697a1586f"
};

// Перевірка підключення
console.log("Підключення до:", firebaseConfig.databaseURL);

// Ініціалізація
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Перевірка підключення
const connectedRef = firebase.database().ref(".info/connected");
connectedRef.on("value", (snap) => {
  if (snap.val() === true) {
    console.log("✅ Підключено до Firebase!");
    updateStatus("✅ Підключено до Firebase!", "success");
  } else {
    console.log("❌ Немає підключення до Firebase");
    updateStatus("❌ Немає підключення до Firebase!", "error");
  }
});

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
    console.log("Отримано з Firebase:", data);
    
    if (!data) {
      updateStatus(`📭 Кімната "${room}" порожня. Завантажте відео.`, "warning");
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
      console.log("Синхронізація часу:", data.time);
    }
    
    // Синхронізація відтворення
    if (data.playing) {
      video.play().catch(e => updateStatus("⚠️ Натисніть Play на відео", "warning"));
    } else {
      video.pause();
    }
    
    isUpdating = false;
  }, (error) => {
    console.error("Помилка бази:", error);
    updateStatus(`❌ Помилка: ${error.message}`, "error");
  });
  
  updateStatus(`✅ Приєднано до "${room}"`, "success");
};

// Встановити відео
window.setVideo = function() {
  if (!roomRef) {
    updateStatus("❌ Спочатку натисніть Join!", "error");
    return;
  }
  
  const url = document.getElementById("videoUrl").value.trim();
  if (!url) {
    updateStatus("❌ Вставте посилання на відео!", "error");
    return;
  }
  
  updateStatus("📤 Відправка в Firebase...", "info");
  console.log("Відправляємо:", url);
  
  roomRef.set({
    video: url,
    time: 0,
    playing: false
  }).then(() => {
    updateStatus("✅ Відео відправлено!", "success");
    console.log("✅ Відео збережено в Firebase");
  }).catch((error) => {
    updateStatus(`❌ Помилка: ${error.message}`, "error");
    console.error("Помилка при збереженні:", error);
  });
};

// Синхронізація подій
video.addEventListener("play", () => {
  if (roomRef && !isUpdating) {
    console.log("▶️ Play, час:", video.currentTime);
    roomRef.update({ playing: true, time: video.currentTime });
  }
});

video.addEventListener("pause", () => {
  if (roomRef && !isUpdating) {
    console.log("⏸️ Pause, час:", video.currentTime);
    roomRef.update({ playing: false, time: video.currentTime });
  }
});

video.addEventListener("seeked", () => {
  if (roomRef && !isUpdating) {
    console.log("⏩ Перемотка на:", video.currentTime);
    roomRef.update({ time: video.currentTime });
  }
});

updateStatus("✅ Готово! Введіть кімнату", "success");
