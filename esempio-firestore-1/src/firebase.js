// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCpruG4udN3v6BjijUH0n6s7KfsAyOK5LY",
  authDomain: "fir-cava-c38b9.firebaseapp.com",
  projectId: "fir-cava-c38b9",
  storageBucket: "fir-cava-c38b9.firebasestorage.app",
  messagingSenderId: "218951317851",
  appId: "1:218951317851:web:8fe16dbae3f083986d027e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);