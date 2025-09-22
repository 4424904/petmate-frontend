// src/services/api.js
import axios from "axios";

const API_BASE = process.env.REACT_APP_SPRING_API_BASE || "http://localhost:8090";

const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true,   // refreshToken HttpOnly 쿠키
    timeout: 60000,
});

// === 토큰 유틸 ===
const getAccessToken = () => localStorage.getItem("accessToken") || "";
const setAccessToken = (t) =>
    t ? localStorage.setItem("accessToken", t) : localStorage.removeItem("accessToken");

export const getAuthHeaders = () => {
    const t = getAccessToken();
    return t ? {
        Authorization: `Bearer ${t}`
    } : {};
};

// 401 처리: refresh 후 한 번만 재시도 이거라도 되면 가능(제발..)
const tryRefresh = async () => {
    try {
        console.log('🔄 JWT 토큰 갱신 시도...');
        const res = await axios.post(`${API_BASE}/auth/refresh`, null, {
            withCredentials: true,
            timeout: 5000
        });
        const newToken = res?.data?.accessToken;
        if (newToken) {
            setAccessToken(newToken);
            console.log(' JWT 토큰 갱신 성공');
            return newToken;
        }
        console.log('JWT 토큰 갱신 실패: 응답에 accessToken 없음');
        return null;
    } catch (error) {
        console.log('JWT 토큰 갱신 실패:', error.response?.status || error.message);
        return null;
    }
};

// 인터셉터로 모든 요청/응답 로그
api.interceptors.request.use((config) => {
    console.log("[api] 요청:", config.method?.toUpperCase(), config.url, {
        headers: config.headers,
        data: config.data,
    });
    return config;
});
api.interceptors.response.use(
    (res) => {
        console.log("[api] 응답:", res.status, res.config.url, res.data);
        return res;
    },
    (err) => {
        console.warn("[api] 응답 에러:", err?.response?.status, err?.config?.url, err?.response?.data);
        // 401 에러는 apiRequest에서 처리하도록 그대로 전달
        return Promise.reject(err);
    }
);

// /auth/me
export const fetchMe = async ({ silent = false } = {}) => {
    try {
        const res = await api.get("/auth/me", {
            headers: getAuthHeaders()
        });
        return res?.data;
    } catch (e) {
        if (e?.response?.status === 401) {
            const t = await tryRefresh();
            if (t) {
                const res = await api.get("/auth/me", {
                    headers: {
                        Authorization: `Bearer ${t}`
                    }
                });
                return res?.data;
            }
            if (!silent) {
                setAccessToken("");
                // 개발 중 불편함 해소: intro, signin 페이지가 아닌 경우만 리다이렉트
                const currentPath = window.location.pathname;
                if (!currentPath.includes("/signin") &&
                    !currentPath.includes("/intro") &&
                    !currentPath.includes("/signup")) {
                    console.warn("JWT 토큰 만료로 로그인 페이지로 이동합니다.");
                    window.location.href = "/signin";
                }
            }
            return null;
        }
        throw e;
    }
};

// 공통 래퍼
export const apiRequest = {
    get: async (url, config = {}) => {
        try {
            return await api.get(url, {
                ...config,
                headers: {
                    ...config.headers,
                    ...getAuthHeaders()
                }
            });
        } catch (e) {
            if (e?.response?.status === 401) {
                console.log('🔄 GET 요청 401 에러, 토큰 갱신 시도:', url);
                const t = await tryRefresh();
                if (t) {
                    console.log('✅ 토큰 갱신 후 GET 요청 재시도:', url);
                    return await api.get(url, {
                        ...config,
                        headers: {
                            ...config.headers,
                            Authorization: `Bearer ${t}`
                        }
                    });
                }
                setAccessToken("");
                console.log('❌ 토큰 갱신 실패, 인증 필요');
            }
            throw e;
        }
    },
    post: async (url, data, config = {}) => {
        try {
            return await api.post(url, data, {
                ...config, headers: {
                    ...config.headers,
                    ...getAuthHeaders()
                } 
            });
        } catch (e) {
            if (e?.response?.status === 401) {
                console.log('🔄 POST 요청 401 에러, 토큰 갱신 시도:', url);
                const t = await tryRefresh();
                if (t) {
                    console.log('✅ 토큰 갱신 후 POST 요청 재시도:', url);
                    return await api.post(url, data, {
                        ...config,
                        headers: {
                            ...config.headers,
                            Authorization: `Bearer ${t}`
                        }
                    });
                }
                setAccessToken("");
                console.log('❌ 토큰 갱신 실패, 인증 필요');
            }
            throw e;
        }
    },
    put: async (url, data, config = {}) => {
        try {
            return await api.put(url, data,
                {
                    ...config, headers: {
                        ...config.headers,
                        ...getAuthHeaders()
                    }
                });
        } catch (e) {
            if (e?.response?.status === 401) {
                console.log('🔄 PUT 요청 401 에러, 토큰 갱신 시도:', url);
                const t = await tryRefresh();
                if (t) {
                    console.log('✅ 토큰 갱신 후 PUT 요청 재시도:', url);
                    return await api.put(url, data, {
                        ...config,
                        headers: {
                            ...config.headers,
                            Authorization: `Bearer ${t}`
                        }
                    });
                }
                setAccessToken("");
                console.log('❌ 토큰 갱신 실패, 인증 필요');
            }
            throw e;
        }
    },
    delete: async (url, config = {}) => {
        try {
            return await api.delete(url, {
                ...config,
                headers: {
                    ...config.headers,
                    ...getAuthHeaders()
                }
            });
        } catch (e) {
            if (e?.response?.status === 401) {
                console.log('🔄 DELETE 요청 401 에러, 토큰 갱신 시도:', url);
                const t = await tryRefresh();
                if (t) {
                    console.log('✅ 토큰 갱신 후 DELETE 요청 재시도:', url);
                    return await api.delete(url, {
                        ...config,
                        headers: {
                            ...config.headers,
                            Authorization: `Bearer ${t}`
                        }
                    });
                }
                setAccessToken("");
                console.log('❌ 토큰 갱신 실패, 인증 필요');
            }
            throw e;
        }
    },
};

export default api;
