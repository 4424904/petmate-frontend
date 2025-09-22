import { apiRequest } from './../api';
import api from './../api';

// 예약 생성
export const createBooking = async (bookingData) => {
    try {
        // 예약 생성 API는 인증이 필요 없으므로 api 인스턴스 직접 사용 (Authorization 헤더 없음)
        const response = await api.post('/api/booking', bookingData);
        return response.data;
    } catch (error) {
        console.error("예약 생성 실패: ", error);
        throw error;
    }
};

// 예약 상세 조회
export const getBookingById = async (id) => {
    try {
        const response = await apiRequest.get(`/api/booking/${id}`);
        return response.data;

    } catch (error) {
        console.error("예약 상세 조회 실패: ", error);
        throw error;
    }
}

// 사용자별 예약 목록 조회
export const getUserBooking = async (userId, searchParams = {}) => {
    try {
        const response = await apiRequest.get(`/api/booking/user/${userId}` , {
            params: searchParams
        });
        return response.data;

    } catch (error) {
        console.error("사용자 예약 목록 조회 실패: ", error);
        throw error;
    }
}

// 업체별 예약 목록 조회
export const getCompanyBooking = async (companyId, searchParams = {}) => {
    try {
        const response = await apiRequest.get(`/api/booking/company/${companyId}`, {
            params: searchParams
        });
        return response.data;
    } catch (error) {
        console.error("업체별 예약 목록 조회 실패: ", error);
        throw error;
    }
}

// 예약 상태 변경
export const updateBooking = async (id, status) => {
    try {
        const response = await apiRequest.post(`/api/booking/${id}/status`, null, {
            params: {status}
        });
        return response.data; 
    } catch (error) {
        console.error("예약 상태 변경 실패: ", error);
        throw error;
        
    }
}

// 예약 취소
export  const cancelBooking = async(id) => {
    try {
        const response = await apiRequest.put(`/api/booking/${id}/cancel`);
            return response.data;
    } catch (error) {
        console.error('예약 취소 실패:', error);
        throw error;
    }
}

// 예약 확정 (업체용)
export const confirmBooking = async (id) => {
    try {
        const response = await apiRequest.put(`/api/booking/${id}/confirm`);
        return response.data;
    } catch (error) {
        console.error('예약 확정 실패:', error);
        throw error;
    }
};

// 예약 상태 코드 매핑
export const BOOKING_STATUS = {
    '0': '예약대기',
    '1': '예약확정',
    '2': '이용완료',
    '3': '취소됨'
};

// 상태 코드를 텍스트로 변환
export const getStatusText = (statusCode) => {
    return BOOKING_STATUS[statusCode] || '알 수 없음';
};