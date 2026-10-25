import {
  askAi,
  getInsights,
  getProduct,
  isStaticPages,
  listMovements,
  listProducts,
  updateStock,
} from "./api.js";

const app = document.getElementById("app");
let currentPage = "list";

// On GitHub Pages there is no backend, so show an honest static-demo
// banner instead of letting users discover broken buttons one by one.
if (isStaticPages()) {
  const banner = document.createElement("div");
  banner.className = "max-w-5xl mx-auto px-4 pt-4";
  banner.innerHTML = `<p class="bg-amber-100 border border-amber-300 rounded px-3 py-2 text-sm">Versi GitHub Pages ini demo statis (baca saja, data contoh). Daftar produk dan ringkasan tampil dari data contoh. Update stok dan chat AI butuh backend, jadi sementara nonaktif sampai backend di-deploy.</p>`;
  document.body.insertBefore(banner, app);
}

function setStatus(el, state, text) {
  el.innerHTML = `<p class="text-sm ${state === "error" ? "text-red-600" : "text-slate-500"}">${text}</p>`;
}

function productCard(p) {
  return `
    <article class="card">
      <h3 class="font-semibold">${p.name}</h3>
      <p class="text-sm text-slate-500">${p.id} - data contoh</p>
      <p class="mt-2">Harga contoh: Rp ${p.price.toLocaleString("id-ID")}</p>
      <p>Stok: <strong>${p.stock}</strong></p>
      <span class="inline-block mt-2 px-2 py-1 rounded text-xs badge-${p.availability}">${p.availability}</span>
      <p class="text-sm mt-2">Kanal (label, bukan sinkronisasi): ${p.channels.join(", ")}</p>
      <button data-detail="${p.id}" class="mt-3 bg-slate-900 text-white px-3 py-1 rounded text-sm">Lihat Detail</button>
    </article>`;
}

async function renderList() {
  app.innerHTML = `<h2 class="text-xl font-bold mb-4">Daftar Produk (Data Contoh)</h2>
    <div id="status"></div><div id="grid" class="product-grid mt-4"></div>`;
  const status = document.getElementById("status");
  setStatus(status, "loading", "Memuat produk...");
  try {
    const products = await listProducts();
    setStatus(status, "success", `${products.length} produk contoh dimuat.`);
    document.getElementById("grid").innerHTML = products.map(productCard).join("");
    document.querySelectorAll("[data-detail]").forEach((btn) => {
      btn.addEventListener("click", () => renderDetail(btn.dataset.detail));
    });
  } catch {
    setStatus(status, "error", "Gagal memuat produk. Pastikan backend berjalan di port 3001.");
  }
}

async function renderDetail(id) {
  app.innerHTML = `<button id="back" class="text-sm underline mb-4">Kembali ke daftar</button>
    <div id="status"></div><div id="detail"></div>`;
  document.getElementById("back").addEventListener("click", () => renderList());
  const status = document.getElementById("status");
  setStatus(status, "loading", "Memuat detail...");
  try {
    const p = await getProduct(id);
    const movements = await listMovements(id);
    setStatus(status, "success", "Detail produk berhasil dimuat.");
    document.getElementById("detail").innerHTML = `
      <div class="card">
        <h2 class="text-xl font-bold">${p.name}</h2>
        <p>ID: ${p.id} | Harga contoh: Rp ${p.price.toLocaleString("id-ID")} | Stok: ${p.stock} | ${p.availability}</p>
        <p class="mt-2">Kanal (label): ${p.channels.join(", ")}</p>
        <h3 class="font-semibold mt-4">Riwayat stok (contoh)</h3>
        <ul class="text-sm mt-2">${movements.map((m) => `<li>${m.created_at} - ${m.type} ${m.quantity} (${m.note || "-"})</li>`).join("") || "<li>Belum ada riwayat.</li>"}</ul>
      </div>`;
  } catch {
    setStatus(status, "error", "Gagal memuat detail produk.");
  }
}

async function renderStock() {
  app.innerHTML = `<h2 class="text-xl font-bold mb-4">Update Stok</h2>
    <form id="stock-form" class="card flex flex-col gap-3 max-w-md">
      <label>Product ID <input name="id" required class="border rounded px-2 py-1 w-full" placeholder="DUMMY-001" /></label>
      <label>Jenis <select name="type" class="border rounded px-2 py-1 w-full"><option value="in">Masuk</option><option value="out">Keluar</option></select></label>
      <label>Jumlah <input name="quantity" type="number" min="1" required class="border rounded px-2 py-1 w-full" /></label>
      <label>Catatan <input name="note" class="border rounded px-2 py-1 w-full" placeholder="opsional" /></label>
      <button class="bg-slate-900 text-white px-3 py-2 rounded">Simpan</button>
    </form><div id="status" class="mt-4"></div>`;
  const status = document.getElementById("status");
  document.getElementById("stock-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    setStatus(status, "loading", "Menyimpan...");
    try {
      const result = await updateStock(form.get("id"), {
        type: form.get("type"),
        quantity: Number(form.get("quantity")),
        note: form.get("note"),
      });
      setStatus(status, "success", `Berhasil. Stok baru ${result.product.name}: ${result.product.stock} (${result.product.availability}).`);
    } catch (err) {
      const msg = err.response?.data?.message || "Gagal menyimpan update stok.";
      setStatus(status, "error", `Gagal: ${msg}${isStaticPages() ? " Di GitHub Pages, fitur ini nonaktif karena backend belum di-deploy." : ""}`);
    }
  });
}

