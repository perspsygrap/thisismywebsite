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

// 카테고리 목록
const CATEGORIES = [
  { key: "match!!", label: "match!!" },
  { key: "tcc", label: "TCC" },
  { key: "어서오세요", label: "어서오세요" },
];

// 목록 미리보기 함수
const makePreview = (content) => {
  const plain = content.replace(/<[^>]+>/g, "").replace(/\n+/g, " ").trim();
  return plain.length > 120 ? plain.substring(0, 120) + " ..." : plain;
};

function App() {
  const [isAdmin, setIsAdmin] = useState(false);

  // 로그인 UI 상태
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // 글 상태
  const [posts, setPosts] = useState([]);
  const [currentPost, setCurrentPost] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("match!!");
  const [newPost, setNewPost] = useState({ title: "", content: "", category: "match!!" });
  const [newComment, setNewComment] = useState("");

  // ===============================
  // 관리자 로그인
  // ===============================
  const loginAdmin = () => {
    setShowLoginForm(true);
  };

  const submitLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      setIsAdmin(true);
      setShowLoginForm(false);
      alert("관리자 모드 ON");
    } catch (error) {
      console.error(error);
      alert("로그인 실패: " + error.code);
    }
  };

  const logoutAdmin = async () => {
    await signOut(auth);
    setIsAdmin(false);
    alert("관리자 모드 OFF");
  };

  // ===============================
  // Firestore 데이터 처리
  // ===============================
  const fetchPosts = async () => {
    try {
      const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPosts(data);
    } catch (err) {
      console.error("fetchPosts error:", err);
    }
  };

  const createPost = async () => {
    if (!newPost.title || !newPost.content) return;
    try {
      await addDoc(collection(db, "posts"), {
        ...newPost,
        createdAt: new Date(),
      });
      setNewPost({ title: "", content: "", category: selectedCategory });
      fetchPosts();
    } catch (err) {
      console.error("createPost error:", err);
    }
  };

  const createComment = async (postId) => {
    if (!newComment) return;
    try {
      const commentsRef = collection(db, "posts", postId, "comments");
      await addDoc(commentsRef, {
        content: newComment,
        createdAt: new Date(),
      });
      setNewComment("");
      fetchPosts();
    } catch (err) {
      console.error("createComment error:", err);
    }
  };

  const deletePost = async (id) => {
    if (!isAdmin) return alert("관리자만 삭제 가능");
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(db, "posts", id));
      setCurrentPost(null);
      fetchPosts();
    } catch (err) {
      console.error("deletePost error:", err);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [selectedCategory]);

  // 렌더링 도우미
  const renderContent = (content) => {
    const html = linkifyHtml(content || "", { target: "_blank", rel: "noopener" });
    return { __html: html };
  };

  const filteredPosts = posts
    .filter((p) => p.category === selectedCategory)
    .map((p) => ({ ...p, _shortContent: makePreview(p.content) }));

  // ===============================
  // UI
  // ===============================
  return (
    <div style={{ padding: 20 }}>
      {/* 로그인/로그아웃 버튼 */}
      <div style={{ marginBottom: 16 }}>
        {!isAdmin ? (
          <button onClick={loginAdmin}>관리자 로그인</button>
        ) : (
          <button onClick={logoutAdmin}>관리자 로그아웃</button>
        )}
      </div>

      {/* 이메일+비밀번호 로그인 폼 */}
      {showLoginForm && !isAdmin && (
        <div style={{ marginBottom: 16, padding: 12, border: "1px solid #ddd" }}>
          <h3>관리자 로그인</h3>
          <input
            type="text"
            placeholder="이메일"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            style={{ width: "100%", padding: 8, marginBottom: 8 }}
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            style={{ width: "100%", padding: 8, marginBottom: 8 }}
          />
          <button onClick={submitLogin}>로그인</button>
        </div>
      )}

      {/* 탭 */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            className={selectedCategory === c.key ? "active" : ""}
            onClick={() => {
              setSelectedCategory(c.key);
              setNewPost((prev) => ({ ...prev, category: c.key }));
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 20 }}>
        {/* 왼쪽: 글 작성 및 상세 */}
        <div style={{ flex: 4 }}>
          {isAdmin && (
            <div style={{ marginBottom: 24, border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
              <h3>새 글 작성 ({selectedCategory})</h3>
              <input
                placeholder="제목"
                value={newPost.title}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                style={{ width: "100%", padding: 8, marginBottom: 8 }}
              />
              <textarea
                placeholder="내용"
                value={newPost.content}
                onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                style={{ width: "100%", minHeight: 120, padding: 8 }}
              />
              <button onClick={createPost}>글 등록</button>
            </div>
          )}

          {currentPost ? (
            <div>
              <button onClick={() => setCurrentPost(null)}>← 목록으로</button>
              <h2>{currentPost.title}</h2>
              <div dangerouslySetInnerHTML={renderContent(currentPost.content)} />
              <hr />
              <h4>댓글</h4>
              {currentPost.comments?.map((c, idx) => <p key={idx}>- {c.content}</p>)}
              <input
                placeholder="댓글 작성…"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                style={{ width: "80%" }}
              />
              <button onClick={() => createComment(currentPost.id)}>댓글 등록</button>
            </div>
          ) : (
            <div style={{ opacity: 0.6 }}>
              <p>오른쪽 목록에서 글을 선택하세요.</p>
            </div>
          )}
        </div>

        {/* 오른쪽: 글 목록 */}
        <div style={{ flex: 1.4, borderLeft: "1px solid #ddd", paddingLeft: 20, height: "100vh", overflowY: "auto" }}>
          <h3>글 목록</h3>
          {filteredPosts.length === 0 && <p>아직 글이 없습니다.</p>}

          {filteredPosts.map((post) => (
            <div
              key={post.id}
              style={{
                border: "1px solid #eee",
                padding: 12,
                borderRadius: 8,
                marginBottom: 10,
                cursor: "pointer",
              }}
              onClick={() => setCurrentPost(post)}
            >
              <p style={{ fontWeight: 600, marginBottom: 6 }}>{post.title}</p>
              <div
                style={{ fontSize: 13, color: "#555" }}
                dangerouslySetInnerHTML={renderContent(post._shortContent)}
              />
              {isAdmin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePost(post.id);
                  }}
                  style={{ color: "red", marginTop: 8 }}
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
