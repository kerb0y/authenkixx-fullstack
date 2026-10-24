import axios from "axios";

// Frontend talks ONLY to the backend. It never calls the Gen AI
// service directly; AI chat goes through POST /api/v1/ai/chat.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  timeout: 20000,
});

export async function listProducts(params = {}) {
  const { data } = await api.get("/products", { params });
  return data.data;
}

export async function getProduct(id) {
  const { data } = await api.get(`/products/${id}`);
  return data.data;
}

export async function updateStock(id, payload) {
  const { data } = await api.post(`/products/${id}/stock`, payload);
  return data.data;
}

export async function listMovements(productId) {
  const { data } = await api.get("/movements", { params: { product_id: productId } });
  return data.data;
}

export async function askAi(message) {
  const { data } = await api.post("/ai/chat", { message });
  return data.data;
}

export async function getInsights() {
  const { data } = await api.get("/insights");
  return data.data;
}
