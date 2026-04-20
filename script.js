const firebaseConfig = {
  apiKey: "ТУТ_БУДЕ_API_KEY",
  authDomain: "ТВОЙ_PROJECT.firebaseapp.com",
  databaseURL: "https://ТВОЙ_PROJECT-default-rtdb.firebaseio.com",
  projectId: "ТВОЙ_PROJECT",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let roomRef;
const video = document.getElementById("video");

function joinRoom() {
  const room = document.getElementById("room").value;
  roomRef = db.ref("rooms/" + room);

  roomRef.on("value", (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    video.src = data.video || "";
    video.currentTime = data.time || 0;

    if (data.playing) video.play();
    else video.pause();
  });
}

function setVideo() {
  const url = document.getElementById("videoUrl").value;
  roomRef.set({
    video: url,
    time: 0,
    playing: false
  });
}

video.addEventListener("play", () => {
  roomRef.update({
    playing: true,
    time: video.currentTime
  });
});

video.addEventListener("pause", () => {
  roomRef.update({
    playing: false,
    time: video.currentTime
  });
});

video.addEventListener("seeked", () => {
  roomRef.update({
    time: video.currentTime
  });
});
