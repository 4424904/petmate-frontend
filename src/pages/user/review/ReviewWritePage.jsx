// src/pages/review/ReviewWritePage.jsx
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { apiRequest } from "../../../services/api";
import { useAuth } from "../../../contexts/AuthContext";

const NAME_TO_TYPE = {
  산책: "WALK",
  돌봄: "CARE",
  미용: "GROOM",
  병원: "HOSPITAL",
  기타: "ETC",
};

const ReviewWritePage = () => {
  const { isLogined } = useAuth();
  const [sp] = useSearchParams();
  const navigate = useNavigate();

  const reservationId = useMemo(
    () => Number(sp.get("reservationId") || 0),
    [sp]
  );
  const companyId = useMemo(() => Number(sp.get("companyId") || 0), [sp]);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [productName, setProductName] = useState(""); // 예: "산책"
  const [serviceType, setServiceType] = useState(""); // 예: "WALK"
  const [keywords, setKeywords] = useState([]); // [{id,label,category,serviceType}]
  const [selectedIds, setSelectedIds] = useState([]); // number[]

  // 예약 상세 → productName → serviceType → 키워드 조회
  useEffect(() => {
    if (!isLogined || !reservationId) return;
    (async () => {
      try {
        const r = await apiRequest.get(`/api/booking/${reservationId}`);
        const pn = r?.data?.productName || "";
        const st = NAME_TO_TYPE[pn] || "ETC";
        setProductName(pn);
        setServiceType(st);

        const kw = await apiRequest.get(`/api/review-keywords`, {
          params: { serviceType: st, activeOnly: 1 },
        });
        const list = Array.isArray(kw?.data) ? kw.data : [];
        setKeywords(list);
      } catch (e) {
        setErr(e?.response?.data?.message || "예약/키워드 로드 실패");
      }
    })();
  }, [isLogined, reservationId]);

  const toggleKeyword = useCallback((id) => {
    const nid = Number(id);
    setSelectedIds((prev) =>
      prev.includes(nid) ? prev.filter((x) => x !== nid) : [...prev, nid]
    );
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) return setErr("별점은 1~5 사이여야 합니다.");
    if (!comment.trim() && selectedIds.length === 0)
      return setErr("키워드 또는 코멘트 중 하나 이상 입력해 주세요.");

    try {
      setLoading(true);
      setErr("");

      await apiRequest.post("/api/reviews", {
        reservationId: Number(reservationId),
        companyId: Number(companyId),
        rating: Number(rating),
        comment: comment.trim(),
        // 백엔드가 List<Integer> 기대 → 숫자 배열 보장
        keywordIds: selectedIds.map((n) => Number(n)),
        // 서버에서 안써도 무해. 필요없다면 제거 가능
        serviceType,
      });

      alert("리뷰가 등록되었습니다.");
      navigate("/my-bookings");
    } catch (e2) {
      setErr(e2?.response?.data?.message || e2.message || "등록 실패");
    } finally {
      setLoading(false);
    }
  };

  if (!isLogined) return <div className="container">로그인이 필요합니다.</div>;
  if (!reservationId || !companyId)
    return <div className="container">잘못된 접근입니다.</div>;

  return (
    <div className="container" style={{ maxWidth: 720, margin: "24px auto" }}>
      <h1>리뷰 작성</h1>
      <p style={{ color: "#666" }}>
        예약번호 #{reservationId} · 업체 ID {companyId}
      </p>
      {productName && (
        <p style={{ color: "#444", marginTop: 4 }}>
          서비스: <b>{productName}</b> ({serviceType})
        </p>
      )}

      {err && <div style={{ color: "crimson", marginTop: 12 }}>{err}</div>}

      <form onSubmit={submit} style={{ marginTop: 16 }}>
        {/* 별점 */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 8 }}>별점</label>
          <div>
            {[1, 2, 3, 4, 5].map((n) => {
              const active = n === rating;
              return (
                <button
                  type="button"
                  key={n}
                  onClick={() => setRating(n)}
                  disabled={loading}
                  style={{
                    marginRight: 6,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: active ? "2px solid #ff8b5c" : "1px solid #ddd",
                    background: active ? "#fff4ef" : "#fff",
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  {n} ♥
                </button>
              );
            })}
          </div>
        </div>

        {/* 키워드 */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 8 }}>키워드 선택</label>
          {keywords.length === 0 ? (
            <div style={{ color: "#888" }}>해당 서비스의 키워드가 없습니다.</div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {keywords.map((k) => {
                const id = Number(k.id);
                const active = selectedIds.includes(id);
                return (
                  <button
                    type="button"
                    key={id}
                    onClick={() => toggleKeyword(id)}
                    title={k.category || ""}
                    disabled={loading}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: active ? "2px solid #ff8b5c" : "1px solid #ddd",
                      background: active ? "#fff4ef" : "#fff",
                      cursor: loading ? "not-allowed" : "pointer",
                    }}
                  >
                    {k.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 코멘트 */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 8 }}>코멘트</label>
          <textarea
            rows={6}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="서비스 이용 후기를 작성해 주세요."
            disabled={loading}
            maxLength={1000}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 8,
              border: "1px solid #ddd",
            }}
          />
          <div style={{ textAlign: "right", color: "#999", marginTop: 4 }}>
            {comment.length}/1000
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={loading}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #ddd",
              background: "#fff",
            }}
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #ff8b5c",
              background: "#ff8b5c",
              color: "#fff",
            }}
          >
            {loading ? "등록 중..." : "등록"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReviewWritePage;
