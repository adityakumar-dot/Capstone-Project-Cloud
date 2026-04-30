import axios from "axios";

// const API = axios.create({
//   baseURL: import.meta.env.VITE_API_BASE_URL, 
// });

const API = axios.create({
  baseURL: "http://project-alb-295252674.ap-south-1.elb.amazonaws.com", 
});

API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }

  const backend = localStorage.getItem("selectedBackend") || "fastapi";

  if (req.url) {
    // 1. Ensure the base request has '/api' 
    // (If your frontend already sends '/api/auth/login', this does nothing)
    let urlWithApi = req.url.startsWith('/api') 
      ? req.url 
      : `/api${req.url.startsWith('/') ? req.url : '/' + req.url}`;

    // 2. Handle Routing
    if (backend === "round-robin") {
      // Result: /api/auth/login
      req.url = urlWithApi;
    } else {
      // Result: /fastapi/api/auth/login
      req.url = `/${backend}${urlWithApi}`;
    }
  }

  return req;
}, (error) => {
  return Promise.reject(error);
});

export default API;