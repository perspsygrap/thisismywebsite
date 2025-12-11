import React, { useState, useEffect } from "react";
import linkifyHtml from "linkify-html";

const API_BASE = "https://thisismywebsite-fin.onrender.com";

const CATEGORIES = [
  { key: "match", label: "match!" },
  { key: "tcc", label: "TCC" },
  { key: "hotline", label: "hotline" },
];

function App() {
  const [posts, setPosts] = useState([]);
  const [currentPost, setCurrentPost] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [newPost, setNewPost] = useState({ title: "", content: "", category: "match" });
  const [newComment, setNewComment] = useState("");

  // 화면 모드: "home" or "category"
  const [screenMode, setScreenMode] = useState("home");

  // 글 목록 불러오기
  const fetchPosts = async () => {
    try {
      const res = await fetch(`${API_BASE}/posts`);
      const data = await res.json();
      setPosts(data || []);
    } catch (err) {
      console.error("fetchPosts error:", err);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // --- 최신 글 찾기 ---
  const getLatestPost = (category) => {
    const filtered = posts
      .filter((p) => p.category === category)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return filtered[0] || null;
  };

  // --- 홈 화면: 카테고리 버튼 클릭 ---
  const enterCategoryMode = (category) => {
    setSelectedCategory(category);
    setScreenMode("category");

    const newest = getLatestPost(category);
    setCurrentPost(newest);
  };

  // --- 뒤로가기 ---
  const goHome = () => {
    setScreenMode("home");
    setCurrentPost(null);
    setSelectedCategory(null);
  };

  // --- 게시글 요약 (50자 제한) ---
  const shortContent = (text) => {
    if (!text) return "";
    return text.length > 50 ? text.slice(0, 50) + "(...)" : text;
  };

  // --- 게시글 클릭 처리 ---
  const handlePostClick = (post) => {
    setCurrentPost(post);
  };

  return (
    <div className="app-container">

      {/* ---------------------------------- */}
      {/* 🟦 1. 홈 화면: 카테고리 3개 버튼 */}
      {/* ---------------------------------- */}
      {screenMode === "home" && (
        <div className="home-screen">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              className="home-category-btn"
              onClick={() => enterCategoryMode(cat.key)}
            >
              {cat.label}
            </button>
          ))}

          {/* 관리자 로그인(숨김 처리) */}
          <button className="hidden-admin-btn">관리자 로그인</button>
        </div>
      )}

      {/* ---------------------------------- */}
      {/* 🟦 2. 카테고리 화면: 글 내용 + 목록 */}
      {/* ---------------------------------- */}
      {screenMode === "category" && (
        <div className="category-screen">

          {/* 왼쪽 90%: 글 내용 */}
          <div className="post-view">
            <button className="back-btn" onClick={goHome}>
              ← 뒤로가기
            </button>

            {currentPost ? (
              <div className="post-detail">
                <h2>{currentPost.title}</h2>
                <div
                  className="post-content"
                  dangerouslySetInnerHTML={{
                    __html: linkifyHtml(currentPost.content.replace(/\n/g, "<br>")),
                  }}
                />
              </div>
            ) : (
              <div className="empty-post"></div>
            )}
          </div>

          {/* 오른쪽 10%: 목록 */}
          <div className="post-list">
            {posts
              .filter((p) => p.category === selectedCategory)
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .map((post) => (
                <div
                  key={post._id}
                  className="post-item"
                  onClick={() => handlePostClick(post)}
                >
                  <div className="post-item-title">{post.title}</div>
                  <div className="post-item-preview">{shortContent(post.content)}</div>
                </div>
              ))}
          </div>

        </div>
      )}
    </div>

  );
}

export default App;
