// App.js
import React, { useState, useEffect } from "react";
import Linkify from "react-linkify";

function App() {
  const API_BASE = "https://thisismywebsite-fin.onrender.com";

  const [posts, setPosts] = useState([]);
  const [currentPost, setCurrentPost] = useState(null);
  const [newPost, setNewPost] = useState({ title: "", content: "" });
  const [newComment, setNewComment] = useState("");

  // 글 목록 불러오기
  const fetchPosts = async () => {
    const res = await fetch(`${API_BASE}/posts`);
    const data = await res.json();
    setPosts(data);
  };

  // 특정 글 상세
  const fetchPostDetail = async (id) => {
    const res = await fetch(`${API_BASE}/posts/${id}`);
    const data = await res.json();
    setCurrentPost(data);
  };

  // 글 작성
  const createPost = async () => {
    if (!newPost.title || !newPost.content) return;
    await fetch(`${API_BASE}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPost),
    });
    setNewPost({ title: "", content: "" });
    fetchPosts();
  };

  // 댓글 작성
  const createComment = async (postId) => {
    if (!newComment) return;
    await fetch(`${API_BASE}/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newComment }),
    });
    setNewComment("");
    fetchPostDetail(postId);
  };

  // 글 삭제
  const deletePost = async (id) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    await fetch(`${API_BASE}/posts/${id}`, { method: "DELETE" });
    setCurrentPost(null);
    fetchPosts();
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

  return (
    <div style={{ padding: "20px", maxWidth: "700px", margin: "0 auto" }}>
      {currentPost ? (
        <div>
          <div style={{ marginBottom: "10px" }}>
            <button onClick={() => setCurrentPost(null)}>← 목록으로 돌아가기</button>
            <button
              onClick={() => deletePost(currentPost.post.id)}
              style={{ marginLeft: "10px", color: "red" }}
            >
              삭제
            </button>
          </div>

          <h2>{currentPost.post.title}</h2>
          <Linkify
            componentDecorator={(href, text, key) => (
              <a href={href} key={key} target="_blank" rel="noopener noreferrer">
                {text}
              </a>
            )}
          >
            <div dangerouslySetInnerHTML={{ __html: currentPost.post.content }} />
          </Linkify>

          <hr />
          <h3>댓글</h3>
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
      ) : (
        <>
          <h2>새 글 작성</h2>
          <input
            placeholder="제목"
            value={newPost.title}
            onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
            style={{ width: "100%", marginBottom: "10px" }}
          />
          <textarea
            placeholder="내용"
            value={newPost.content}
            onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
            style={{ width: "100%", height: "120px" }}
          />

          <input
            type="file"
            accept="image/*,video/mp4,image/gif"
            onChange={async (e) => await uploadFile(e.target.files[0])}
            style={{ marginTop: "10px", marginBottom: "10px" }}
          />

          <button onClick={createPost}>글 등록</button>

          <hr />
          <h2>글 목록</h2>
          {posts.map((post) => (
            <div
              key={post.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <p
                style={{ cursor: "pointer", color: "blue", margin: 0 }}
                onClick={() => fetchPostDetail(post.id)}
              >
                {post.title}
              </p>
              <button
                onClick={() => deletePost(post.id)}
                style={{ color: "red" }}
              >
                삭제
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default App;
