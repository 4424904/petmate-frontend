import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8090",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const res = await api.post("/auth/refresh");
        const newAccessToken = res.data.accessToken;

        localStorage.setItem("accessToken", newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        
        return api(originalRequest);

      } catch (refreshError) {

        localStorage.removeItem("accessToken");
        window.location.href = "/signin";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
