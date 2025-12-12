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
  getDoc,
} from "firebase/firestore";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";

// 카테고리 목록 (요청대로 '공부' 추가)
const CATEGORIES = [
  { key: "match!!", label: "match!!" },
  { key: "study", label: "공부" },
  { key: "tcc", label: "TCC" },
  { key: "welcome", label: "어서오세요" },
];

// 목록 미리보기 함수
const makePreview = (content) => {
  const plain = (content || "").replace(/<[^>]+>/g, "").replace(/\n+/g, " ").trim();
  return plain.length > 120 ? plain.substring(0, 120) + " ..." : plain;
};

function App() {
  // 인증 상태
  const [isAdmin, setIsAdmin] = useState(false);

  // 화면 상태: main(true) 또는 detail(false) 로 분리
  const [isMain, setIsMain] = useState(true);

  // 선택된 카테고리 (detail 진입 시 설정)
  const [selectedCategory, setSelectedCategory] = useState("match!!");

  // 글/댓글 상태
  const [posts, setPosts] = useState([]);
  const [currentPost, setCurrentPost] = useState(null); // 상세에서 선택된 포스트 (id 포함)
  const [currentPostComments, setCurrentPostComments] = useState([]);
  const [newPost, setNewPost] = useState({ title: "", content: "", category: "match!!" });
  const [newComment, setNewComment] = useState("");

  // ===============================
  // 관리자 로그인 (비밀번호만 prompt)
  // ===============================
  const loginAdmin = async () => {
    const pw = prompt("관리자 비밀번호를 입력하세요");
    if (!pw) return;

    try {
      await signInWithEmailAndPassword(auth, "towercrane@complex.com", pw);
      setIsAdmin(true);
      alert("관리자 모드 ON");
    } catch (error) {
      console.error("login error", error);
      alert("로그인 실패: " + (error.code || error.message));
    }
  };

  const logoutAdmin = async () => {
    try {
      await signOut(auth);
      setIsAdmin(false);
      alert("관리자 모드 OFF");
    } catch (err) {
      console.error("logout error", err);
    }
  };

  // ===============================
  // Firestore 데이터 처리
  // ===============================
  // posts 컬렉션 기본 불러오기 (모든 카테고리 포함). 상세 화면에서 필터해서 사용.
  const fetchPosts = async () => {
    try {
      const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPosts(data);
    } catch (err) {
      console.error("fetchPosts error:", err);
    }
  };

  // 특정 포스트의 댓글 불러오기 (detail에서 사용)
  const fetchCommentsForPost = async (postId) => {
    try {
      const commentsRef = collection(db, "posts", postId, "comments");
      const snap = await getDocs(query(commentsRef, orderBy("createdAt", "asc")));
      const comments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCurrentPostComments(comments);
    } catch (err) {
      console.error("fetchCommentsForPost error:", err);
      setCurrentPostComments([]);
    }
  };

  // 글 생성 (관리자 전용, 상세 화면에서 사용)
  const createPost = async () => {
    if (!isAdmin) return alert("관리자만 글 작성 가능");
    if (!newPost.title || !newPost.content) return alert("제목과 내용을 입력하세요.");

    try {
      await addDoc(collection(db, "posts"), {
        ...newPost,
        createdAt: new Date(),
      });
      setNewPost({ title: "", content: "", category: selectedCategory });
      await fetchPosts();
    } catch (err) {
      console.error("createPost error:", err);
    }
  };

  // 댓글 생성 (상세 화면에서 사용) — 작성 후 댓글만 다시 불러옴
  const createComment = async (postId) => {
    if (!newComment) return;
    try {
      const commentsRef = collection(db, "posts", postId, "comments");
      await addDoc(commentsRef, {
        content: newComment,
        createdAt: new Date(),
      });
      setNewComment("");
      await fetchCommentsForPost(postId);
      // 선택적으로 전체 posts도 새로고침
      await fetchPosts();
    } catch (err) {
      console.error("createComment error:", err);
    }
  };

  // 게시물 삭제 (관리자 전용)
  const deletePost = async (id) => {
    if (!isAdmin) return alert("관리자만 삭제 가능");
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(db, "posts", id));
      setCurrentPost(null);
      setCurrentPostComments([]);
      await fetchPosts();
    } catch (err) {
      console.error("deletePost error:", err);
    }
  };

  // 게시물 클릭 시 currentPost 설정 및 댓글 로드
  const handleSelectPost = async (post) => {
    setCurrentPost(post);
    await fetchCommentsForPost(post.id);
  };

  // 카테고리 클릭 → 상세 화면으로 이동 (selectedCategory 설정)
  const handleCategoryClick = async (categoryKey) => {
    setSelectedCategory(categoryKey);
    setIsMain(false); // 상세 화면으로 전환
    // 목록을 최신으로 유지
    await fetchPosts();
    // currentPost, comments 초기화
    setCurrentPost(null);
    setCurrentPostComments([]);
  };

  // 목록으로 돌아가기
  const goBackToMain = () => {
    setIsMain(true);
    setSelectedCategory("match!!");
    setCurrentPost(null);
    setCurrentPostComments([]);
  };

  // 관리자 로그인 유지 (페이지 새로고침에도 유지됨)
