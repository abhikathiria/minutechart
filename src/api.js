// // local code
// import axios from "axios";

// const api = axios.create({
//   baseURL: "http://172.20.10.2:5027/api",
//   withCredentials: true,
// });

// export default api;

// render code
import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "https://minutechart.onrender.com/api",
  withCredentials: true,
});

export default api;