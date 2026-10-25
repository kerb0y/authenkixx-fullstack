/*
Prototype Express backend (decoupled from the frontend).

API base: /api/v1/
Gen AI is accessed ONLY via this backend (POST /api/v1/ai/chat proxies
to GENAI_SERVICE_URL, default http://127.0.0.1:8000/chat). The frontend
never calls the Gen AI service directly.
All data is dummy. No automatic sync, no orders/payments/shipping/
customer data. Gen AI chat history is stored in data/ai_history.json
(question, intent, answer, timestamp only; no customer data).
*/
const express = require("express");
const cors = require("cors");
const {
  productSchema,
  productUpdateSchema,
  stockMovementSchema,
  aiChatSchema,
  validate,
  availabilityForStock,
} = require("./src/validation");
const {
  loadInventory,
  saveInventory,
  loadAiHistory,
  appendAiHistory,
} = require("./src/storage");
const { loadDsOutputs } = require("./src/ds_outputs");

const app = express();
const PORT = process.env.PORT || 3001;
const GENAI_SERVICE_URL =
  process.env.GENAI_SERVICE_URL || "http://127.0.0.1:8000/chat";

app.use(cors());
app.use(express.json());

const ok = (res, data) => res.json({ status: "success", data });
const fail = (res, status, message) =>
  res.status(status).json({ status: "error", message });

app.get("/health", (req, res) => ok(res, { service: "fullstack-backend-prototype" }));

// --- Products -------------------------------------------------------
app.get("/api/v1/products", (req, res) => {
  const { search = "", availability = "", channel = "" } = req.query;
  let products = loadInventory().products;
  if (search) {
    products = products.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );
  }
  if (availability) products = products.filter((p) => p.availability === availability);
  if (channel) products = products.filter((p) => p.channels.includes(channel));
  ok(res, products);
});

app.get("/api/v1/products/:id", (req, res) => {
  const product = loadInventory().products.find((p) => p.id === req.params.id);
  if (!product) return fail(res, 404, "Product not found");
  ok(res, product);
});

app.post("/api/v1/products", (req, res) => {
  const result = validate(productSchema, req.body);
  if (!result.ok) return fail(res, 400, result.message);
  const data = loadInventory();
  const product = {
    id: `DUMMY-${String(data.products.length + 1).padStart(3, "0")}`,
    ...result.value,
    data_label: "dummy",
  };
  data.products.push(product);
  saveInventory(data);
  res.status(201).json({ status: "success", data: product });
});

app.put("/api/v1/products/:id", (req, res) => {
  const result = validate(productUpdateSchema, req.body);
  if (!result.ok) return fail(res, 400, result.message);
  const data = loadInventory();
  const product = data.products.find((p) => p.id === req.params.id);
  if (!product) return fail(res, 404, "Product not found");
  Object.assign(product, result.value);
  if (result.value.stock !== undefined) {
    product.availability = availabilityForStock(product.stock);
  }
  saveInventory(data);
  ok(res, product);
});

app.delete("/api/v1/products/:id", (req, res) => {
  const data = loadInventory();
  const index = data.products.findIndex((p) => p.id === req.params.id);
  if (index === -1) return fail(res, 404, "Product not found");
  const [removed] = data.products.splice(index, 1);
  saveInventory(data);
  ok(res, removed);
});

// --- Stock movements --------------------------------------------------
app.get("/api/v1/movements", (req, res) => {
  const { product_id = "" } = req.query;
  let movements = loadInventory().movements;
  if (product_id) movements = movements.filter((m) => m.product_id === product_id);
  ok(res, movements);
});

app.post("/api/v1/products/:id/stock", (req, res) => {
  const result = validate(stockMovementSchema, req.body);
  if (!result.ok) return fail(res, 400, result.message);
  const data = loadInventory();
  const product = data.products.find((p) => p.id === req.params.id);
  if (!product) return fail(res, 404, "Product not found");
  const { type, quantity, note } = result.value;
  const newStock = type === "in" ? product.stock + quantity : product.stock - quantity;
  if (newStock < 0) {
    return fail(res, 400, "Stock cannot go below zero for this product");
  }
  product.stock = newStock;
  product.availability = availabilityForStock(newStock);
  const movement = {
    id: `MOV-${Date.now()}`,
    product_id: product.id,
    type,
    quantity,
    note,
    created_at: new Date().toISOString(),
  };
  data.movements.push(movement);
  saveInventory(data);
  res.status(201).json({ status: "success", data: { product, movement } });
});

// --- Business insights: dummy inventory + Data Science outputs -------
// Phase 1: the Data Science section is read from
// data-science/outputs/business_summary.json and baseline_model.json
// via DS_OUTPUTS_DIR (default ../../data-science/outputs from
// fullstack/backend). If those files are missing, the endpoint still
// returns the inventory-only insights with data_science: null and a
// clear note, and never crashes.
app.get("/api/v1/insights", (req, res) => {
  const { products } = loadInventory();
  const lowStock = products.filter((p) => p.stock <= 5);
  const ds = loadDsOutputs();
  ok(res, {
    total_products: products.length,
    total_stock: products.reduce((sum, p) => sum + p.stock, 0),
    low_stock_count: lowStock.length,
    low_stock_products: lowStock.map((p) => ({ id: p.id, name: p.name, stock: p.stock })),
    by_availability: {
      tersedia: products.filter((p) => p.availability === "tersedia").length,
      menipis: products.filter((p) => p.availability === "menipis").length,
      habis: products.filter((p) => p.availability === "habis").length,
    },
    data_label: "dummy",
    note: ds.available
      ? "Inventory totals computed from prototype dummy inventory; data_science section read from Data Science dummy outputs."
      : "Inventory totals computed from prototype dummy inventory only; Data Science outputs were not found (see data_science_note).",
    data_science: ds.available
      ? {
          business_summary: ds.business_summary,
          baseline_model: ds.baseline_model,
          source_dir: ds.source_dir,
          data_label: "dummy",
        }
      : null,
    data_science_note: ds.available
      ? "Data Science outputs loaded from DS_OUTPUTS_DIR; all figures are dummy data."
      : `Data Science outputs not found in DS_OUTPUTS_DIR (${ds.source_dir}); showing inventory-only insights.`,
  });
});

// --- Gen AI proxy (backend only, never frontend-direct) ---------------
app.post("/api/v1/ai/chat", async (req, res) => {
  const result = validate(aiChatSchema, req.body);
  if (!result.ok) return fail(res, 400, result.message);
  let genAi;
  try {
    const response = await fetch(GENAI_SERVICE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: result.value.message }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      return fail(res, 502, "Gen AI service returned an error. Please try again later.");
    }
    genAi = await response.json();
  } catch {
    return fail(
      res,
      502,
      "Gen AI service is unavailable. Start the gen-ai service on port 8000 and try again."
    );
  }
  const entry = appendAiHistory({
    message: result.value.message,
    intent: genAi.intent ?? null,
    route: genAi.route ?? null,
    answer: genAi.answer ?? "",
    created_at: new Date().toISOString(),
  });
  ok(res, { ...genAi, history_id: entry.created_at });
});

app.get("/api/v1/ai/history", (req, res) => ok(res, loadAiHistory()));

// --- Fallbacks ---------------------------------------------------------
app.use("/api/v1", (req, res) => fail(res, 404, "API route not found"));
app.use((err, req, res, next) => {
  console.error(err);
  fail(res, 500, "Internal server error");
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Prototype backend listening on http://localhost:${PORT}`);
    console.log(`Gen AI service URL: ${GENAI_SERVICE_URL}`);
  });
}

module.exports = app;