useEffect(() => {
  const unsubscribe = auth.onAuthStateChanged((user) => {
    if (user) {
      // 로그인 유지됨
      setIsAdmin(true);
    } else {
      // 로그아웃 또는 로그인 안 함
      setIsAdmin(false);
    }
  });

  return () => unsubscribe();
}, []);


  useEffect(() => {
    // 초기 posts 로드
    fetchPosts();
  }, []);

  // 렌더링 헬퍼
  const renderContent = (content) => {
    const html = linkifyHtml(content || "", { target: "_blank", rel: "noopener" });
    return { __html: html };
  };

  // 선택된 카테고리의 글 목록
  const filteredPosts = posts
    .filter((p) => p.category === selectedCategory)
    .map((p) => ({ ...p, _shortContent: makePreview(p.content) }));

  // ===============================
  // UI
  // ===============================
  // 1레벨: 메인 화면 (관리자 로그인 버튼 + 카테고리 탭만)
  if (isMain) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ marginBottom: 16 }}>
          {!isAdmin ? (
            <button onClick={loginAdmin}>관리자 로그인</button>
          ) : (
            <button onClick={logoutAdmin}>관리자 로그아웃</button>
          )}
        </div>

        {/* 1레벨 메인 화면 탭 영역 */}
        <div className="top-tabs">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              className={
                selectedCategory === c.key
                  ? "tab-btn active"
                  : "tab-btn"
              }
              onClick={() => {
                setSelectedCategory(c.key);
                setIsMain(false); // 2레벨 상세 화면으로 이동
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* 메인 화면은 아주 심플: 탭과 로그인 버튼만 */}
        <div style={{ color: "#666", marginTop: 40 }}>
          
        </div>
      </div>
    );
  }

  // 2레벨: 상세 화면 (오른쪽 목록, 왼쪽 본문+댓글+작성(관리자))
  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <button onClick={goBackToMain}>← 목록으로</button>
        </div>

        <div>
          <strong>{CATEGORIES.find((c) => c.key === selectedCategory)?.label || selectedCategory}</strong>
        </div>

        <div>
          {!isAdmin ? (
            <button onClick={loginAdmin}>관리자 로그인</button>
          ) : (
            <button onClick={logoutAdmin}>관리자 로그아웃</button>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 20 }}>
        {/* 왼쪽: 선택된 글의 본문 + (관리자면 글 작성 UI) + 댓글 섹션 */}
        <div style={{ flex: 2 }}>
          {isAdmin && (
            <div style={{ marginBottom: 16, border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
              <h3>새 글 작성 ({selectedCategory})</h3>
              <input
                placeholder="제목"
                value={newPost.title}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value, category: selectedCategory })}
                style={{ width: "100%", padding: 8, marginBottom: 8 }}
              />
              <textarea
                placeholder="내용"
                value={newPost.content}
                onChange={(e) => setNewPost({ ...newPost, content: e.target.value, category: selectedCategory })}
                style={{ width: "100%", minHeight: 120, padding: 8, marginBottom: 8 }}
              />
              <button onClick={createPost}>글 등록</button>
            </div>
          )}

          {currentPost ? (
            <div>
              <h2>{currentPost.title}</h2>
              <div dangerouslySetInnerHTML={renderContent(currentPost.content)} />
              <hr />
              <h4>댓글</h4>
              {currentPostComments.length === 0 && <p>댓글이 없습니다.</p>}
              {currentPostComments.map((c) => (
                <p key={c.id}>- {c.content}</p>
              ))}
              <div style={{ marginTop: 8 }}>
                <input
                  placeholder="댓글 작성…"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  style={{ width: "80%", padding: 6 }}
                />
                <button onClick={() => createComment(currentPost.id)} style={{ marginLeft: 8 }}>
                  댓글 등록
                </button>
              </div>
            </div>
          ) : (
            <div style={{ color: "#666" }}>
              <p>오른쪽 목록에서 글을 선택하세요.</p>
            </div>
          )}
        </div>

        {/* 오른쪽: 글 목록 */}
        <div style={{ flex: 1, borderLeft: "1px solid #ddd", paddingLeft: 16, maxHeight: "75vh", overflowY: "auto" }}>
          <h3>글 목록</h3>
          {filteredPosts.length === 0 && <p>아직 글이 없습니다.</p>}
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              style={{ border: "1px solid #eee", padding: 12, borderRadius: 8, marginBottom: 10, cursor: "pointer" }}
              onClick={() => handleSelectPost(post)}
            >
              <p style={{ fontWeight: 600, marginBottom: 6 }}>{post.title}</p>
              <div style={{ fontSize: 13, color: "#555" }} dangerouslySetInnerHTML={renderContent(post._shortContent)} />
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
