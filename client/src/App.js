// client/src/App.js
import React, { useState, useEffect } from "react";
import MainPage from "./MainPage";
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

//작성연도날짜시간(분)
const formatDateTime = (ts) => {
  if (!ts?.toDate) return "";
  const d = ts.toDate();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

// ------------------------------
// 카테고리 목록 (기존 유지)
// ------------------------------
const CATEGORIES = [
  { key: "match!!", label: "match!!" },
  { key: "text", label: "text" },
  { key: "tcc", label: "TCC" },
  { key: "comment", label: "comment" },
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
// 🔵 헤더 (DetailPage 전용)
// =====================================================
function Header({ isAdmin, loginAdmin, logoutAdmin }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: 90, // 헤더 높이
        backgroundColor: "#fff",
        zIndex: 999,
      }}
    >
      {/* 관리자 로그인/로그아웃 버튼 (투명) */}
      {!isAdmin ? (
        <button
          onClick={loginAdmin}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            zIndex: 10,
            background: "transparent",
            color: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          관리자 로그인
        </button>
      ) : (
        <button
          onClick={logoutAdmin}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            zIndex: 10,
            background: "transparent",
            color: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          관리자 로그아웃
        </button>
      )}

      {/* 로고 이미지 (버튼 위에 시각적으로 표시) */}
      <img
        src="/2nd_Oktavia Von Seckendorff.png" // public에 있는 로고 JPG
        alt="로고"
        style={{
          position: "absolute",
          top: 16,
          right: 16, // 버튼과 같은 위치
          height: 71,
          objectFit: "contain",
          zIndex: 20,
          pointerEvents: "none", // 이미지 클릭해도 버튼이 작동
        }}
      />
    </div>
  );
}


    // 🔹 본문 작성란 컴포넌트
      function RichTextEditor({ content, setContent, editable }) {
      const editorRef = React.useRef(null);
      const isComposingRef = React.useRef(false);

    useEffect(() => {
      if (
        editorRef.current &&
        !isComposingRef.current &&
        editorRef.current.innerHTML !== content
      ) {
        editorRef.current.innerHTML = content || "";
      }
    }, [content]);

      const insertHtmlAtCursor = (html) => {
        if (!editorRef.current) return;

        editorRef.current.focus();
        document.execCommand("insertHTML", false, html);
          // 🔴 핵심! 중요: 이미지 삽입 직후 state 동기화
        setContent(editorRef.current.innerHTML);
      };

      const handleFiles = async (files) => {
        for (let file of files) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const url = e.target.result;
            if (file.type.startsWith("image/")) {
              insertHtmlAtCursor(
                `<img src="${url}" style="max-width:300px; display:block; margin:8px 0;" />`
              );
            } else if (file.type.startsWith("video/")) {
              insertHtmlAtCursor(
                `<video src="${url}" controls style="max-width:300px; display:block; margin:8px 0;"></video>`
              );
            }
          };
          reader.readAsDataURL(file);
        }
      };

      const handleDrop = (e) => {
        e.preventDefault();
        if (!editable) return;
        handleFiles(e.dataTransfer.files);
      };

      const handlePaste = (e) => {
        if (!editable) return;
        const items = e.clipboardData.items;
        const files = [];
        for (let i = 0; i < items.length; i++) {
          if (items[i].kind === "file") files.push(items[i].getAsFile());
        }
        if (files.length > 0) {
          e.preventDefault();
          handleFiles(files);
        }
      };

      return (
    <div
      ref={editorRef}
      contentEditable={editable}
      suppressContentEditableWarning

    onDrop={handleDrop} //드래그 삽입
    onDragOver={(e) => e.preventDefault()} //크롬 새 탭 방지(필수)
    onPaste={handlePaste} //붙여넣기 삽입

      onCompositionStart={() => {
        isComposingRef.current = true;
      }}
      onCompositionEnd={(e) => {
        isComposingRef.current = false;
        setContent(e.currentTarget.innerHTML);
      }}
      onInput={(e) => {
        if (!isComposingRef.current) {
          setContent(e.currentTarget.innerHTML);
        }
      }}
      style={{
        width: "100%",
        minHeight: 150,
        border: "1px solid #ddd",
        padding: 8,
        borderRadius: 6,
        overflowY: "auto",
      }}
    />
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

  const [isWriting, setIsWriting] = useState(false);

  const [currentPost, setCurrentPost] = useState(null);
  const [currentPostComments, setCurrentPostComments] = useState([]);
  const [newPost, setNewPost] = useState({ title: "", content: "" });
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  // 글 첨부 파일 상태
  const [selectedFiles, setSelectedFiles] = useState([]);

  const [isLeaving, setIsLeaving] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerSrc, setViewerSrc] = useState(null);
  
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
  __html: linkifyHtml(content || "", { target: "_blank" }).replace(/\n/g, "<br/>"),
});

