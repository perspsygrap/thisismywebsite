// client/src/App.js
import React, { useState, useEffect } from "react";
import linkifyHtml from "linkify-html";
import "./App.css";

const API_BASE = "https://thisismywebsite-fin.onrender.com";

const CATEGORIES = [
  { key: "match", label: "match!" },
  { key: "tcc", label: "TCC" },
  { key: "hotline", label: "hotline" },
];

// 미리보기 50자 + ...
const makePreview = (content) => {
  const plain = content.replace(/<[^>]+>/g, "").replace(/\n+/g, " ").trim();
  if (plain.length > 50) return plain.substring(0, 50) + " ...";
  return plain;
};

function App() {
  // 관리자 모드
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (token === "my-secret-admin") setIsAdmin(true);
  }, []);

  const loginAdmin = () => {
    const pw = prompt("관리자 비밀번호 입력");
    if (pw === "flapiki") {
      localStorage.setItem("adminToken", "my-secret-admin");
      setIsAdmin(true);
      alert("관리자 모드 ON");
    } else alert("비밀번호 틀림");
  };

  const logoutAdmin = () => {
    localStorage.removeItem("adminToken");
    setIsAdmin(false);
    alert("관리자 모드 OFF");
  };

  // 기존 상태
  const [posts, setPosts] = useState([]);
  const [currentPost, setCurrentPost] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [newPost, setNewPost] = useState({ title: "", content: "", category: "match" });
  const [newComment, setNewComment] = useState("");

  // API
  const fetchPosts = async () => {
    try {
      const res = await fetch(`${API_BASE}/posts`);
      const data = await res.json();
      setPosts(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPostDetail = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/posts/${id}`);
      const data = await res.json();
      setCurrentPost(data);
    } catch (err) {
      console.error(err);
    }
  };

  const createPost = async () => {
    if (!newPost.title || !newPost.content) return;
    try {
      await fetch(`${API_BASE}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPost),
      });
      setNewPost({ title: "", content: "", category: selectedCategory });
      fetchPosts();
    } catch (err) {
      console.error(err);
    }
  };

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
      console.error(err);
    }
  };

  const deletePost = async (id) => {
    if (!isAdmin) return alert("관리자만 삭제 가능");
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      await fetch(`${API_BASE}/posts/${id}`, { method: "DELETE" });
      setCurrentPost(null);
      fetchPosts();
    } catch (err) {
      console.error(err);
    }
  };

  const uploadFile = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("업로드 실패");
      const data = await res.json();
      const url = data.url;
      let tag = "";
      if (file.type.startsWith("image/")) tag = `<img src="${url}" style="max-width:100%; height:auto;" />`;
      else if (file.type.startsWith("video/")) tag = `<video src="${url}" controls style="max-width:100%; height:auto;"></video>`;
      setNewPost((prev) => ({ ...prev, content: prev.content + "\n" + tag + "\n" }));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const renderContent = (content) => ({ __html: linkifyHtml(content || "", { target: "_blank", rel: "noopener" }) });

  const filteredPosts =
    selectedCategory &&
    posts
      .filter((p) => (p.category ? p.category : "match") === selectedCategory)
      .sort((a, b) => b.id - a.id)
      .map((p) => ({ ...p, _shortContent: makePreview(p.content) }));

  // ===============================
  // 홈 화면 버튼 클릭 처리
  // ===============================
  const handleCategoryClick = (key) => {
    setSelectedCategory(key);
    // 가장 최신 글 자동 선택
    const latestPost = posts.filter((p) => (p.category ? p.category : "match") === key).sort((a, b) => b.id - a.id)[0];
    if (latestPost) fetchPostDetail(latestPost.id);
  };

  return (
    <div className="App">
      {/* 관리자 로그인 버튼 (투명) */}
      <button className="admin-login-btn" onClick={loginAdmin}>
        관리자 로그인
      </button>

      {!selectedCategory && (
        <div className="home-buttons">
          {CATEGORIES.map((c) => (
            <button key={c.key} className="home-btn" onClick={() => handleCategoryClick(c.key)}>
              {c.label}
            </button>
          ))}
        </div>
      )}

      {selectedCategory && (
        <div className="category-view">
          {/* 왼쪽 글 내용 */}
          <div className="content-area">
            <button onClick={() => { setSelectedCategory(null); setCurrentPost(null); }}>← 뒤로가기</button>
            {currentPost ? (
              <div>
                <h2>{currentPost.post.title}</h2>
                <div dangerouslySetInnerHTML={renderContent(currentPost.post.content)} />
                <hr />
                <h4>댓글</h4>
                {currentPost.comments.map((c) => <p key={c.id}>- {c.content}</p>)}
                <input placeholder="댓글 작성…" value={newComment} onChange={(e) => setNewComment(e.target.value)} />
                <button onClick={() => createComment(currentPost.post.id)}>댓글 등록</button>

                {/* 관리자 글쓰기 UI */}
                {isAdmin && (
                  <div className="new-post">
                    <h3>새 글 작성 ({selectedCategory})</h3>
                    <input placeholder="제목" value={newPost.title} onChange={(e) => setNewPost({ ...newPost, title: e.target.value })} />
                    <textarea placeholder="내용" value={newPost.content} onChange={(e) => setNewPost({ ...newPost, content: e.target.value })} />
                    <div>
                      <input type="file" onChange={(e) => uploadFile(e.target.files[0])} />
                      <button onClick={createPost}>글 등록</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>{/* 공백 */}</div>
            )}
          </div>

          {/* 오른쪽 글 목록 */}
          <div className="list-area">
            {filteredPosts.length > 0 &&
              filteredPosts.map((post) => (
                <div key={post.id} className="post-preview" onClick={() => fetchPostDetail(post.id)}>
                  <p className="post-title">{post.title}</p>
                  <div className="post-short" dangerouslySetInnerHTML={renderContent(post._shortContent)} />
                  {isAdmin && (
                    <button className="delete-btn" onClick={(e) => { e.stopPropagation(); deletePost(post.id); }}>삭제</button>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
