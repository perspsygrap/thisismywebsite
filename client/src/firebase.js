// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, getDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getStorage } from "firebase/storage";


const firebaseConfig = {
  apiKey: "AIzaSyCwpr1zUH7ZLQF6_5dCyrBU0KmSOztNec4",
  authDomain: "eeebbbsite.firebaseapp.com",
  projectId: "eeebbbsite",
  storageBucket: "eeebbbsite.firebasestorage.app",
  messagingSenderId: "759405086648",
  appId: "1:759405086648:web:6909b2aecb58e24cb3314d"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, getDoc, signInWithEmailAndPassword, signOut };
