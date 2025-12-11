// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebase 웹 앱에서 받은 config
const firebaseConfig = {
  apiKey: "AIzaSyCwpr1zUH7ZLQF6_5dCyrBU0KmSOztNec4",
  authDomain: "eeebbbsite.firebaseapp.com",
  projectId: "eeebbbsite",
  storageBucket: "eeebbbsite.firebasestorage.app",
  messagingSenderId: "759405086648",
  appId: "1:759405086648:web:6909b2aecb58e24cb3314d"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
