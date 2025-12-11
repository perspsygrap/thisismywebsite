// client/src/App.js
import React, { useState, useEffect } from "react";
import linkifyHtml from "linkify-html";

const API_BASE = "https://thisismywebsite-fin.onrender.com";

// 카테고리 목록
const CATEGORIES = [
  { key: "match", label: "match!" },
  { key: "tcc", label: "TCC" },
  { key: "hotline", label: "hotline" },
];

function App() {
  // ==============================
  // 관리자 모드
  // ==============================
  const [isAdmin, setIsAdmin] = useState(false);

  // 앱 첫 실행 시 localStorage 확인
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (token === "my-secret-admin") {
      setIsAdmin(true);
    }
  }, []);

  // 관리자 로그인
  const loginAdmin = () => {
    const pw = prompt("관리자 비밀번호를 입력하세요");
    if (pw === "너가정한비밀번호") {
      localStorage.setItem("adminToken", "my-secret-admin");
      setIsAdmin(true);
      alert("관리자 모드 ON");
    } else {
      alert("비밀번호 틀림");
    }
  };

  // 관리자 로그아웃
  const logoutAdmin = () => {
    localStorage.removeItem("adminToken");
    setIsAdmin(false);
    alert("관리자 모드 OFF");
  };

  // ==============================
  // 기존 상태들
  // ==============================
  const [posts, setPosts] = useState([]);
  const [currentPost, setCurrentPost] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("match");
  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    category: "match",
  });
  const [newComment, setNewComment] = useState("");

  // 글 목록 가져오기
  const fetchPosts = async () => {
    try {
      const res = await fetch(`${API_BASE}/posts`);
      const data = await res.json();
      setPosts(data || []);
    } catch (err) {
      console.error("fetchPosts error:", err);
    }
  };

  // 글 상세
  const fetchPostDetail = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/posts/${id}`);
      const data = await res.json();
      setCurrentPost(data);
    } catch (err) {
      console.error("fetchPostDetail error:", err);
    }
  };

  // 글 작성 (관리자만)
  const createPost = async () => {
    if (!newPost.title || !newPost.content) return;
    try {
      await fetch(`${API_BASE}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPost),
      });
      setNewPost({
        title: "",
        content: "",
        category: selectedCategory,
      });
      fetchPosts();
    } catch (err) {
      console.error("createPost error:", err);
    }
  };

  // 댓글
  const createComment = async (postId) => {
    if (!newComment) return;
    try {
      await fetch(`${API_BASE}/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }),
      });
      setNewComment("");
      fetchPostDetail(postId);
    } catch (err) {
      console.error("createComment error:", err);
    }
  };

  // 삭제 (관리자만)
  const deletePost = async (id) => {
    if (!isAdmin) return alert("관리자만 삭제할 수 있음!");

    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      await fetch(`${API_BASE}/posts/${id}`, {
        method: "DELETE",
      });
      setCurrentPost(null);
      fetchPosts();
    } catch (err) {
      console.error("deletePost error:", err);
    }
  };

  // 파일 업로드
  const uploadFile = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("업로드 실패");

      const data = await res.json();
      const url = data.url;

      let tag = "";
      if (file.type.startsWith("image/")) {
        tag = `<img src="${url}" style="max-width:100%; height:auto;" />`;
      } else if (file.type.startsWith("video/")) {
        tag = `<video src="${url}" controls style="max-width:100%; height:auto;"></video>`;
      }

      setNewPost((prev) => ({
        ...prev,
        content: prev.content + "\n" + tag + "\n",
      }));
    } catch (err) {
      console.error("upload error:", err);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // 링크 자동 변환
  const renderContent = (content) => {
    const html = linkifyHtml(content || "", {
      target: "_blank",
      rel: "noopener",
    });
    return { __html: html };
  };

  // 카테고리 필터링
  const filteredPosts = posts.filter(
    (p) => (p.category ? p.category : "match") === selectedCategory
  );

  // ==========================================
  // UI 시작
  // ==========================================
  return (
    <div style={{ padding: "20px", maxWidth: 900, margin: "0 auto" }}>
      {/* 관리자 로그인/로그아웃 버튼 */}
      <div style={{ marginBottom: 16 }}>
        {!isAdmin ? (
          <button onClick={loginAdmin} className="admin-btn">
            관리자 로그인
          </button>
        ) : (
          <button onClick={logoutAdmin} className="admin-btn">
            관리자 로그아웃
          </button>
        )}
      </div>

      {/* 탭 */}
      <div className="tabs">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            className={`tab-btn ${
              selectedCategory === c.key ? "active" : ""
            }`}
            onClick={() => {
              setSelectedCategory(c.key);
              setNewPost((prev) => ({ ...prev, category: c.key }));
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* 새 글 작성 UI (관리자만 보임) */}
      {isAdmin && (
        <div
          style={{
            marginBottom: 24,
            border: "1px solid #ddd",
            padding: 12,
            borderRadius: 8,
          }}
        >
          <h3>새 글 작성 (카테고리: {selectedCategory})</h3>

          <input
            placeholder="제목"
            value={newPost.title}
            onChange={(e) =>
              setNewPost({ ...newPost, title: e.target.value })
            }
            style={{ width: "100%", padding: 8, marginBottom: 8 }}
          />

          <textarea
            placeholder="내용"
            value={newPost.content}
            onChange={(e) =>
              setNewPost({ ...newPost, content: e.target.value })
            }
            style={{ width: "100%", minHeight: 120, padding: 8 }}
          />

          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="file"
              accept="image/*,video/mp4,image/gif"
              onChange={async (e) => uploadFile(e.target.files[0])}
            />
            <button onClick={createPost}>글 등록</button>
          </div>
        </div>
      )}

      {/* 글 목록 */}
      <h3>{CATEGORIES.find((c) => c.key === selectedCategory).label} 글 목록</h3>
      {filteredPosts.length === 0 && <p>아직 글이 없습니다.</p>}

      {filteredPosts.map((post) => (
        <div
          key={post.id}
          style={{
            border: "1px solid #eee",
            padding: 12,
            borderRadius: 8,
            marginBottom: 10,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <p
              onClick={() => fetchPostDetail(post.id)}
              style={{
                cursor: "pointer",
                color: "blue",
                margin: 0,
                fontWeight: 600,
              }}
            >
              {post.title}
            </p>

            {/* 삭제 버튼: 관리자만 보임 */}
            {isAdmin && (
              <button
                onClick={() => deletePost(post.id)}
                style={{ color: "red" }}
              >
                삭제
              </button>
            )}
          </div>

          <div
            style={{ marginTop: 8 }}
            dangerouslySetInnerHTML={renderContent(post.content)}
          />
        </div>
      ))}

      {/* 상세 보기 */}
      {currentPost && (
        <div style={{ marginTop: 24 }}>
          <button onClick={() => setCurrentPost(null)}>← 목록으로</button>
          <h2>{currentPost.post.title}</h2>

          <div
            dangerouslySetInnerHTML={renderContent(currentPost.post.content)}
          />
          <hr />

          <h4>댓글</h4>
          {currentPost.comments.map((c) => (
            <p key={c.id}>- {c.content}</p>
          ))}

          <input
            placeholder="댓글 작성…"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            style={{ width: "80%" }}
          />
          <button onClick={() => createComment(currentPost.post.id)}>
            댓글 등록
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
