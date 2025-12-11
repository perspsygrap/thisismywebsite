// client/src/App.js
import React, { useState, useEffect } from "react";
import linkifyHtml from "linkify-html";

const API_BASE = "https://thisismywebsite-fin.onrender.com"; // 유지

const CATEGORIES = [
  { key: "match", label: "match!" },
  { key: "tcc", label: "TCC" },
  { key: "hotline", label: "hotline" },
];

function App() {
  const [posts, setPosts] = useState([]);
  const [currentPost, setCurrentPost] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("match");
  const [newPost, setNewPost] = useState({ title: "", content: "", category: "match" });
  const [newComment, setNewComment] = useState("");

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

  // 특정 글 상세
  const fetchPostDetail = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/posts/${id}`);
      const data = await res.json();
      setCurrentPost(data);
    } catch (err) {
      console.error("fetchPostDetail error:", err);
    }
  };

  // 글 작성 (카테고리 포함)
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
      console.error("createPost error:", err);
    }
  };

  // 댓글 작성
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

  // 글 삭제
  const deletePost = async (id) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      await fetch(`${API_BASE}/posts/${id}`, { method: "DELETE" });
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
        tag = `<img src="${url}" alt="image" style="max-width:100%; height:auto;" />`;
      } else if (file.type.startsWith("video/")) {
        tag = `<video src="${url}" controls style="max-width:100%; height:auto;"></video>`;
      }

      setNewPost((prev) => ({
        ...prev,
        content: prev.content + "\n" + tag + "\n",
      }));
    } catch (err) {
      console.error("파일 업로드 중 오류:", err);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // 본문 렌더링 시 linkify 적용
  const renderContent = (content) => {
    const htmlWithLinks = linkifyHtml(content || "", {
      target: "_blank",
      rel: "noopener",
    });
    return { __html: htmlWithLinks };
  };

  // 현재 선택된 카테고리에 맞는 posts 리스트 (기존에 category가 없는 경우 match로 취급)
  const filteredPosts = posts.filter(
    (p) => (p.category ? p.category : "match") === selectedCategory
  );

  return (
    <div style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
      {/* 탭 영역 */}
      <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => {
              setSelectedCategory(c.key);
              // 새 글 폼의 카테고리도 탭 따라 바꾸기(선택 사항)
              setNewPost((prev) => ({ ...prev, category: c.key }));
            }}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              background: selectedCategory === c.key ? "#222" : "#eee",
              color: selectedCategory === c.key ? "#fff" : "#000",
              fontWeight: selectedCategory === c.key ? "700" : "500",
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* 상단: 새 글 작성 (관리자용 UI는 나중에 인증으로 숨김 처리) */}
      <div style={{ marginBottom: 24, border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
        <h3 style={{ marginTop: 0 }}>새 글 작성 (카테고리: {selectedCategory})</h3>

        <div style={{ marginBottom: 8 }}>
          <input
            placeholder="제목"
            value={newPost.title}
            onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
            style={{ width: "100%", padding: 8, marginBottom: 8 }}
          />
          <select
            value={newPost.category}
            onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
            style={{ padding: 8, marginBottom: 8 }}
          >
            {CATEGORIES.map((c) => (
              <option value={c.key} key={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <textarea
            placeholder="내용"
            value={newPost.content}
            onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
            style={{ width: "100%", minHeight: 120, padding: 8 }}
          />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="file"
            accept="image/*,video/mp4,image/gif"
            onChange={async (e) => await uploadFile(e.target.files[0])}
          />
          <button onClick={createPost} style={{ padding: "8px 12px" }}>
            글 등록
          </button>
        </div>
      </div>

      {/* 글 목록 */}
      <div>
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
                style={{ cursor: "pointer", color: "blue", margin: 0, fontWeight: 600 }}
              >
                {post.title}
              </p>
              <div>
                <button onClick={() => deletePost(post.id)} style={{ color: "red" }}>
                  삭제
                </button>
              </div>
            </div>
            <div style={{ marginTop: 8 }} dangerouslySetInnerHTML={renderContent(post.content)} />
            <small style={{ color: "#666" }}>카테고리: {post.category ? post.category : "match"}</small>
          </div>
        ))}
      </div>

      {/* 상세보기: 모달 대신 아래에 렌더링 */}
      {currentPost && (
        <div style={{ marginTop: 24, borderTop: "1px solid #ddd", paddingTop: 16 }}>
          <button onClick={() => setCurrentPost(null)}>← 목록으로 돌아가기</button>
          <h2>{currentPost.post.title}</h2>
          <div dangerouslySetInnerHTML={renderContent(currentPost.post.content)} />
          <hr />
          <h4>댓글</h4>
          {currentPost.comments.map((c) => (
            <p key={c.id}>- {c.content}</p>
          ))}
          <input
            placeholder="댓글 작성..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            style={{ width: "80%" }}
          />
          <button onClick={() => createComment(currentPost.post.id)}>댓글 등록</button>
        </div>
      )}
    </div>
  );
}

export default App;
