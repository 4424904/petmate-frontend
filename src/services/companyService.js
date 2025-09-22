import { apiRequest } from "./api";

// 업체 등록
export const registerCompany = async (formData) => {
  const response = await apiRequest.post("/api/company/register", formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// 업체 목록 조회
export const getCompanies = async (params = {}) => {
  const response = await apiRequest.get("/api/company", { params });
  return response.data;
};

// 업체 상세 조회
export const getCompanyById = async (id) => {
  const response = await apiRequest.get(`/api/company/${id}`);
  return response.data;
};

// 업체 정보 수정
export const updateCompany = async (id, formData) => {
  const response = await apiRequest.put(`/api/company/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// 업체 삭제
export const deleteCompany = async (id) => {
  const response = await apiRequest.delete(`/api/company/${id}`);
  return response.data;
};

// 업체 승인 상태 변경
export const updateCompanyStatus = async (id, status) => {
  const response = await apiRequest.put(`/api/company/${id}/status`, { status });
  return response.data;
};

// 내가 등록한 업체 목록 조회
export const getMyCompanies = async () => {
  const response = await apiRequest.get("/api/company/my");
  return response.data;
};

// 개인 업체 등록 여부 확인 (createdBy 기반)
export const checkPersonalCompanyExists = async () => {
  const response = await apiRequest.get("/api/company/check-personal-exists");
  return response.data;
};

// 사업자등록정보 조회 (사업자번호로 상호명, 대표자명 자동 입력)
export const getBusinessInfo = async (businessNumber) => {
  const response = await apiRequest.post('/api/company/get-business-info', {
    businessNumber: businessNumber
  });
  return response.data;
};

// 근처 업체 조회
export const getNearbyCompanies = async (latitude, longitude, radius = 5.0, serviceType = null, keyword = null) => {
      const params = {
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          radius: radius.toString()
      };

      if (serviceType) {
          params.serviceType = serviceType;
      }

      if (keyword) {
          params.keyword = keyword;
      }

      const response = await apiRequest.get("/api/company/nearby", { params });
      return response.data;
  };

// 공개 업체 정보 조회 (인증 불필요)
export const getCompanyByIdPublic = async (id) => {
  const response = await apiRequest.get(`/api/company/public/${id}`);
  return response.data;
};