import React, { useContext, useState } from "react";
import BookingContext from "./BookingContext";
import { createBooking } from "../../services/booking/bookingService";
import { formatDateForAPI, combineDateTime } from "../../services/booking/timeSlotService";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "./BookingConfirmStep.css"; // CSS 분리

const BookingConfirmStep = () => {
  const { state, dispatch } = useContext(BookingContext);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [agreedTerms, setAgreedTerms] = useState({
    all: false,
    service: false,
    privacy: false,
    payment: false,
  });

  // 약관 동의 핸들러
  const handleTermsChange = (type) => {
    if (type === "all") {
      const newValue = !agreedTerms.all;
      setAgreedTerms({
        all: newValue,
        service: newValue,
        privacy: newValue,
        payment: newValue,
      });
    } else {
      const newTerms = { ...agreedTerms, [type]: !agreedTerms[type] };
      newTerms.all = newTerms.service && newTerms.privacy && newTerms.payment;
      setAgreedTerms(newTerms);
    }
  };

  // 결제 금액 계산
  const calculateTotal = () => {
    const basePrice = state.selectedProduct?.price || 0;
    const petCount = state.selectedPets.length;
    const subtotal = basePrice * petCount;
    const tax = Math.floor(subtotal * 0.1);
    const total = subtotal + tax;

    return { subtotal, tax, total };
  };

  // 결제 버튼 활성화 여부
  const isPaymentEnabled = () => {
    return (
      agreedTerms.service &&
      agreedTerms.privacy &&
      agreedTerms.payment &&
      paymentMethod
    );
  };

  // 결제 처리
  const handlePayment = async () => {
    if (!isPaymentEnabled()) {
      alert("모든 필수 약관에 동의해주세요.");
      return;
    }

    if (!state.selectedStore || !state.selectedProduct || !state.selectedDate || !state.selectedTimeSlot) {
      alert("예약에 필요한 정보가 부족합니다. 이전 단계를 다시 확인해주세요.");
      return;
    }

    if (!state.selectedPets || state.selectedPets.length === 0) {
      alert("반려동물을 선택해주세요.");
      return;
    }

    try {
      dispatch({ type: "SET_LOADING", field: "booking", value: true });

      // 예약 데이터 생성 (현재 시간 기반)
      const now = new Date();
      const todayDate = formatDateForAPI(now);
      const currentHour = now.getHours();
      const currentMinute = String(now.getMinutes()).padStart(2, "0");
      const startTime = `${String(currentHour).padStart(2, "0")}:${currentMinute}`;
      const endHour = currentHour + 1;
      const endTime = `${String(endHour).padStart(2, "0")}:${currentMinute}`;

      const startDateTime = combineDateTime(todayDate, startTime);
      const endDateTime = combineDateTime(todayDate, endTime);

      const userId = user?.id || user?.userId || user?.memberId;
      if (!userId) throw new Error("로그인된 사용자 정보를 찾을 수 없습니다.");

      const { total } = calculateTotal();

      const bookingData = {
        ownerUserId: userId,
        companyId: state.selectedStore.companyId || state.selectedStore.id,
        productId: state.selectedProduct.id,
        startDt: startDateTime,
        endDt: endDateTime,
        petCount: state.selectedPets.length || 1,
        selectedPetIds: state.selectedPets, // 선택된 반려동물 ID 배열 추가
        totalPrice: total,
        specialRequest: state.specialRequests || "",
        status: "0", // 예약대기
      };

      console.log("예약 데이터:", bookingData);
      console.log("선택된 펫 IDs:", state.selectedPets);

      const createdBooking = await createBooking(bookingData);
      if (!createdBooking || !createdBooking.id) {
        throw new Error("예약 생성에 실패했습니다.");
      }

      localStorage.setItem("selectedPaymentMethod", paymentMethod);
      navigate(`/payment?bookingId=${createdBooking.id}`);
    } catch (error) {
      console.error("예약 생성 실패:", error);
      alert(`예약 생성 중 오류가 발생했습니다: ${error.message || error}`);
    } finally {
      dispatch({ type: "SET_LOADING", field: "booking", value: false });
    }
  };

  // 이전 단계 이동
  const handlePrev = () => {
    dispatch({ type: "SET_STEP", payload: 2 });
  };

  // 계산된 금액 꺼내오기
  const { subtotal, tax, total } = calculateTotal();

  return (
    <div className="booking-confirm-container">
      {/* 예약 정보 요약 */}
      <div className="section-card">
        <h4 className="section-title">📋 예약 정보</h4>
        <div className="info-list">
          <div className="info-item">
            <span className="label">업체명</span>
            <span className="value">{state.selectedStore?.name}</span>
          </div>
          <div className="info-item">
            <span className="label">서비스</span>
            <span className="value">{state.selectedProduct?.name}</span>
          </div>
          <div className="info-item">
            <span className="label">날짜</span>
            <span className="value">
              {state.selectedDate?.toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "long",
              })}
            </span>
          </div>
          <div className="info-item">
            <span className="label">시간</span>
            <span className="value">
              {state.selectedTimeSlot?.startTime} - {state.selectedTimeSlot?.endTime}
            </span>
          </div>
          <div className="info-item">
            <span className="label">반려동물</span>
            <span className="value">
              {state.selectedPets.length}마리
              {state.availablePets && state.selectedPets.length > 0 && (
                <div style={{ fontSize: "14px", color: "#666", marginTop: "4px" }}>
                  {state.availablePets
                    .filter(pet => state.selectedPets.includes(pet.id))
                    .map(pet => pet.name)
                    .join(", ")}
                </div>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* 결제 금액 */}
      <div className="section-card">
        <h4 className="section-title">💰 결제 금액</h4>
        <div className="price-list">
          <div className="price-item">
            <span>서비스 금액</span>
            <span>{subtotal.toLocaleString()}원</span>
          </div>
          <div className="price-item">
            <span>부가세</span>
            <span>{tax.toLocaleString()}원</span>
          </div>
          <div className="price-total">
            <span>총 결제 금액</span>
            <span>{total.toLocaleString()}원</span>
          </div>
        </div>
      </div>

      {/* 이용약관 */}
      <div className="section-card">
        <div className="terms-all" onClick={() => handleTermsChange("all")}>
          <input
            type="checkbox"
            checked={agreedTerms.all}
            onChange={() => handleTermsChange("all")}
          />
          <span>모든 약관에 동의합니다</span>
        </div>
        <div className="terms-list">
          {[
            { id: "service", name: "서비스 이용약관 동의 (필수)" },
            { id: "privacy", name: "개인정보 처리방침 동의 (필수)" },
            { id: "payment", name: "결제 서비스 약관 동의 (필수)" },
          ].map((term) => (
            <div
              key={term.id}
              className="terms-item"
              onClick={() => handleTermsChange(term.id)}
            >
              <input
                type="checkbox"
                checked={agreedTerms[term.id]}
                onChange={() => handleTermsChange(term.id)}
              />
              <span>{term.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="footer-buttons">
        <button className="btn-prev" onClick={handlePrev}>
          이전
        </button>
        <button
          className={`btn-payment ${isPaymentEnabled() && !state.loading.booking ? "active" : ""}`}
          onClick={handlePayment}
          disabled={!isPaymentEnabled() || state.loading.booking}
        >
          {state.loading.booking ? "예약 생성 중..." : `${total.toLocaleString()}원 결제하기`}
        </button>
      </div>
    </div>
  );
};

export default BookingConfirmStep;
