// client/src/App.js
import React, { useState, useEffect } from "react";
import linkifyHtml from "linkify-html";

// Firebase import
import { collection, addDoc, getDocs, query, orderBy, doc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase"; // firebase.js import

// 카테고리
const CATEGORIES = [
  { key: "match", label: "match!" },
  { key: "tcc", label: "TCC" },
  { key: "hotline", label: "hotline" },
];

// 목록 미리보기
const makePreview = (content) => {
  const plain = content.replace(/<[^>]+>/g, "").replace(/\n+/g, " ").trim();
  return plain.length > 120 ? plain.substring(0, 120) + " ..." : plain;
};

function App() {
  // 관리자 모드
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (token === "my-secret-admin") setIsAdmin(true);
  }, []);

  const loginAdmin = () => {
    const pw = prompt("관리자 비밀번호를 입력하세요");
    if (pw === "flapiki") {
      localStorage.setItem("adminToken", "my-secret-admin");
      setIsAdmin(true);
      alert("관리자 모드 ON");
    } else {
      alert("비밀번호 틀림");
    }
  };

  const logoutAdmin = () => {
    localStorage.removeItem("adminToken");
    setIsAdmin(false);
    alert("관리자 모드 OFF");
  };

  // 상태
  const [posts, setPosts] = useState([]);
  const [currentPost, setCurrentPost] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("match");
  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    category: "match",
  });
  const [newComment, setNewComment] = useState("");

  // ===============================
  // Firestore 연결된 함수
  // ===============================

  // 글 목록 불러오기
  const fetchPosts = async () => {
    try {
      const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const postsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPosts(postsData);
    } catch (err) {
      console.error("fetchPosts error:", err);
    }
  };

  // 글 작성
  const createPost = async () => {
    if (!newPost.title || !newPost.content) return;
    try {
      await addDoc(collection(db, "posts"), {
        title: newPost.title,
        content: newPost.content,
        category: selectedCategory,
        createdAt: new Date(),
      });

      setNewPost({ title: "", content: "", category: selectedCategory });
      fetchPosts(); // 글 목록 갱신
    } catch (err) {
      console.error("createPost error:", err);
    }
  };

  // 글 삭제
  const deletePostHandler = async (id) => {
    if (!isAdmin) return alert("관리자만 삭제 가능");
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(db, "posts", id));
      if (currentPost && currentPost.id === id) setCurrentPost(null);
      fetchPosts();
    } catch (err) {
      console.error("deletePost error:", err);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // ===============================
  // 렌더링 도우미
  // ===============================
  const renderContent = (content) => ({
    __html: linkifyHtml(content || "", { target: "_blank", rel: "noopener" }),
  });

  const filteredPosts = posts
    .filter((p) => (p.category ? p.category : "match") === selectedCategory)
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    .map((p) => ({ ...p, _shortContent: makePreview(p.content) }));

  // ===============================
  // UI
  // ===============================
  return (
    <div style={{ padding: 20 }}>
      {/* 관리자 버튼 */}
      <div style={{ marginBottom: 16 }}>
        {!isAdmin ? (
          <button onClick={loginAdmin}>관리자 로그인</button>
        ) : (
          <button onClick={logoutAdmin}>관리자 로그아웃</button>
        )}
      </div>

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
        {/* 좌측: 글 작성/상세 */}
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

              <div style={{ display: "flex", gap: 8 }}>
                <input type="file" accept="image/*,video/mp4,image/gif" onChange={(e) => uploadFile(e.target.files[0])} />
                <button onClick={createPost}>글 등록</button>
              </div>
            </div>
          )}

          {currentPost ? (
            <div>
              <button onClick={() => setCurrentPost(null)}>← 목록으로</button>
              <h2>{currentPost.title}</h2>
              <div dangerouslySetInnerHTML={renderContent(currentPost.content)} />
            </div>
          ) : (
            <div style={{ opacity: 0.6 }}>
              <p>오른쪽 목록에서 글을 선택하세요.</p>
            </div>
          )}
        </div>

        {/* 우측: 글 목록 */}
        <div style={{ flex: 1.4, borderLeft: "1px solid #ddd", paddingLeft: 20, height: "100vh", overflowY: "auto" }}>
          <h3>글 목록</h3>
          {filteredPosts.length === 0 && <p>아직 글이 없습니다.</p>}

          {filteredPosts.map((post) => (
            <div
              key={post.id}
              style={{ border: "1px solid #eee", padding: 12, borderRadius: 8, marginBottom: 10, cursor: "pointer" }}
              onClick={() => setCurrentPost(post)}
            >
              <p style={{ fontWeight: 600, marginBottom: 6 }}>{post.title}</p>
              <div style={{ fontSize: 13, color: "#555" }} dangerouslySetInnerHTML={renderContent(post._shortContent)} />

              {isAdmin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePostHandler(post.id);
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