async function renderChat() {
  app.innerHTML = `<h2 class="text-xl font-bold mb-4">Chat AI (lewat Backend)</h2>
    <p class="text-sm text-slate-500 mb-4">Chat ini memanggil backend, bukan layanan Gen AI secara langsung. Jawaban memakai data contoh.</p>
    <form id="chat-form" class="card flex gap-2">
      <input name="message" required class="border rounded px-2 py-1 flex-1" placeholder="Tanya soal produk contoh, stok contoh, atau harga contoh..." />
      <button class="bg-slate-900 text-white px-3 py-1 rounded">Kirim</button>
    </form><div id="chat-status" class="mt-4"></div><div id="chat-answer" class="card mt-4 hidden"></div>`;
  const status = document.getElementById("chat-status");
  const answerBox = document.getElementById("chat-answer");
  document.getElementById("chat-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = new FormData(e.target).get("message");
    setStatus(status, "loading", "Menghubungi layanan AI lewat backend...");
    answerBox.classList.add("hidden");
    try {
      const result = await askAi(message);
      setStatus(status, "success", `Berhasil. Intent: ${result.intent ?? "-"} | Rute: ${result.route} | Generative AI: ${result.generative_ai}`);
      answerBox.textContent = result.answer;
      answerBox.classList.remove("hidden");
    } catch (err) {
      const msg = err.response?.data?.message || "Layanan AI tidak tersedia.";
      setStatus(status, "error", `Gagal: ${msg}${isStaticPages() ? " Di GitHub Pages, fitur ini nonaktif karena backend belum di-deploy." : ""}`);
    }
  });
}

async function renderInsights() {
  app.innerHTML = `<h2 class="text-xl font-bold mb-4">Ringkasan Bisnis (Data Contoh)</h2><div id="status"></div><div id="insights"></div>`;
  const status = document.getElementById("status");
  setStatus(status, "loading", "Memuat ringkasan...");
  try {
    const d = await getInsights();
    setStatus(status, "success", "Ringkasan berhasil dimuat.");
    // Phase 1: Data Science section, served by GET /api/v1/insights
    // from the Data Science dummy outputs. Every figure is labelled
    // dummy; when the outputs are missing the backend returns
    // data_science: null and a note, shown below instead of crashing.
    let dsHtml = `<p class="text-sm mt-2">${d.data_science_note || "Bagian Data Science tidak tersedia."}</p>`;
    if (d.data_science) {
      const s = d.data_science.business_summary;
      const m = d.data_science.baseline_model;
      const byChannel = Object.entries(s.units_by_channel_dummy || {})
        .map(([channel, units]) => `<li>${channel}: ${units} unit dummy</li>`)
        .join("");
      const finalStock = Object.entries(s.final_stock_dummy || {})
        .map(([id, stock]) => `<li>${id}: stok akhir dummy ${stock}</li>`)
        .join("");
      dsHtml = `
        <h3 class="font-semibold mt-4">Analisis Data Science (Data Dummy)</h3>
        <p>Total unit dummy terjual: ${s.total_units_sold_dummy}</p>
        <p>Total revenue dummy: Rp ${(s.total_revenue_dummy_idr || 0).toLocaleString("id-ID")}</p>
        <p>Baris stok menipis dummy (stock_end &lt;= 5): ${s.low_stock_rows_dummy} dari ${s.rows} baris</p>
        <h4 class="font-semibold mt-3">Unit dummy per kanal</h4>
        <ul class="text-sm mt-1">${byChannel}</ul>
        <h4 class="font-semibold mt-3">Stok akhir dummy</h4>
        <ul class="text-sm mt-1">${finalStock}</ul>
        <h3 class="font-semibold mt-4">Model baseline low-stock (Data Dummy)</h3>
        <p>Accuracy test dummy: ${m.accuracy} | Macro F1 test dummy: ${m.macro_f1}</p>
        <p class="text-sm">Split: ${m.split} | Train ${m.train_rows} baris, test ${m.test_rows} baris.</p>
        <p class="text-sm text-slate-500">${m.limitation || "Angka ini hanya demo pipeline pada data dummy, bukan forecast untuk ditindaklanjuti."}</p>`;
    }
    document.getElementById("insights").innerHTML = `
      <div class="card">
        <p>Total produk contoh: ${d.total_products}</p>
        <p>Total stok contoh: ${d.total_stock}</p>
        <p>Produk stok menipis/habis: ${d.low_stock_count}</p>
        <ul class="text-sm mt-2">${d.low_stock_products.map((p) => `<li>${p.name} - stok ${p.stock}</li>`).join("")}</ul>
        ${dsHtml}
      </div>`;
  } catch {
    setStatus(status, "error", "Gagal memuat ringkasan.");
  }
}

const pages = { list: renderList, stock: renderStock, chat: renderChat, insights: renderInsights };

document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    currentPage = btn.dataset.page;
    pages[currentPage]();
  });
});

renderList();
