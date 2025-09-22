import React, { useContext, useEffect, useState } from "react";
import BookingContext from "./BookingContext";
import {
  formatDateForAPI,
  getAvailableTimeSlots,
} from "../../services/booking/timeSlotService";
import { getMyPets } from "../../services/pet/petService";
import { getCompanyByIdPublic } from "../../services/companyService";
import { FaDog, FaCat } from "react-icons/fa";
import "./DateSelectStep.css";

// 달력 컴포넌트
const Calendar = ({ selectedDate, onDateSelect, disabledDates = [] }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();

    const days = [];
    for (let i = 0; i < firstDayOfWeek; i++) days.push(null);

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const isToday = date.toDateString() === today.toDateString();
      const isPast = date < today;
      const isSelected =
        selectedDate && date.toDateString() === selectedDate.toDateString();
      const isDisabled = disabledDates.some(
        (disabledDate) => date.toDateString() === disabledDate.toDateString()
      );

      days.push({
        day,
        date,
        isToday,
        isPast,
        isSelected,
        isDisabled,
        isAvailable: !isPast && !isDisabled,
      });
    }
    return days;
  };

  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const monthNames = [
    "1월","2월","3월","4월","5월","6월",
    "7월","8월","9월","10월","11월","12월"
  ];
  const dayNames = ["일","월","화","수","목","금","토"];

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button onClick={() => navigateMonth(-1)}>◀</button>
        <h4>
          {currentMonth.getFullYear()}년 {monthNames[currentMonth.getMonth()]}
        </h4>
        <button onClick={() => navigateMonth(1)}>▶</button>
      </div>

      <div className="calendar-daynames">
        {dayNames.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className="calendar-days">
        {getDaysInMonth().map((dayData, index) => (
          <div key={index} className="calendar-day">
            {dayData && (
              <button
                className={`calendar-cell 
                  ${dayData.isSelected ? "selected" : ""} 
                  ${dayData.isPast ? "past" : ""} 
                  ${dayData.isToday ? "today" : ""}`}
                onClick={() => dayData.isAvailable && onDateSelect(dayData.date)}
                disabled={!dayData.isAvailable}
              >
                {dayData.day}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// 시간 슬롯
const TimeSlots = ({ timeSlots, selectedTimeSlot, onTimeSlotSelect, loading }) => {
  if (loading) return <div className="loading-text">시간대를 불러오는 중...</div>;
  if (!timeSlots || timeSlots.length === 0)
    return <div className="empty-text">선택한 날짜에 예약 가능한 시간이 없습니다.</div>;

  return (
    <div className="timeslots">
      {timeSlots.map((slot, index) => (
        <button
          key={index}
          className={`timeslot-btn ${
            selectedTimeSlot?.startTime === slot.startTime ? "selected" : ""
          }`}
          onClick={() => slot.available && onTimeSlotSelect(slot)}
          disabled={!slot.available}
        >
          <div className="timeslot-time">
            {slot.startTime} - {slot.endTime}
          </div>
          <div className={`timeslot-status ${slot.available ? "available" : "unavailable"}`}>
            {slot.available ? "예약가능" : "예약불가"}
          </div>
        </button>
      ))}
    </div>
  );
};

// 반려동물 선택
const PetSelection = ({ pets, selectedPets, onPetToggle, loading }) => {
  if (loading) {
    return <div className="empty-text">반려동물 정보를 불러오는 중...</div>;
  }

  if (!pets || pets.length === 0) {
    return <div className="empty-text">등록된 반려동물이 없습니다.</div>;
  }

  return (
    <div className="pet-list">
      {pets.map((pet) => {
        // 백엔드 응답 형식에 맞게 수정
        const petBreed = pet.breed || pet.breedName || "알 수 없음";
        const petAge = pet.ageYear || "알 수 없음";

        // 고양이/강아지 아이콘 선택 (품종명 또는 이름으로 판단)
        const Icon = (petBreed.includes("고양이") || petBreed.includes("냥") ||
                      pet.name.includes("냥") || pet.name.includes("고양이")) ? FaCat : FaDog;

        return (
          <div
            key={pet.id}
            className={`pet-card ${selectedPets.includes(pet.id) ? "selected" : ""}`}
            onClick={() => onPetToggle(pet.id)}
          >
            <div className="pet-avatar">
              <Icon />
            </div>
            <div className="pet-info">
              <h5>{pet.name}</h5>
              <p>{petBreed} • {petAge}살</p>
            </div>
            {selectedPets.includes(pet.id) && <div className="pet-check">✓</div>}
          </div>
        );
      })}
    </div>
  );
};

const DateSelectStep = () => {
  const { state, dispatch } = useContext(BookingContext);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companyOperatingHours, setCompanyOperatingHours] = useState(null);
  const [disabledDates, setDisabledDates] = useState([]);

  // 업체 운영시간 로드 및 휴무일 계산
  const loadCompanyOperatingHours = async () => {
    if (!state.selectedProduct?.companyId) return;

    try {
      const companyInfo = await getCompanyByIdPublic(state.selectedProduct.companyId);
      console.log("업체 정보:", companyInfo);

      if (companyInfo.operatingHours) {
        setCompanyOperatingHours(companyInfo.operatingHours);
        calculateDisabledDates(companyInfo.operatingHours);
      }
    } catch (error) {
      console.error("업체 운영시간 로드 실패:", error);
    }
  };

  // 휴무일 계산 (다음 3개월)
  const calculateDisabledDates = (operatingHoursJson) => {
    try {
      const operatingHours = JSON.parse(operatingHoursJson);
      const disabledDates = [];

      // 현재 날짜부터 3개월 후까지 확인
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3);

      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dayOfWeek = date.getDay(); // 0=일요일, 1=월요일, ...
        const dayKey = getDayKeyFromDayOfWeek(dayOfWeek);

        // schedule 구조에서 해당 요일 확인
        if (operatingHours.schedule && operatingHours.schedule[dayKey]) {
          const daySchedule = operatingHours.schedule[dayKey];
          // 휴무일 체크
          if (daySchedule.closed === true) {
            disabledDates.push(new Date(date));
          }
        }
      }

      console.log("계산된 휴무일:", disabledDates);
      setDisabledDates(disabledDates);
    } catch (error) {
      console.error("휴무일 계산 실패:", error);
      setDisabledDates([]);
    }
  };

  // 요일 숫자를 한글 요일명으로 변환
  const getDayKeyFromDayOfWeek = (dayOfWeek) => {
    const dayMapping = {
      0: "일요일",
      1: "월요일",
      2: "화요일",
      3: "수요일",
      4: "목요일",
      5: "금요일",
      6: "토요일"
    };
    return dayMapping[dayOfWeek] || "월요일";
  };

  // 내 반려동물 정보 로드
  const loadMyPets = async () => {
    try {
      setLoading(true);
      const myPets = await getMyPets();
      console.log("내 반려동물 목록:", myPets);
      setPets(myPets);
      // BookingContext에도 펫 정보 저장
      dispatch({ type: "SET_AVAILABLE_PETS", payload: myPets });
    } catch (error) {
      console.error("반려동물 정보 로드 실패:", error);
      // 에러 시 빈 배열로 설정
      setPets([]);
      dispatch({ type: "SET_AVAILABLE_PETS", payload: [] });
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 펫 데이터 로드
  useEffect(() => {
    loadMyPets();
  }, []);

  // 선택된 상품이 변경될 때 업체 운영시간 로드
  useEffect(() => {
    if (state.selectedProduct?.companyId) {
      loadCompanyOperatingHours();
    }
  }, [state.selectedProduct?.companyId]);

  const loadTimeSlots = async (date) => {
    if (!state.selectedProduct?.id || !date) return;
    try {
      dispatch({ type: "SET_LOADING", field: "timeSlots", value: true });
      const formattedDate = formatDateForAPI(date);
      const timeSlots = await getAvailableTimeSlots(state.selectedProduct.id, formattedDate);
      dispatch({ type: "SET_AVAILABLE_TIME_SLOTS", payload: timeSlots || [] });
    } catch (error) {
      console.error("시간 슬롯 로드 실패:", error);
      dispatch({ type: "SET_AVAILABLE_TIME_SLOTS", payload: [] });
    } finally {
      dispatch({ type: "SET_LOADING", field: "timeSlots", value: false });
    }
  };

  useEffect(() => {
    if (state.selectedDate && state.selectedProduct) {
      loadTimeSlots(state.selectedDate);
    }
  }, [state.selectedDate, state.selectedProduct?.id]);

  const handleDateSelect = (date) => {
    dispatch({ type: "SELECT_DATE", payload: date });
    dispatch({ type: "SELECT_TIME_SLOT", payload: null });
  };

  const handleTimeSlotSelect = (timeSlot) => {
    dispatch({ type: "SELECT_TIME_SLOT", payload: timeSlot });
  };

  const handlePetToggle = (petId) => {
    dispatch({ type: "TOGGLE_PET", payload: petId });
  };

  const handleNext = () => {
    if (state.selectedDate && state.selectedTimeSlot && state.selectedPets.length > 0) {
      dispatch({ type: "SET_STEP", payload: 3 });
    }
  };

  const handlePrev = () => {
    dispatch({ type: "SET_STEP", payload: 1 });
  };

  const isNextEnabled =
    state.selectedDate && state.selectedTimeSlot && state.selectedPets.length > 0;

  return (
    <div className="date-select_wrap">
      {state.selectedProduct && (
        <div className="selected-product">
          <h4>{state.selectedProduct.name}</h4>
          <p>{state.selectedProduct.description}</p>
        </div>
      )}

      <div className="section">
        <h4>날짜 선택</h4>
        <Calendar
          selectedDate={state.selectedDate}
          onDateSelect={handleDateSelect}
          disabledDates={disabledDates}
        />
      </div>

      {state.selectedDate && (
        <div className="section">
          <h4>시간 선택</h4>
          <TimeSlots
            timeSlots={state.availableTimeSlots}
            selectedTimeSlot={state.selectedTimeSlot}
            onTimeSlotSelect={handleTimeSlotSelect}
            loading={state.loading.timeSlots}
          />
        </div>
      )}

      <div className="section">
        <h4>반려동물 선택</h4>
        <PetSelection pets={pets} selectedPets={state.selectedPets} onPetToggle={handlePetToggle} loading={loading} />
      </div>

      <div className="footer-btns">
        <button className="btn-prev" onClick={handlePrev}>이전</button>
        <button className="btn-next" onClick={handleNext} disabled={!isNextEnabled}>
          다음 단계
        </button>
      </div>
    </div>
  );
};

export default DateSelectStep;
