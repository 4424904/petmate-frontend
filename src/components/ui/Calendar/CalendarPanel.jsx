import React from "react";
import Calendar from "react-calendar";
import dayjs from "dayjs";
import "react-calendar/dist/Calendar.css";
import "dayjs/locale/ko";

// Day.js 한국어 로케일 설정
dayjs.locale("ko");

const CalendarPanel = ({ selectedDate, onDateChange, todayStats, monthlyReservations = {} }) => {
  // Day.js를 사용한 날짜 포맷팅 함수들
  const formatMonth = (locale, date) => {
    return dayjs(date).format("M월");
  };

  const formatYear = (locale, date) => {
    return dayjs(date).format("YYYY년");
  };

  const formatDay = (locale, date) => {
    return dayjs(date).format("D");
  };

  // 요일 포맷팅
  const formatShortWeekday = (locale, date) => {
    return dayjs(date).format("dd");
  };

  // 날짜 변경 핸들러
  const handleDateChange = (date) => {
    onDateChange(date);
  };

  // 특정 날짜에 예약이 있는지 표시하는 함수
  const getTileContent = ({ date, view }) => {
    if (view === "month") {
      const dateStr = dayjs(date).format('YYYY-MM-DD');
      const reservationCount = monthlyReservations[dateStr] || 0;

      if (reservationCount > 0) {
        return (
          <div className="reservation-indicator">
            <div className="reservation-dot"></div>
            <div className="reservation-count">{reservationCount}</div>
          </div>
        );
      }
      return null;
    }
  };

  // 타일 클래스명 설정
  const getTileClassName = ({ date, view }) => {
    if (view === "month") {
      const classes = [];
      const dateStr = dayjs(date).format('YYYY-MM-DD');
      const reservationCount = monthlyReservations[dateStr] || 0;

      // 오늘 날짜
      if (dayjs(date).isSame(dayjs(), "day")) {
        classes.push("calendar-today");
      }

      // 선택된 날짜
      if (dayjs(date).isSame(dayjs(selectedDate), "day")) {
        classes.push("calendar-selected");
      }

      // 과거 날짜
      if (dayjs(date).isBefore(dayjs(), "day")) {
        classes.push("calendar-past");
      }

      // 예약이 있는 날짜
      if (reservationCount > 0) {
        classes.push("calendar-has-reservation");
      }

      return classes.join(" ");
    }
  };

  return (
    <div className="calendar-panel">
      <div className="calendar-container">
        <div className="calendar-header">
          <h3>캘린더</h3>
        </div>

        <div className="react-calendar-wrapper">
          <Calendar
            onChange={handleDateChange}
            value={selectedDate}
            locale="ko-KR"
            calendarType="gregory" // 일요일 시작
            formatDay={formatDay}
            formatMonth={formatMonth}
            formatYear={formatYear}
            formatShortWeekday={formatShortWeekday}
            showNavigation={true}
            navigationLabel={({ date }) => dayjs(date).format("M월")}
            nextLabel=">"
            prevLabel="<"
            next2Label=">>"
            prev2Label="<<"
            showNeighboringMonth={true}
            tileContent={getTileContent}
            tileClassName={getTileClassName}
            minDate={dayjs().subtract(1, "year").toDate()} // 1년 전부터
            maxDate={dayjs().add(1, "year").toDate()} // 1년 후까지
          />
        </div>
      </div>

      <div className="today-stats">
        <h3>오늘의 예약 현황</h3>
        <div className="stats-grid">
          <div className="stat-item total">
            <span className="stat-label">총 예약</span>
            <span className="stat-value">{todayStats.total}건</span>
          </div>
          <div className="stat-item pending">
            <span className="stat-label">승인 대기</span>
            <span className="stat-value">{todayStats.pending}건</span>
          </div>
          <div className="stat-item completed">
            <span className="stat-label">승인 완료</span>
            <span className="stat-value">{todayStats.completed}건</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarPanel;
