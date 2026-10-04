import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// Replace with your Firebase Web App config.
const firebaseConfig = {
  apiKey: "PASTE_YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let user;

async function boot(){
  const cred = await signInAnonymously(auth);
  user = cred.user;
}
boot().catch(e => {
  document.querySelector("#pwMsg").textContent = "Firebase setup হয়নি: " + e.message;
});

document.querySelector("#checkPassword").onclick = () => {
  const p = document.querySelector("#password").value;
  // First-stage gate only. Do not treat client-side passwords as a secure secret.
  if (p === "emonvai1587") {
    document.querySelector("#step2").classList.remove("hidden");
    document.querySelector("#pwMsg").textContent = "Password ঠিক আছে।";
  } else {
    document.querySelector("#pwMsg").textContent = "Password ভুল।";
  }
};

document.querySelector("#requestBtn").onclick = async () => {
  if (!user) return;
  if (!document.querySelector("#followed").checked) {
    document.querySelector("#requestMsg").textContent = "আগে দুইটি profile follow করে checkbox দিন।";
    return;
  }
  const ref = doc(db, "downloadRequests", user.uid);
  await setDoc(ref, {
    uid: user.uid,
    followedConfirmedByUser: true,
    approved: false,
    createdAt: serverTimestamp()
  }, {merge:true});
  document.querySelector("#step3").classList.remove("hidden");
  document.querySelector("#requestMsg").textContent = "Request পাঠানো হয়েছে।";
};

document.querySelector("#checkBtn").onclick = async () => {
  if (!user) return;
  const snap = await getDoc(doc(db, "downloadRequests", user.uid));
  if (!snap.exists()) {
    document.querySelector("#status").textContent = "কোনো request পাওয়া যায়নি।";
    return;
  }
  if (snap.data().approved === true) {
    // The protected endpoint should verify the same Firebase user server-side.
    const btn = document.querySelector("#downloadBtn");
    btn.classList.remove("hidden");
    btn.onclick = async (ev) => {
      ev.preventDefault();
      try {
        const token = await user.getIdToken();
        const r = await fetch("https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/downloadApk", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!r.ok) throw new Error(await r.text());
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "EMON-Mod-manu-PROXY-TNT-location-panel-V18.apk";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (e) {
        document.querySelector("#status").textContent = "Download failed: " + e.message;
      }
    };
    document.querySelector("#status").textContent = "Approved — এখন APK download করতে পারবেন।";
  } else {
    document.querySelector("#status").textContent = "এখনও approval দেওয়া হয়নি।";
  }
};