const handleContentClick = (e) => {
  const target = e.target;
  if (target.tagName === "IMG") {
    setViewerSrc(target.src);
    setViewerOpen(true);
  }
};

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

      const content = newPost.content;
      if (!newPost.title || !content) return alert("제목/내용 입력");

      // 🔹 1. 글 생성
      const docRef = await addDoc(collection(db, "posts"), {
        ...newPost,
        content,
        category,
        createdAt: new Date(),
      });

      // 🔹 2. 작성 상태 초기화 (← “작성 박스 새로고침” 효과)
      setNewPost({ title: "", content: "" });
      setSelectedFiles([]);

      // 🔹 3. 방금 쓴 글을 현재 글로 설정
      const newPostData = {
        id: docRef.id,
        title: newPost.title,
        content,
        category,
        createdAt: new Date(),
      };
      setCurrentPost(newPostData);
      setCurrentPostComments([]);

      // 🔹 4. 목록 새로 불러오기
      fetchPosts();
    };


  const handleFileChange = (e) => {
  const files = Array.from(e.target.files).map((f) => ({
    file: f,
    preview: URL.createObjectURL(f),
    type: f.type,
  }));
  setSelectedFiles(files);
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

      const deleteComment = async (commentId) => {
    if (!window.confirm("댓글을 삭제할까요?")) return;

    await deleteDoc(doc(db, "posts", currentPost.id, "comments", commentId));
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
    <div style={{ padding: "100px 20px 20px" }}>
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
        <div style={{ width: 80 }} />
      </div>

      <div style={{ display: "flex", gap: 20 }}>
        {/* 왼쪽 */}
        <div style={{ flex: 5 }}>
         

         {isAdmin && (
          <div
            style={{
              border: "1px solid #ddd", padding: 12, borderRadius: 8, marginBottom: 16, }}>
            <h3>새 글 작성 {isWelcome && "(어서오세요 전용 공지)"}</h3>

            {/* 제목 */}
            <input
              placeholder="제목"
              value={newPost.title}
              onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
              style={{ width: "100%", padding: 8, marginBottom: 8 }}
            />
            {/* 내용 */}
           <RichTextEditor
            content={newPost.content}
            setContent={(html) => setNewPost({ ...newPost, content: html })}
            editable={isAdmin}
          />
            {/* 파일 업로드 버튼 */}
            <input
              type="file"
              accept="image/*,video/mp4,.gif"
              multiple
              onChange={handleFileChange}
              style={{ marginTop: 8 }}
            />

            {/* 선택된 파일 미리보기 */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                marginTop: 8,
                gap: 8,
              }}
            >
              {selectedFiles.map((f, idx) =>
                f.type.startsWith("image/") || f.type === "image/gif" ? (
                  <img
                    key={idx}
                    src={f.preview}
                    style={{ maxWidth: 600, maxHeight: 600, objectFit: "contain" }}
                  />
                ) : (
                  <video
                    key={idx}
                    src={f.preview}
                    controls
                    style={{ maxWidth: 150, maxHeight: 120 }}
                  />
                )
              )}
            </div>

            {/* 글 등록 버튼 */}
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
  <h2>{currentPost.title}</h2>
  <span style={{ fontSize: 12, color: "#888" }}>
    {formatDateTime(currentPost.createdAt)}
  </span>
</div>
<div
  dangerouslySetInnerHTML={renderContent(currentPost.content)}
  onClick={(e) => {
    if (e.target.tagName === "IMG") {
      setViewerSrc(e.target.src);
      setViewerOpen(true);
    }
  }}
/>

                </>
              )}

              <hr />
<h4>댓글</h4>
{currentPostComments.map((c) => (
  <div key={c.id} style={{ marginBottom: 8, position: "relative", paddingBottom: 16 }}>
    {editingCommentId === c.id ? (
      <>
        <textarea
          value={editCommentContent}
          onChange={(e) => setEditCommentContent(e.target.value)}
          style={{ width: "80%", padding: 6, minHeight: 36 }}
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
        <span
          dangerouslySetInnerHTML={renderContent(c.content)}
          onClick={(e) => {
            if (e.target.tagName === "IMG") {
              setViewerSrc(e.target.src);
              setViewerOpen(true);
            }
          }}
        />
        {/* 댓글 작성일 표시 */}
        <span style={{ fontSize: 10, color: "#888", position: "absolute", bottom: 0, left: 0 }}>
          {formatDateTime(c.createdAt)}
        </span>

        {c.visitorId === visitorId && (
          <>
            <button
              onClick={() => {
                setEditingCommentId(c.id);
                setEditCommentContent(c.content);
              }}
              style={{ marginLeft: 6, fontSize: 12 }}
            >
              수정
            </button>
            <button
              onClick={() => deleteComment(c.id)}
              style={{ marginLeft: 4, fontSize: 12, color: "red" }}
            >
              삭제
            </button>
          </>
        )}
      </>
    )}
  </div>
))}

<div style={{ marginTop: 16 }}>
  <RichTextEditor
    content={newComment}
    setContent={setNewComment}
    editable={true} 
  />
  <div style={{ marginTop: 8, textAlign: "right" }}>
    <button onClick={() => createComment(currentPost.id)}>
      댓글 등록
    </button>
  </div>
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
      {viewerOpen && (
        <div
          onClick={() => setViewerOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <img
              src={viewerSrc}
              style={{
                maxWidth: "90vw",
                maxHeight: "80vh",
                display: "block",
                marginBottom: 12,
              }}
            />
            <div style={{ textAlign: "center" }}>
              <a
                href={viewerSrc}
                download
                style={{
                  color: "white",
                  textDecoration: "underline",
                  marginRight: 12,
                }}
              >
                이미지 다운로드
              </a>
              <button onClick={() => setViewerOpen(false)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
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
