import { apiRequest } from '../api';
import dayjs from 'dayjs';

export const bookingService = {
  // 특정 날짜의 예약 목록 가져오기 (업체별)
  async getReservations(date, userInfo = null) {
    try {
      // 사용자 정보 검증
      console.log('getReservations - 전달받은 userInfo:', userInfo);
      const companyId = userInfo?.companyId;
      console.log('getReservations - 추출된 companyId:', companyId);

      if (!companyId) {
        throw new Error('업체 정보를 찾을 수 없습니다. 로그인을 확인해주세요.');
      }

      const dateStr = dayjs(date).format('YYYY-MM-DD');
      const searchParams = {
        startDate: dateStr,
        endDate: dateStr,
        limit: 50,
        offset: 0
      };

      console.log(`예약 목록 조회: 업체 ID ${companyId}, 날짜 ${dateStr}`);

      const response = await apiRequest.get(`/api/booking/company/${companyId}`, {
        params: searchParams
      });

      // 응답 데이터 검증
      if (!response.data) {
        console.warn('예약 목록 응답이 비어있습니다.');
        return [];
      }

      const bookings = Array.isArray(response.data) ? response.data : [response.data];

      return bookings.map(booking => this._transformBookingData(booking, dateStr));

    } catch (error) {
      console.error('예약 목록 조회 실패:', error);

      // 에러 타입별 처리
      if (error.response?.status === 401) {
        throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
      } else if (error.response?.status === 403) {
        throw new Error('이 업체의 예약 정보에 접근할 권한이 없습니다.');
      } else if (error.response?.status === 404) {
        console.log('해당 날짜에 예약이 없습니다.');
        return []; // 404는 정상적인 경우 (예약 없음)
      }

      throw error;
    }
  },

  // 오늘의 예약 통계 가져오기
  async getTodayStats(userInfo = null) {
    try {
      console.log('getTodayStats - 전달받은 userInfo:', userInfo);
      const today = dayjs().format('YYYY-MM-DD');
      const reservations = await this.getReservations(today, userInfo);

      return {
        total: reservations.length,
        pending: reservations.filter(r => r.status === 'pending').length,
        completed: reservations.filter(r => r.status === 'approved').length,
        cancelled: reservations.filter(r => r.status === 'cancelled').length
      };
    } catch (error) {
      console.error('통계 조회 실패:', error);
      return { total: 0, pending: 0, completed: 0, cancelled: 0 };
    }
  },

  // 예약 상태 업데이트
  async updateReservationStatus(reservationId, status, userInfo = null) {
    try {
      if (!reservationId) {
        throw new Error('예약 ID가 필요합니다.');
      }

      const backendStatus = this._getBackendStatus(status);
      console.log(`예약 상태 변경: ID ${reservationId}, 상태 ${status} → ${backendStatus}`);

      const response = await apiRequest.post(`/api/booking/${reservationId}/status`, null, {
        params: { status: backendStatus }
      });

      if (response.data?.success) {
        console.log('예약 상태 변경 성공');
        return response.data;
      } else {
        throw new Error(response.data?.message || '상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('예약 상태 업데이트 실패:', error);
      throw error;
    }
  },

  // 예약 취소
  async deleteReservation(reservationId, userInfo = null) {
    try {
      if (!reservationId) {
        throw new Error('예약 ID가 필요합니다.');
      }

      console.log(`예약 취소: ID ${reservationId}` );

      const response = await apiRequest.put(`/api/booking/${reservationId}/cancel`);

      if (response.data?.success) {
        console.log('예약 취소 성공');
        return response.data;
      } else {
        throw new Error(response.data?.message || '예약 취소에 실패했습니다.');
      }
    } catch (error) {
      console.error('예약 취소 실패:', error);
      throw error;
    }
  },

  // 프라이빗 메서드들
  _getFallbackCompanyId() {
    // localStorage에서 companyId 가져오기
    try {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      return userData.companyId || null; // null 반환으로 명확한 오류 처리
    } catch {
      return null; // null 반환으로 명확한 오류 처리
    }
  },

  _transformBookingData(booking, fallbackDate) {
    return {
      id: booking.id,
      userName: booking.ownerUserName || '이름 없음',
      userLocation: booking.location || '위치 정보 없음',
      userAvatar: '/avatars/default.jpg',
      serviceName: booking.productName || '서비스명 없음',
      petInfo: `${booking.petCount || 0}마리`,
      startTime: booking.startDt ? dayjs(booking.startDt).format('HH:mm') : '시간 없음',
      endTime: booking.endDt ? dayjs(booking.endDt).format('HH:mm') : '시간 없음',
      price: booking.totalPrice || 0,
      status: this._getUIStatus(booking.status),
      date: booking.startDt ? dayjs(booking.startDt).format('YYYY-MM-DD') : fallbackDate,
      // 추가 정보
      specialRequest: booking.specialRequest || '',
      paymentStatus: booking.paymentStatus || '',
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt
    };
  },

  _getUIStatus(backendStatus) {
    const statusMap = {
      '0': 'pending',
      '1': 'approved',
      '2': 'completed',
      '3': 'cancelled'
    };
    return statusMap[String(backendStatus)] || 'pending';
  },

  _getBackendStatus(uiStatus) {
    const statusMap = {
      'pending': '0',
      'approved': '1',
      'completed': '2',
      'cancelled': '3'
    };
    return statusMap[uiStatus] || '0';
  }
};