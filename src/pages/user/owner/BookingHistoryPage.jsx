import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import { useAuth } from "../../../contexts/AuthContext";
import { apiRequest } from "../../../services/api";
import { useNavigate } from "react-router-dom";
import "./BookingHistoryPage.css";

// 아이콘
import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaDog } from "react-icons/fa";
import { MdPayment, MdPets } from "react-icons/md";

dayjs.locale("ko");

const BookingHistoryPage = () => {
  const { user, isLogined } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all"); // all, pending, confirmed, completed, cancelled
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLogined || !user) {
      setError("로그인이 필요합니다.");
      return;
    }

    fetchMyBookings();
  }, [isLogined, user, filter]);

  const isCompleted = (status) => {
    const s = String(status);
    return s === "2" || s === "completed";
  };

  const goToReview = (booking) => {
    // 예약ID = booking.id, 업체ID = booking.companyId
    navigate(`/reviews/write?reservationId=${booking.id}&companyId=${booking.companyId}`);
  };

  const fetchMyBookings = async () => {
    // user.id, user.userId, user.memberId 등 다양한 필드를 확인
    const userId = user?.id || user?.userId || user?.memberId;
    if (!userId) {
      setError("사용자 정보를 찾을 수 없습니다.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("반려인 예약 내역 조회 ---> userId:", userId);
      console.log("전체 user 객체:", user);

      // 필터 상태를 백엔드 숫자 형식으로 변환
      const getBackendStatus = (filter) => {
        switch (filter) {
          case "pending": return "0";
          case "confirmed": return "1";
          case "rejected": return "2";
          case "cancelled": return "3";
          case "all": return null;
          default: return null;
        }
      };

      // 현재 사용자의 예약 데이터 조회
      const response = await apiRequest.get(`/api/booking/user/${userId}`, {
        params: {
          status: getBackendStatus(filter),
          limit: 50,
          offset: 0
        }
      });

      let bookingsData = response.data || [];

      // 임시로 테스트 이전 테스트 데이터(userId=1)도 함께 조회
      if (userId === 9) {
        try {
          const oldDataResponse = await apiRequest.get(`/api/booking/user/1`, {
            params: {
              status: getBackendStatus(filter),
              limit: 50,
              offset: 0
            }
          });
          const oldBookings = oldDataResponse.data || [];
          bookingsData = [...bookingsData, ...oldBookings];
          console.log(`이전 테스트 데이터 ${oldBookings.length}개 추가 로드`);
        } catch (oldDataError) {
          console.log("이전 데이터 조회 실패 (정상):", oldDataError.message);
        }
      }

      setBookings(bookingsData);
      console.log(`총 ${bookingsData.length}개의 예약 내역을 불러왔습니다.`);

      // 예약 데이터 구조 확인용 로그
      if (bookingsData.length > 0) {
        console.log('첫 번째 예약 데이터 구조:', bookingsData[0]);
        console.log('예약 데이터 필드들:', Object.keys(bookingsData[0]));
        console.log('시간 데이터 확인:', {
          startDt: bookingsData[0].startDt,
          endDt: bookingsData[0].endDt,
          reservationDate: bookingsData[0].reservationDate,
          startTime: bookingsData[0].startTime,
          endTime: bookingsData[0].endTime
        });

        // 모든 예약 데이터의 시간 정보 출력
        bookingsData.forEach((booking, index) => {
          console.log(`예약 ${index + 1} 시간 데이터:`, {
            id: booking.id,
            startDt: booking.startDt,
            endDt: booking.endDt,
            startTime: booking.startTime,
            endTime: booking.endTime,
            formatTime_startTime: booking.startTime,
            formatTime_endTime: booking.endTime,
            formatTime_startDt: booking.startDt,
            formatTime_endDt: booking.endDt
          });
        });
      }

      // 디버깅: 예약 데이터의 companyId와 날짜 확인
      if (bookingsData.length > 0) {
        console.log("예약 데이터 샘플:", bookingsData[0]);
        bookingsData.forEach((booking, index) => {
          console.log(`예약 ${index + 1} - companyId: ${booking.companyId}, companyName: ${booking.companyName}, 예약일: ${booking.reservationDate}`);
        });
      }

    } catch (error) {
      console.error("예약 내역 조회 실패:", error);

      if (error.response?.status === 401) {
        setError("로그인이 만료되었습니다. 다시 로그인해주세요.");
      } else if (error.response?.status === 404) {
        setBookings([]);
        setError(null); // 404는 정상 (예약 내역 없음)
      } else {
        setError("예약 내역을 불러오는데 실패했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    // 백엔드 숫자 상태를 문자열로 변환
    const normalizeStatus = (status) => {
      const statusStr = String(status);
      switch (statusStr) {
        case "0": return "pending";
        case "1": return "confirmed";
        case "2": return "completed";
        case "3": return "cancelled";
        default: return statusStr;
      }
    };

    const statusConfig = {
      "0": { text: "예약 대기", class: "status-pending" },
      "1": { text: "예약 확정", class: "status-confirmed" },
      "2": { text: "예약 거절", class: "status-rejected" },
      "3": { text: "예약 취소", class: "status-cancelled" },
      pending: { text: "예약 대기", class: "status-pending" },
      confirmed: { text: "예약 확정", class: "status-confirmed" },
      rejected: { text: "예약 거절", class: "status-rejected" },
      cancelled: { text: "예약 취소", class: "status-cancelled" }
    };

    const config = statusConfig[status] || { text: status, class: "status-default" };
    return <span className={`status-badge ${config.class}`}>{config.text}</span>;
  };

  const formatDate = (dateString) => {
    return dayjs(dateString).format("YYYY년 MM월 DD일 (ddd)");
  };

  const formatTime = (timeString) => {
    if (!timeString) return "시간 없음";

    // 이미 HH:mm 형식이면 그대로 반환
    if (typeof timeString === 'string' && timeString.match(/^\d{2}:\d{2}$/)) {
      return timeString;
    }

    // HH:mm:ss 형식이면 초 제거
    if (typeof timeString === 'string' && timeString.match(/^\d{2}:\d{2}:\d{2}$/)) {
      return timeString.substring(0, 5);
    }

    // DateTime 형식이면 시간만 추출
    if (typeof timeString === 'string' && timeString.includes('T')) {
      return dayjs(timeString).format("HH:mm");
    }

    // 날짜시간 형식 처리 (YYYY-MM-DD HH:mm:ss)
    if (typeof timeString === 'string' && timeString.includes(' ')) {
      try {
        return dayjs(timeString).format("HH:mm");
      } catch (error) {
        console.error('시간 포맷팅 오류:', timeString, error);
        return timeString;
      }
    }

    // 기타 형식 처리
    try {
      return dayjs(timeString).format("HH:mm");
    } catch (error) {
      console.error('시간 포맷팅 오류:', timeString, error);
      return String(timeString);
    }
  };

  // 취소 가능 여부 확인 (예약 시작 시간 이전까지만 취소 가능)
  const canCancelBooking = (booking) => {
    // 예약 상태가 취소 가능한 상태인지 확인 (승인대기, 예약확정만 취소 가능)
    const cancellableStatuses = ["0", "1", "pending", "confirmed"];
    if (!cancellableStatuses.includes(String(booking.status))) {
      return false;
    }

    // startDt 필드를 사용
    if (!booking.startDt) {
      return false;
    }

    try {
      // startDt를 사용하여 예약 시작 시간 계산
      const reservationDateTime = dayjs(booking.startDt);
      const currentDateTime = dayjs();

      // 현재 시간이 예약 시작 시간 이전인지 확인
      const canCancel = currentDateTime.isBefore(reservationDateTime);

      // 디버깅용 로그
      console.log('취소 가능 여부 확인:', {
        bookingId: booking.id,
        startDt: booking.startDt,
        reservationDateTime: reservationDateTime.format('YYYY-MM-DD HH:mm:ss'),
        currentDateTime: currentDateTime.format('YYYY-MM-DD HH:mm:ss'),
        canCancel,
        status: booking.status
      });

      return canCancel;
    } catch (error) {
      console.error('취소 가능 여부 확인 중 오류:', error, booking);
      return false;
    }
  };

  // 예약 취소 처리
  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm("정말로 예약을 취소하시겠습니까?")) {
      return;
    }

    try {
      setError(null);
      console.log("예약 취소 요청:", bookingId);

      const response = await apiRequest.put(`/api/booking/${bookingId}/cancel`);

      if (response.data?.success) {
        console.log("예약 취소 성공");
        // 예약 목록 새로고침
        fetchMyBookings();
        alert("예약이 성공적으로 취소되었습니다.");
      } else {
        throw new Error(response.data?.message || "예약 취소에 실패했습니다.");
      }
    } catch (error) {
      console.error("예약 취소 실패:", error);
      setError(error.message || "예약 취소 중 오류가 발생했습니다.");
    }
  };

  // 예약 상세보기 모달 열기
  const handleShowDetail = (booking) => {
    setSelectedBooking(booking);
    setShowDetailModal(true);
  };

  // 예약 상세보기 모달 닫기
  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedBooking(null);
  };

  if (loading) {
    return (
      <div className="booking-history-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>예약 내역을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-history-container">
      <div className="page-header">
        <h1>
          <FaCalendarAlt className="header-icon" />
          내 예약 내역
        </h1>
        <p>신청하신 펫케어 서비스 예약 현황을 확인하세요</p>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      {/* 필터 */}
      <div className="filter-section">
        <div className="filter-buttons">
          {[
            { key: "all", label: "전체" },
            { key: "pending", label: "예약 대기" },
            { key: "confirmed", label: "예약 확정" },
            { key: "rejected", label: "예약 거절" },
            { key: "cancelled", label: "취소" }
          ].map(item => (
            <button
              key={item.key}
              className={`filter-btn ${filter === item.key ? "active" : ""}`}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 예약 목록 */}
      <div className="bookings-section">
        {bookings.length === 0 ? (
          <div className="empty-state">
            <MdPets className="empty-icon" />
            <h3>예약 내역이 없습니다</h3>
            <p>아직 펫케어 서비스를 예약하지 않으셨어요.</p>
            <button
              className="primary-btn"
              onClick={() => window.location.href = "/map"}
            >
              서비스 찾아보기
            </button>
          </div>
        ) : (
          <div className="bookings-list">
            {bookings.map((booking) => (
              <div key={booking.id} className="booking-card">
                <div className="booking-header">
                  <div className="booking-title">
                    <h3>{booking.productName || "펫케어 서비스"}</h3>
                    {getStatusBadge(booking.status)}
                  </div>
                  <div className="booking-id">예약번호: {booking.id}</div>
                </div>

                <div className="booking-details">
                  <div className="detail-row">
                    <FaCalendarAlt className="detail-icon" />
                    <span>예약일: {formatDate(booking.reservationDate)}</span>
                  </div>

                  <div className="detail-row">
                    <FaClock className="detail-icon" />
                    <span>시간: {formatTime(booking.startTime || booking.startDt)} - {formatTime(booking.endTime || booking.endDt)}</span>
                  </div>

                  <div className="detail-row">
                    <FaMapMarkerAlt className="detail-icon" />
                    <span>업체: {booking.companyName || "업체명"}</span>
                  </div>

                  <div className="detail-row">
                    <FaDog className="detail-icon" />
                    <span>반려동물: {booking.petNames || "정보 없음"}</span>
                  </div>

                  <div className="detail-row">
                    <MdPayment className="detail-icon" />
                    <span>금액: {booking.totalPrice?.toLocaleString() || "0"}원</span>
                  </div>
                </div>

                <div className="booking-actions">
                  <button className="detail-btn">상세보기</button>
                  {isCompleted(booking.status) && (
                   <button
                     className="review-btn"
                     onClick={() => goToReview(booking)}
                   >
                     리뷰쓰기
                   </button>
                  )}
                  {canCancelBooking(booking) ? (
                    <button
                      className="cancel-btn"
                      onClick={() => handleCancelBooking(booking.id)}
                    >
                      예약취소
                    </button>
                  ) : (
                    (booking.status === "0" || booking.status === "1" || booking.status === "confirmed") && (
                      <span className="cancel-disabled">취소 불가 (예약시간 경과)</span>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 예약 상세보기 모달 */}
      {showDetailModal && selectedBooking && (
        <div className="modal-overlay" onClick={handleCloseDetailModal}>
          <div className="booking-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>예약 상세 정보</h2>
              <button className="modal-close-btn" onClick={handleCloseDetailModal}>
                ✕
              </button>
            </div>

            <div className="modal-content">
              <div className="detail-section">
                <h3>예약 정보</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>예약번호</label>
                    <span>{selectedBooking.id}</span>
                  </div>
                  <div className="detail-item">
                    <label>상태</label>
                    <span>{getStatusBadge(selectedBooking.status)}</span>
                  </div>
                  <div className="detail-item">
                    <label>서비스명</label>
                    <span>{selectedBooking.productName || "펫케어 서비스"}</span>
                  </div>
                  <div className="detail-item">
                    <label>업체명</label>
                    <span>{selectedBooking.companyName || "업체명"}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>예약 일시</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>예약일</label>
                    <span>{formatDate(selectedBooking.reservationDate)}</span>
                  </div>
                  <div className="detail-item">
                    <label>시간</label>
                    <span>
                      {formatTime(selectedBooking.startTime || selectedBooking.startDt)} - {formatTime(selectedBooking.endTime || selectedBooking.endDt)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>펫 정보</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>반려동물</label>
                    <span>{selectedBooking.petNames || "정보 없음"}</span>
                  </div>
                  <div className="detail-item">
                    <label>펫 수</label>
                    <span>{selectedBooking.petCount || 0}마리</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>결제 정보</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>총 금액</label>
                    <span className="price-highlight">
                      {selectedBooking.totalPrice?.toLocaleString() || "0"}원
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>결제 상태</label>
                    <span>{selectedBooking.paymentStatusName || "결제전"}</span>
                  </div>
                </div>
              </div>

              {selectedBooking.specialRequest && (
                <div className="detail-section">
                  <h3>특별 요청사항</h3>
                  <div className="special-request">
                    {selectedBooking.specialRequest}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions">
              {canCancelBooking(selectedBooking) && (
                <button
                  className="cancel-btn"
                  onClick={() => {
                    handleCancelBooking(selectedBooking.id);
                    handleCloseDetailModal();
                  }}
                >
                  예약 취소
                </button>
              )}
              <button className="close-btn" onClick={handleCloseDetailModal}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingHistoryPage;