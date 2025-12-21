// client/src/App.js
import React, { useState, useEffect } from "react";
import MainPage from "./MainPage";
import {BrowserRouter,Routes, Route} from "react-router-dom";
import { auth, db } from "./firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import DetailPage from "./DetailPage";





// =====================================================
// 🔵 App
// =====================================================
function App() {
  const [posts, setPosts] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchPosts = async () => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    setPosts(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const loginAdmin = async () => {
    const pw = prompt("관리자 비밀번호를 입력하세요");
    if (!pw) return;
    try {
      await signInWithEmailAndPassword(auth, "towercrane@complex.com", pw);
      alert("관리자 모드 ON");
    } catch {
      alert("로그인 실패");
    }
  };

  const logoutAdmin = async () => {
    await signOut(auth);
    alert("관리자 모드 OFF");
  };

  useEffect(() => {
    fetchPosts();
    const unsub = auth.onAuthStateChanged((u) => setIsAdmin(!!u));
    return () => unsub();
  }, []);

  return (
    <Routes>
      <Route path="/" element={<MainPage posts={posts} />} />
      <Route
        path="/category/:category"
        element={
          <DetailPage
            posts={posts}
            isAdmin={isAdmin}
            loginAdmin={loginAdmin}
            logoutAdmin={logoutAdmin}
            fetchPosts={fetchPosts}
          />
        }
      />
    </Routes>
  );
}

// =====================================================
// 🔵 Router Wrapper
// =====================================================
export default function AppWrapper() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}
