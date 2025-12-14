
// =====================================================
// 🔵 메인 페이지
// =====================================================
    import React from "react";
    import { useNavigate } from "react-router-dom";

    function MainPage() {
      const navigate = useNavigate();

      // 버튼 라벨, 개별 높이, 세로 위치
      const buttonConfigs = [
        { label: "match!!", height: 252, topOffset: 20 },
        { label: "text", height: 252, topOffset: 100 },
        { label: "TCC", height: 252, topOffset: 60 },
        { label: "comment", height: 252, topOffset: 140 },
      ];

      return (
        <div style={{ padding: "60px 20px 20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start", // 버튼 개별 topOffset 적용
            }}
          >
            {buttonConfigs.map((btn, index) => (
              <React.Fragment key={btn.label}>
                <button
                  onClick={() =>
                    navigate(`/category/${btn.label.toLowerCase()}`)
                  }
                  style={{
                    flex: 1, // 버튼 폭 균등 분배
                    height: btn.height,
                    marginTop: btn.topOffset, // 계단식 위치
                    fontSize: 16,
                    backgroundColor: "transparent", // 버튼 투명
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {btn.label}
                </button>
                {/* 마지막 버튼 제외하고 세로 구분선 삽입 */}
                {index < buttonConfigs.length - 1 && (
  <div
    style={{
      width: "0.5px",
      backgroundColor: "#aaa",
      height: Math.max(...buttonConfigs.map(b => b.height + b.topOffset)), // 버튼 중 가장 큰 전체 높이 기준
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
