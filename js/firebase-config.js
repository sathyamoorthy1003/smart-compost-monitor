// Firebase Configuration
// From your Firebase project: bengaluru-climate
const firebaseConfig = {
  apiKey: "AIzaSyCMs-JFDAz9eCPw-CleuhkzrW__xFw2NME",
  authDomain: "bengaluru-climate.firebaseapp.com",
  projectId: "bengaluru-climate",
  storageBucket: "bengaluru-climate.firebasestorage.app",
  messagingSenderId: "827119009856",
  appId: "1:827119009856:web:fe95f86d358815def09fa5",
  measurementId: "G-08VT0PR0ZP",
  // Realtime Database URL — Singapore (asia-southeast1)
  databaseURL: "https://bengaluru-climate-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

