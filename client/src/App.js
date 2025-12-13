// client/src/App.js
import React, { useState, useEffect } from "react";
import linkifyHtml from "linkify-html";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useParams,
} from "react-router-dom";
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
import { updateDoc } from "firebase/firestore";

// ------------------------------
// 카테고리 목록 (기존 유지)
// ------------------------------
const CATEGORIES = [
  { key: "match!!", label: "match!!" },
  { key: "study", label: "공부" },
  { key: "tcc", label: "TCC" },
  { key: "welcome", label: "어서오세요" },
];

// ------------------------------
// 목록 미리보기 함수 (기존 유지)
// ------------------------------
const makePreview = (content) => {
  const plain = (content || "")
    .replace(/<[^>]+>/g, "")
    .replace(/\n+/g, " ")
    .trim();
  return plain.length > 30 ? plain.substring(0, 30) + " ..." : plain;
};

// =====================================================
// 🔵 공통 헤더 (기존 유지)
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
// 🔵 메인 페이지
// =====================================================
function MainPage() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: "60px 20px 20px" }}>
      <div className="top-tabs">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            className="tab-btn"
            onClick={() => navigate(`/category/${c.key}`)}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// =====================================================
// 🔵 상세 페이지
// =====================================================
function DetailPage({ posts, isAdmin, loginAdmin, logoutAdmin, fetchPosts }) {
  const navigate = useNavigate();
  const { category } = useParams();

  const categoryInfo = CATEGORIES.find((c) => c.key === category);
  const isWelcome = category === "welcome";

  const [currentPost, setCurrentPost] = useState(null);
  const [currentPostComments, setCurrentPostComments] = useState([]);
  const [newPost, setNewPost] = useState({ title: "", content: "" });
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentContent, setEditCommentContent] = useState("");

  const [isLeaving, setIsLeaving] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");

  const getVisitorId = () => {
  let id = localStorage.getItem("visitorId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("visitorId", id);
  }
  return id;
};
const visitorId = getVisitorId();

  const renderContent = (content) => ({
    __html: linkifyHtml(content || "", { target: "_blank" }),
  });

  const filteredPosts = posts
    .filter((p) => p.category === category)
    .map((p) => ({ ...p, _short: makePreview(p.content) }));

  const fetchCommentsForPost = async (postId) => {
    const commentsRef = collection(db, "posts", postId, "comments");
    const snap = await getDocs(query(commentsRef, orderBy("createdAt", "asc")));
    setCurrentPostComments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    if (isLeaving) return;

    if (filteredPosts.length === 0) {
      setCurrentPost(null);
      return;
    }

    if (isWelcome) {
      // 어서오세요: 항상 첫 글 고정
      const onlyPost = filteredPosts[0];
      setCurrentPost(onlyPost);
      fetchCommentsForPost(onlyPost.id);
      return;
    }

    // 다른 카테고리: 아직 선택 안 했을 때만 최신글 자동 선택
    if (!currentPost) {
      const latest = filteredPosts[0];
      setCurrentPost(latest);
      fetchCommentsForPost(latest.id);
    }
  }, [filteredPosts, isWelcome]);


   // ❗ 카테고리 검증 (핵심 수정 포인트)
  if (!categoryInfo) {
    return <p style={{ padding: 40 }}>존재하지 않는 카테고리입니다</p>;
  }

  const createPost = async () => {
    if (!isAdmin) return alert("관리자만 작성 가능");
    if (!newPost.title || !newPost.content) return alert("제목/내용 입력");

    await addDoc(collection(db, "posts"), {
      ...newPost,
      category,
      createdAt: new Date(),
    });

    setNewPost({ title: "", content: "" });
    fetchPosts();
  };

  const createComment = async (postId) => {
    if (!newComment) return;

    await addDoc(collection(db, "posts", postId, "comments"), {
      content: newComment,
      createdAt: new Date(),
      visitorId,
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

    const updateComment = async (commentId) => {
      if (!editCommentContent) {
        alert("댓글 내용을 입력하세요");
        return;
      }

      await updateDoc(
        doc(db, "posts", currentPost.id, "comments", commentId),
        {
          content: editCommentContent,
          updatedAt: new Date(),
        }
      );

      setEditingCommentId(null);
      setEditCommentContent("");
      fetchCommentsForPost(currentPost.id);
    };

const updatePost = async () => {
  if (!editTitle || !editContent) {
    alert("제목과 내용을 입력하세요");
    return;
  }

  await updateDoc(doc(db, "posts", currentPost.id), {
    title: editTitle,
    content: editContent,
    updatedAt: new Date(),
  });

  setIsEditing(false);
  fetchPosts(); // 최신 글 다시 불러오기
};

  return (
    <div style={{ padding: "60px 20px 20px" }}>
      <Header isAdmin={isAdmin} loginAdmin={loginAdmin} logoutAdmin={logoutAdmin} />

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <button
        onClick={() => {
          setIsLeaving(true);
          navigate("/");
        }}
      >
        ← 목록으로
      </button>

        <strong>{categoryInfo.label}</strong>
        <div style={{ width: 80 }} />
      </div>

      <div style={{ display: "flex", gap: 20 }}>
        {/* 왼쪽 */}
        <div style={{ flex: 5 }}>
          {isAdmin && (
            <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8, marginBottom: 16 }}>
              <h3>새 글 작성 {isWelcome && "(어서오세요 전용 공지)"}</h3>
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
              <button onClick={createPost} style={{ marginTop: 8 }}>
                글 등록
              </button>
            </div>
          )}

          {currentPost ? (
            <>
              {isAdmin && currentPost && (
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setEditTitle(currentPost.title);
                    setEditContent(currentPost.content);
                  }}
                  style={{ marginBottom: 12 }}
                >
                  수정
                </button>
              )}

              {isEditing ? (
                <>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    style={{ width: "100%", padding: 8, marginBottom: 8 }}
                  />
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    style={{ width: "100%", minHeight: 150, padding: 8 }}
                  />

                  {isEditing && (
                    <div style={{ marginTop: 8 }}>
                      <button onClick={updatePost}>저장</button>
                      <button
                        onClick={() => setIsEditing(false)}
                        style={{ marginLeft: 8 }}
                      >
                        취소
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h2>{currentPost.title}</h2>
                  <div dangerouslySetInnerHTML={renderContent(currentPost.content)} />
                </>
              )}

              <hr />
              <h4>댓글</h4>
              {currentPostComments.map((c) => (
               <div key={c.id} style={{ marginBottom: 8 }}>
                {editingCommentId === c.id ? (
                  <>
                    <input
                      value={editCommentContent}
                      onChange={(e) => setEditCommentContent(e.target.value)}
                      style={{ width: "80%", padding: 6 }}
                    />
                    <button
                      onClick={() => updateComment(c.id)}
                      style={{ marginLeft: 6 }}
                    >
                      저장
                    </button>
                    <button
                      onClick={() => setEditingCommentId(null)}
                      style={{ marginLeft: 4 }}
                    >
                      취소
                    </button>
                  </>
                ) : (
                  <>
                    <span>- {c.content}</span>

                    {c.visitorId === visitorId && (
                      <button
                        onClick={() => {
                          setEditingCommentId(c.id);
                          setEditCommentContent(c.content);
                        }}
                        style={{ marginLeft: 6, fontSize: 12 }}
                      >
                        수정
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
              <div style={{ marginTop: 10 }}>
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="댓글…"
                  style={{ width: "80%", padding: 6, height: 36 }}
                />
                <button onClick={() => createComment(currentPost.id)} style={{ marginLeft: 6 }}>
                  등록
                </button>
              </div>
            </>
          ) : (
            !isWelcome && <p style={{ color: "#666" }}>오른쪽에서 글을 선택하세요.</p>
          )}
        </div>

        {/* 오른쪽 목록: welcome 제외 */}
        {!isWelcome && (
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
                onClick={() => {
                  setCurrentPost(p);
                  fetchCommentsForPost(p.id);
                }}
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
        )}
      </div>
    </div>
  );
}

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
      <Route path="/" element={<MainPage />} />
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
