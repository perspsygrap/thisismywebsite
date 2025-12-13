// client/src/App.js
import React, { useState, useEffect } from "react";
import linkifyHtml from "linkify-html";
import { auth, db } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";

// ------------------------------
// 카테고리 목록
// ------------------------------
const CATEGORIES = [
  { key: "match!!", label: "match!!" },
  { key: "study", label: "공부" },
  { key: "tcc", label: "TCC" },
  { key: "welcome", label: "어서오세요" },
];

// ------------------------------
// 목록 미리보기 함수
// ------------------------------
const makePreview = (content) => {
  const plain = (content || "").replace(/<[^>]+>/g, "").replace(/\n+/g, " ").trim();
  return plain.length > 120 ? plain.substring(0, 120) + " ..." : plain;
};

// =====================================================
// 🔵 공통 헤더 컴포넌트
// =====================================================
function Header({ isAdmin, loginAdmin, logoutAdmin }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        padding: "10px 16px",
        background: "white",
        zIndex: 999,
      }}
    >
      {!isAdmin ? (
        <button onClick={loginAdmin}>관리자 로그인</button>
      ) : (
        <button onClick={logoutAdmin}>관리자 로그아웃</button>
      )}
    </div>
  );
}

// =====================================================
// 🔵 메인 App
// =====================================================
function App() {
  const [isAdmin, setIsAdmin] = useState(false);

  // 메인 화면(true) / 상세 화면(false)
  const [isMain, setIsMain] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState("match!!");

  const [posts, setPosts] = useState([]);
  const [currentPost, setCurrentPost] = useState(null);
  const [currentPostComments, setCurrentPostComments] = useState([]);
  const [newPost, setNewPost] = useState({ title: "", content: "", category: "match!!" });
  const [newComment, setNewComment] = useState("");

  // ------------------------------
  // 관리자 로그인
  // ------------------------------
  const loginAdmin = async () => {
    const pw = prompt("관리자 비밀번호를 입력하세요");
    if (!pw) return;

    try {
      await signInWithEmailAndPassword(auth, "towercrane@complex.com", pw);
      setIsAdmin(true);
      alert("관리자 모드 ON");
    } catch (e) {
      alert("로그인 실패");
    }
  };

  const logoutAdmin = async () => {
    try {
      await signOut(auth);
      setIsAdmin(false);
      alert("관리자 모드 OFF");
    } catch (e) {
      console.error(e);
    }
  };

  // ------------------------------
  // Firestore
  // ------------------------------
  const fetchPosts = async () => {
    try {
      const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPosts(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCommentsForPost = async (postId) => {
    try {
      const commentsRef = collection(db, "posts", postId, "comments");
      const snap = await getDocs(query(commentsRef, orderBy("createdAt", "asc")));
      const comments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCurrentPostComments(comments);
    } catch (e) {
      console.error(e);
    }
  };

  const createPost = async () => {
    if (!isAdmin) return alert("관리자만 작성 가능");
    if (!newPost.title || !newPost.content) return alert("제목/내용 입력");

    await addDoc(collection(db, "posts"), {
      ...newPost,
      createdAt: new Date(),
    });

    setNewPost({ title: "", content: "", category: selectedCategory });
    fetchPosts();
  };

  const createComment = async (postId) => {
    if (!newComment) return;

    const commentsRef = collection(db, "posts", postId, "comments");
    await addDoc(commentsRef, {
      content: newComment,
      createdAt: new Date(),
    });

    setNewComment("");
    fetchCommentsForPost(postId);
  };

  const deletePost = async (id) => {
    if (!isAdmin) return;
    if (!window.confirm("삭제할까요?")) return;

    await deleteDoc(doc(db, "posts", id));
    setCurrentPost(null);
    fetchPosts();
  };

  const handleSelectPost = async (post) => {
    setCurrentPost(post);
    await fetchCommentsForPost(post.id);
  };

  // 카테고리 선택 → 상세 페이지로 이동
  const handleCategoryClick = (key) => {
    setSelectedCategory(key);
    setIsMain(false);
    setCurrentPost(null);
    setCurrentPostComments([]);
  };

  const goBackToMain = () => {
    setIsMain(true);
    setCurrentPost(null);
    setCurrentPostComments([]);
  };

  // 로그인 유지
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setIsAdmin(!!user);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    fetchPosts();
  }, []);

  const renderContent = (content) => {
    const html = linkifyHtml(content || "", { target: "_blank" });
    return { __html: html };
  };

  const filteredPosts = posts
    .filter((p) => p.category === selectedCategory)
    .map((p) => ({ ...p, _short: makePreview(p.content) }));

  // =====================================================
  // 1페이지: 메인
  // =====================================================
  if (isMain) {
    return (
      <div style={{ padding: "60px 20px 20px" }}>
        <Header isAdmin={isAdmin} loginAdmin={loginAdmin} logoutAdmin={logoutAdmin} />

        <div className="top-tabs">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              className={selectedCategory === c.key ? "tab-btn active" : "tab-btn"}
              onClick={() => handleCategoryClick(c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // =====================================================
  // 2페이지: 상세 화면
  // =====================================================
  return (
    <div style={{ padding: "60px 20px 20px" }}>
      <Header isAdmin={isAdmin} loginAdmin={loginAdmin} logoutAdmin={logoutAdmin} />

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <button onClick={goBackToMain}>← 목록으로</button>
        <strong>{CATEGORIES.find((c) => c.key === selectedCategory)?.label}</strong>
        <div style={{ width: 80 }} />
      </div>

      <div style={{ display: "flex", gap: 20 }}>
        {/* 왼쪽 */}
        <div style={{ flex: 2 }}>
          {isAdmin && (
            <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8, marginBottom: 16 }}>
              <h3>새 글 작성 ({selectedCategory})</h3>
              <input
                placeholder="제목"
                value={newPost.title}
                onChange={(e) =>
                  setNewPost({ ...newPost, title: e.target.value, category: selectedCategory })
                }
                style={{ width: "100%", padding: 8, marginBottom: 8 }}
              />
              <textarea
                placeholder="내용"
                value={newPost.content}
                onChange={(e) =>
                  setNewPost({ ...newPost, content: e.target.value, category: selectedCategory })
                }
                style={{ width: "100%", minHeight: 120, padding: 8 }}
              />
              <button onClick={createPost} style={{ marginTop: 8 }}>
                글 등록
              </button>
            </div>
          )}

          {currentPost ? (
            <>
              <h2>{currentPost.title}</h2>
              <div dangerouslySetInnerHTML={renderContent(currentPost.content)} />
              <hr />
              <h4>댓글</h4>
              {currentPostComments.map((c) => (
                <p key={c.id}>- {c.content}</p>
              ))}
              <div style={{ marginTop: 10 }}>
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="댓글…"
                  style={{ width: "80%", padding: 6 }}
                />
                <button onClick={() => createComment(currentPost.id)} style={{ marginLeft: 6 }}>
                  등록
                </button>
              </div>
            </>
          ) : (
            <p style={{ color: "#666" }}>오른쪽에서 글을 선택하세요.</p>
          )}
        </div>

        {/* 오른쪽 목록 */}
        <div style={{ flex: 1, borderLeft: "1px solid #ddd", paddingLeft: 16 }}>
          <h3>글 목록</h3>
          {filteredPosts.map((p) => (
            <div
              key={p.id}
              style={{
                border: "1px solid #eee",
                padding: 12,
                borderRadius: 8,
                marginBottom: 10,
                cursor: "pointer",
              }}
              onClick={() => handleSelectPost(p)}
            >
              <strong>{p.title}</strong>
              <div
                style={{ fontSize: 13, color: "#555", marginTop: 4 }}
                dangerouslySetInnerHTML={renderContent(p._short)}
              />
              {isAdmin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePost(p.id);
                  }}
                  style={{ marginTop: 8, color: "red" }}
                >
                  삭제
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;

