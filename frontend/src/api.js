import axios from "axios";

// Frontend talks ONLY to the backend. It never calls the Gen AI
// service directly; AI chat goes through POST /api/v1/ai/chat.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  timeout: 20000,
});

// GitHub Pages is static hosting only, so there is no backend there.
// On github.io, read-only pages fall back to the bundled demo data
// (frontend/public/demo-data.json, same dummy catalogue as the
// backend inventory). Stock updates and AI chat have no fallback:
// they genuinely need the backend, so they stay unavailable on Pages
// until the backend is deployed elsewhere.
export function isStaticPages() {
  return (
    typeof window !== "undefined" &&
    window.location.hostname.endsWith("github.io")
  );
}

let demoCache = null;

async function loadDemo() {
  if (!demoCache) {
    const res = await fetch(`${import.meta.env.BASE_URL}demo-data.json`);
    if (!res.ok) {
      throw new Error("Demo data not available");
    }
    demoCache = await res.json();
  }
  return demoCache;
}

export async function listProducts(params = {}) {
  try {
    const { data } = await api.get("/products", { params });
    return data.data;
  } catch (err) {
    if (isStaticPages()) {
      return (await loadDemo()).products;
    }
    throw err;
  }
}

export async function getProduct(id) {
  try {
    const { data } = await api.get(`/products/${id}`);
    return data.data;
  } catch (err) {
    if (isStaticPages()) {
      const demo = await loadDemo();
      const product = demo.products.find((p) => p.id === id);
      if (!product) {
        throw err;
      }
      return product;
    }
    throw err;
  }
}

export async function updateStock(id, payload) {
  const { data } = await api.post(`/products/${id}/stock`, payload);
  return data.data;
}

export async function listMovements(productId) {
  try {
    const { data } = await api.get("/movements", { params: { product_id: productId } });
    return data.data;
  } catch (err) {
    if (isStaticPages()) {
      const demo = await loadDemo();
      return demo.movements.filter((m) => m.product_id === productId);
    }
    throw err;
  }
}

export async function askAi(message) {
  const { data } = await api.post("/ai/chat", { message });
  return data.data;
}

export async function getInsights() {
  try {
    const { data } = await api.get("/insights");
    return data.data;
  } catch (err) {
    if (isStaticPages()) {
      return (await loadDemo()).insights;
    }
    throw err;
  }
}
