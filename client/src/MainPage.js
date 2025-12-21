// src/MainPage.js
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "./firebase";

// =====================================================
// 🔵 메인 페이지
// =====================================================
function MainPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);

  // =====================================================
  // ✅ STEP C-1. Firestore에서 posts 불러오기
  // =====================================================
  useEffect(() => {
    const fetchPosts = async () => {
      const q = query(
        collection(db, "posts"),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      setPosts(
        snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    };

    fetchPosts();
  }, []);

  // =====================================================
  // 버튼 설정
  // =====================================================
  const buttonConfigs = [
    { label: "match!!", key: "match", height: 252, topOffset: 20 },
    { label: "text", key: "text", height: 252, topOffset: 100 },
    { label: "TCC", key: "tcc", height: 252, topOffset: 60 },
    { label: "realtime", key: "realtime", height: 252, topOffset: 120 },
    { label: "comment", key: "comment", height: 252, topOffset: 140 },
  ];

  // =====================================================
  // ✅ STEP C-2. category → posts 묶기
  // =====================================================
  const postsByCategory = useMemo(() => {
    const grouped = {};
    buttonConfigs.forEach(btn => {
      grouped[btn.key] = [];
    });

    posts.forEach(post => {
      if (grouped[post.category]) {
        grouped[post.category].push(post);
      }
    });

    return grouped;
  }, [posts]);


console.log("🔥 thumbnails:", posts.filter(p => p.thumbnail));


  // =====================================================
  // 렌더링
  // =====================================================
  return (
    <div style={{ padding: "60px 20px 20px" }}>
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        {buttonConfigs.map((btn, index) => (
          <React.Fragment key={btn.key}>
            <div style={{ flex: 1 }}>
              {/* 🔹 대카테고리 버튼 */}
              <button
                onClick={() =>
                  navigate(`/category/${btn.key}`)
                }
                style={{
                  width: "100%",
                  height: btn.height,
                  marginTop: btn.topOffset,
                  fontSize: 16,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {btn.label}
              </button>

              {/* 🔹 썸네일 grid */}
              <div style={{ display: "flex", flexWrap: "wrap" }}>
                {postsByCategory[btn.key]
                  ?.filter(p => p.thumbnail)
                  .slice(0, 9)
                  .map(post => (
                    <img
                      key={post.id}
                      src={post.thumbnail}
                      title={post.title}
                      onClick={() =>
                        navigate(
                          `/category/${btn.key}${
                            post.subCategory ? `/${post.subCategory}` : ""
                          }`
                        )
                      }
                      style={{
                        width: 48,
                        height: 48,
                        objectFit: "cover",
                        cursor: "pointer",
                        margin: 4,
                        border: "1px solid #ccc",
                      }}
                    />
                  ))}
              </div>
            </div>

            {/* 🔹 구분선 */}
            {index < buttonConfigs.length - 1 && (
              <div
                style={{
                  width: "0.5px",
                  backgroundColor: "#aaa",
                  height: Math.max(
                    ...buttonConfigs.map(b => b.height + b.topOffset)
                  ),
                }}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default MainPage;
