import React, { useEffect, useState } from "react";
import "./CompanyDetailModal.css";
import reserved_white from "../../../../assets/images/map/reserved_white.png";
import mapmodal_home_img1 from "../../../../assets/images/map/mapmodal_home_img1.png";
import mapmodal_home_img2 from "../../../../assets/images/map/mapmodal_home_img2.png";
import mapmodal_home_img3 from "../../../../assets/images/map/mapmodal_home_img3.png";
import map_icon1 from "../../../../assets/images/map/map_icon1.png";
import map_icon2 from "../../../../assets/images/map/map_icon2.png";
import map_icon3 from "../../../../assets/images/map/map_icon3.png";
import map_icon4 from "../../../../assets/images/map/map_icon4.png";
import map_icon5 from "../../../../assets/images/map/map_icon5.png";
import map_icon6 from "../../../../assets/images/map/map_icon6.png";

function CompanyDetailModal({ selectedCompany, onClose, onBookingClick }) {
  const [activeTab, setActiveTab] = useState("home");
  const [showFullSchedule, setShowFullSchedule] = useState(false);

  // 리뷰 상태
  const [reviews, setReviews] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const zeroStats = {
    totalReviews: 0,
    averageRating: 0,
    ratingDistribution: [0, 0, 0, 0, 0],
    totalLikes: 0,
  };
  const [reviewStats, setReviewStats] = useState(zeroStats);

  const API_BASE = process.env.REACT_APP_SPRING_API_BASE || "http://localhost:8090";

  useEffect(() => {
    if (selectedCompany) {
      // 업체 변경 시 리뷰 관련 상태 초기화
      setReviews([]);
      setReviewError(null);
      setReviewLoading(false);
      setReviewStats(zeroStats);
      setShowFullSchedule(false);
      // console.debug("=== CompanyDetailModal.selectedCompany ===", selectedCompany);
    }
  }, [selectedCompany]); // 업체가 바뀔 때마다 초기화

  async function fetchCompanyReviews(companyId, page = 0, size = 10) {
    setReviewLoading(true);
    setReviewError(null);
    try {
      const res = await fetch(`${API_BASE}/api/reviews/company/${companyId}?page=${page}&size=${size}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reviewList = Array.isArray(data) ? data : data.content || [];
      setReviews(reviewList);

      if (reviewList.length > 0) {
        const totalRating = reviewList.reduce((sum, review) => sum + (Number(review.rating) || 0), 0);
        const avgRating = reviewList.length ? totalRating / reviewList.length : 0;
        const totalLikes = reviewList.reduce((sum, review) => sum + (Number(review.likes) || 0), 0);

        const distribution = [0, 0, 0, 0, 0];
        reviewList.forEach((review) => {
          const r = Number(review.rating) || 0;
          if (r >= 1 && r <= 5) distribution[r - 1] += 1;
        });

        setReviewStats({
          totalReviews: reviewList.length,
          averageRating: Number(avgRating.toFixed(1)),
          ratingDistribution: distribution,
          totalLikes,
        });
      } else {
        // 리뷰 없으면 반드시 0으로 리셋
        setReviewStats(zeroStats);
      }
    } catch (e) {
      setReviewError(e.message || "load error");
      setReviews([]);
      setReviewStats(zeroStats); // 에러 시에도 안전하게 리셋
    } finally {
      setReviewLoading(false);
    }
  }

  useEffect(() => {
    const cid = selectedCompany?.id ?? selectedCompany?.companyId;
    if (activeTab === "review" && cid) fetchCompanyReviews(cid, 0, 10);
  }, [activeTab, selectedCompany?.id, selectedCompany?.companyId]); // 탭 전환/업체 변경 시 재조회

  const getCompanyImageUrl = (imageData) => {
    if (!imageData) return null;
    if (imageData.filePath && imageData.filePath.startsWith("http")) return imageData.filePath;
    if (imageData.filePath) return `${API_BASE}/api/files/view?filePath=${encodeURIComponent(imageData.filePath)}`;
    return null;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return String(dateString).slice(0, 10).replace(/-/g, ".");
  };

  const renderStars = (rating) => {
    const r = Math.max(0, Math.min(5, Number(rating) || 0));
    const full = Math.floor(r);
    return "★".repeat(full) + "☆".repeat(5 - full);
  };

  if (!selectedCompany) return null;

  return (
    <div id="company-modal" className={`company-detail-modal ${selectedCompany ? "show" : ""}`}>
      <div className="modal-header">
        <button className="close-btn" onClick={onClose}>×</button>
        <h2>{selectedCompany.name}</h2>
      </div>

      <div className="modal-content">
        <div className="company-image-section">
          {(() => {
            const thumbnailImage = selectedCompany.images?.find((img) => img.isThumbnail === true);
            const firstImage = selectedCompany.images?.[0];
            const displayImage = thumbnailImage || firstImage;
            return displayImage ? (
              <img
                src={getCompanyImageUrl(displayImage)}
                alt={displayImage.altText || `${selectedCompany.name} 대표 사진`}
                className="company-main-image"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              />
            ) : null;
          })()}
          <div
            className="company-image-placeholder"
            style={{ display: selectedCompany.images?.length > 0 ? "none" : "flex" }}
          >
            📷 업체 사진
          </div>
        </div>

        <div className="reservation-section">
          <button onClick={() => onBookingClick && onBookingClick(selectedCompany)}>
            <img src={reserved_white} alt="예약하기" />
            <span>예약하기</span>
          </button>
        </div>

        <div className="tab-navigation">
          <a href="#none" className={`tab-item ${activeTab === "home" ? "active" : ""}`}
             onClick={(e) => { e.preventDefault(); setActiveTab("home"); }}>홈</a>
          <a href="#none" className={`tab-item ${activeTab === "review" ? "active" : ""}`}
             onClick={(e) => { e.preventDefault(); setActiveTab("review"); }}>리뷰</a>
          <a href="#none" className={`tab-item ${activeTab === "photo" ? "active" : ""}`}
             onClick={(e) => { e.preventDefault(); setActiveTab("photo"); }}>사진</a>
        </div>

        <div className="tab-content">
          {activeTab === "home" && (
            <div className="company-info">
              {selectedCompany.businessType !== "P" && selectedCompany.type !== "P" && (
                <div className="company-section-content">
                  <div className="coupon-section">
                    <div className="coupon-container">
                      <div className="coupon-header">
                        <img src={mapmodal_home_img1} alt="회복과 성장의 마중물" />
                        <img src={mapmodal_home_img2} alt="민생회복 소비쿠폰" />
                        <span className="sr-only">회복과 성장의 마중물 민생회복 소비쿠폰</span>
                      </div>
                      <div className="coupon-title">신용·체크 카드 사용 가능 매장</div>
                      <div className="coupon-notice">
                        <img src={mapmodal_home_img3} alt="안내" className="modal_home_img3" />
                        <span className="sr-only">안내</span>
                        소비쿠폰 가맹점 정보는 행안부(참여 신용카드사)와 사업주분들께서 제공한 정보로, 실제 사용 가능 여부는 매장에 확인해 주세요.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="info-section">
                <div className="info-item">
                  <span className="icon"><img src={map_icon1} alt="주소" /></span>
                  <div className="info-content">
                    <div className="label">주소</div>
                    <div className="value">{selectedCompany.roadAddr}</div>
                  </div>
                </div>

                <div className="info-item">
                  <span className="icon"><img src={map_icon2} alt="영업시간" /></span>
                  <div className="info-content">
                    <div className="label">영업시간</div>
                    <div className="business-hours-container">
                      <div className="today-hours">
                        <div className="business-status">
                          <span className="status-message">
                            {selectedCompany.currentBusinessMessage || "영업시간 정보 없음"}
                          </span>
                          <span className={`status-badge ${selectedCompany.currentBusinessStatus || "정보없음"}`}>
                            {selectedCompany.currentBusinessStatus || "정보없음"}
                          </span>
                        </div>
                        {selectedCompany.weeklySchedule && selectedCompany.weeklySchedule.length > 0 && (
                          <button className="schedule-toggle-btn" onClick={() => setShowFullSchedule(!showFullSchedule)}>
                            {showFullSchedule ? <img src={map_icon6} alt="닫기" /> : <img src={map_icon5} alt="열기" />}
                          </button>
                        )}
                      </div>

                      {showFullSchedule && selectedCompany.weeklySchedule && selectedCompany.weeklySchedule.length > 0 && (
                        <div className="full-schedule">
                          <div className="schedule-header">요일별 영업시간</div>
                          {selectedCompany.weeklySchedule.map((dayInfo, index) => (
                            <div key={index} className="schedule-item">
                              <span className="day">{dayInfo.day}</span>
                              <span className="hours">{dayInfo.status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="info-item">
                  <span className="icon"><img src={map_icon3} alt="연락처" /></span>
                  <div className="info-content">
                    <div className="label">연락처</div>
                    <div className="value">{selectedCompany.tel}</div>
                  </div>
                </div>

                <div className="info-item">
                  <span className="icon"><img src={map_icon4} alt="주요서비스" /></span>
                  <div className="info-content">
                    <div className="label">제공 서비스</div>
                    <div className="value">
                      {selectedCompany.serviceNames && selectedCompany.serviceNames.length > 0 ? (
                        selectedCompany.serviceNames.map((serviceName, index) => (
                          <span key={index} className="service-badge" style={{ marginRight: "8px", marginBottom: "4px" }}>
                            {serviceName}
                          </span>
                        ))
                      ) : (
                        <span className="service-badge">기타</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {selectedCompany.descText && (
                <div className="info-section">
                  <h4>업체 소개</h4>
                  <p className="description">{selectedCompany.descText}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "reservation" && (
            <div className="reservation-content">
              <div className="info-section">{/* ... */}</div>
            </div>
          )}

          {activeTab === "review" && (
            <div className="review-content">
              {reviewLoading && (
                <div className="review-loading">
                  <p>리뷰를 불러오는 중...</p>
                </div>
              )}

              {reviewError && (
                <div className="review-error">
                  <p>리뷰를 불러오는데 실패했습니다: {reviewError}</p>
                </div>
              )}

              {!reviewLoading && !reviewError && (
                <>
                  {/* 리뷰 통계 섹션 */}
                  <div className="review-stats-section">
                    <div className="review-stats-header">
                      <h3>❤️ 애정도 리뷰 ({reviewStats.totalReviews})</h3>
                    </div>

                    {reviewStats.totalReviews > 0 ? (
                      <div className="review-summary">
                        <div className="rating-overview">
                          <div className="average-rating">
                            <span className="rating-number">{reviewStats.averageRating}</span>
                            <div className="rating-stars">
                              {renderStars(Math.round(reviewStats.averageRating))}
                            </div>
                            <span className="rating-label">평균 평점</span>
                          </div>

                          <div className="stats-grid">
                            <div className="stat-item">
                              <span className="stat-number">{reviewStats.totalReviews}</span>
                              <span className="stat-label">총 리뷰수</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-number">
                                {Math.round(
                                  (reviewStats.ratingDistribution[4] / reviewStats.totalReviews) * 100
                                ) || 0}
                                %
                              </span>
                              <span className="stat-label">응답률</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-number">{reviewStats.totalLikes}</span>
                              <span className="stat-label">최근 예약</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // 리뷰가 없을 때 0점 표시
                      <div className="review-summary">
                        <div className="rating-overview">
                          <div className="average-rating">
                            <span className="rating-number">0.0</span>
                            <div className="rating-stars">{renderStars(0)}</div>
                            <span className="rating-label">평균 평점</span>
                          </div>
                          <div className="stats-grid">
                            <div className="stat-item">
                              <span className="stat-number">0</span>
                              <span className="stat-label">총 리뷰수</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-number">0%</span>
                              <span className="stat-label">응답률</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-number">0</span>
                              <span className="stat-label">최근 예약</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 리뷰 목록 */}
                  {reviews.length === 0 ? (
                    <div className="no-reviews">
                      <p>아직 등록된 리뷰가 없습니다.</p>
                      <p>첫 번째 리뷰를 남겨보세요!</p>
                    </div>
                  ) : (
                    <div className="review-list">
                      {reviews.map((review, index) => (
                        <div key={review.id || index} className="review-item">
                          <div className="review-header">
                            <div className="reviewer-info">
                              <div className="reviewer-avatar">
                                {(review.ownerNickName || "익명").charAt(0)}
                              </div>
                              <div className="reviewer-details">
                                <span className="reviewer-name">{review.ownerNickName || "익명"}</span>
                                <span className="reviewer-badge">with 댕댕이</span>
                                <span className="review-category">통털</span>
                              </div>
                            </div>
                            <div className="review-meta">
                              <div className="review-rating">
                                {renderStars(Number(review.rating) || 0)}
                              </div>
                              <span className="review-date">{formatDate(review.createdAt)}</span>
                              <div className="review-likes">
                                <span className="like-count">+{review.likes || Math.floor(Math.random() * 10)}</span>
                                <span className="like-label">애정도 상승</span>
                              </div>
                            </div>
                          </div>

                          {review.keywords && review.keywords.length > 0 && (
                            <div className="review-keywords">
                              {review.keywords.map((keyword, kidx) => (
                                <span key={kidx} className="keyword-tag">
                                  {keyword.label || keyword.name || String(keyword)}
                                </span>
                              ))}
                            </div>
                          )}

                          {review.comment && (
                            <div className="review-content">
                              <p>{review.comment}</p>
                            </div>
                          )}

                          {review.images && review.images.length > 0 && (
                            <div className="review-images">
                              {review.images.slice(0, 3).map((img, imgIdx) => (
                                <div key={imgIdx} className="review-image">
                                  <img src={getCompanyImageUrl(img)} alt={`리뷰 이미지 ${imgIdx + 1}`} />
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="review-actions">
                            <button className="helpful-btn">
                              👍 도움됐어요 ({Math.floor(Math.random() * 50) + 10})
                            </button>
                            <span className="helpful-question">이 리뷰가 도움이 되셨나요?</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {reviews.length > 0 && (
                    <div className="review-more">
                      <button className="more-reviews-btn">
                        리뷰 더보기 (
                        {reviewStats.totalReviews > reviews.length
                          ? reviewStats.totalReviews - reviews.length
                          : 0}
                        개 더)
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === "photo" && (
            <div className="photo-content">
              <div className="info-section">
                <h4>사진</h4>
                <div className="photo-grid">
                  {selectedCompany.images && selectedCompany.images.length > 0 ? (
                    [...selectedCompany.images]
                      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
                      .map((image, index) => (
                        <div key={image.id || index} className="photo-item">
                          <img
                            src={getCompanyImageUrl(image)}
                            alt={image.altText || `${selectedCompany.name} 사진 ${index + 1}`}
                            className="company-photo"
                            onError={(e) => {
                              e.target.style.display = "none";
                              e.target.nextSibling.style.display = "flex";
                            }}
                          />
                          <div className="photo-placeholder" style={{ display: "none" }}>
                            📷 {image.description || `사진 ${index + 1}`}
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="no-photos">
                      <p>등록된 사진이 없습니다.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CompanyDetailModal;
