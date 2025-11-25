import axios from "axios";

const api = axios.create({
  baseURL: "https://advance-son-nature-apparel.trycloudflare.com/api",
  headers: { "Content-Type": "application/json" },
});

export default api;
