import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "https://minutechart.onrender.com/api",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("jwtToken"); // store token after login
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
