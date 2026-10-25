/*
Backend smoke test: starts the app on a test port and exercises
the main routes. Run: npm run smoke (from backend/).
Gen AI proxy test is skipped gracefully if the gen-ai service is down:
the proxy must return a clear 502, not crash.
*/
const app = require("../server.js");
const { loadDsOutputs } = require("../src/ds_outputs");

const PORT = 3101;

function check(name, condition) {
  console.log(`${condition ? "PASS" : "FAIL"}: ${name}`);
  if (!condition) process.exitCode = 1;
}

async function main() {
  const server = app.listen(PORT);
  const base = `http://127.0.0.1:${PORT}`;
  try {
    let r = await fetch(`${base}/health`);
    check("GET /health returns 200", r.status === 200);

    r = await fetch(`${base}/api/v1/products`);
    const products = (await r.json()).data;
    check("GET /api/v1/products returns dummy products", Array.isArray(products) && products.length >= 1);

    r = await fetch(`${base}/api/v1/products/NK-DUMMY-001`);
    check("GET /api/v1/products/:id returns 200 for existing product", r.status === 200);

    r = await fetch(`${base}/api/v1/products/NOPE`);
    check("GET unknown product returns 404", r.status === 404);

    r = await fetch(`${base}/api/v1/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "x", price: -1, stock: 1, availability: "tersedia" }),
    });
    check("POST invalid product returns 400 (Joi validation)", r.status === 400);

    r = await fetch(`${base}/api/v1/products/NK-DUMMY-001/stock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "out", quantity: 999999, note: "smoke test, must fail" }),
    });
    check("POST stock below zero returns 400", r.status === 400);

    r = await fetch(`${base}/api/v1/insights`);
    const insights = (await r.json()).data;
    check("GET /api/v1/insights returns totals", typeof insights.total_products === "number");

    // Phase 1: Data Science section served from the DS outputs files.
    check(
      "GET /api/v1/insights includes data_science section (dummy)",
      insights.data_science !== null &&
        typeof insights.data_science.business_summary.total_units_sold_dummy === "number" &&
        typeof insights.data_science.baseline_model.accuracy === "number" &&
        insights.data_science.data_label === "dummy" &&
        insights.data_science.business_summary.data_label === "dummy" &&
        insights.data_science.baseline_model.data_label === "dummy"
    );
    check(
      "GET /api/v1/insights data_science totals match dummy outputs",
      insights.data_science.business_summary.total_units_sold_dummy === 82526 &&
        insights.data_science.business_summary.total_revenue_dummy_idr === 186375340000
    );

    // Missing-files fallback: loader must not throw and must report nulls.
    const missing = loadDsOutputs("/tmp/does-not-exist-phase1-ds-outputs");
    check(
      "DS loader returns available=false with null outputs for a missing directory (no crash)",
      missing.available === false &&
        missing.business_summary === null &&
        missing.baseline_model === null
    );

    r = await fetch(`${base}/api/v1/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "halo" }),
    });
    check(
      "POST /api/v1/ai/chat returns 200 (gen-ai up) or clear 502 (gen-ai down)",
      r.status === 200 || r.status === 502
    );
  } finally {
    server.close();
  }
}

main();
