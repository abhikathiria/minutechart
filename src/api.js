import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://172.20.10.2:5027/api",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
