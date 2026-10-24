/*
Prototype persistent storage: JSON files on disk.

This is prototype persistence, as allowed by the brief (SQLite or a
JSON file). Production can move to Neon/Postgres later; the JSON
shape is deliberately close to a products table so the move is easy.
No real UMKM data is stored here: only clearly labelled dummy data.
*/
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const INVENTORY_FILE = path.join(DATA_DIR, "inventory.json");
const HISTORY_FILE = path.join(DATA_DIR, "ai_history.json");

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function loadInventory() {
  return readJson(INVENTORY_FILE, { products: [], movements: [] });
}

function saveInventory(data) {
  writeJson(INVENTORY_FILE, data);
}

function loadAiHistory() {
  return readJson(HISTORY_FILE, []);
}

function appendAiHistory(entry) {
  const history = loadAiHistory();
  history.push(entry);
  writeJson(HISTORY_FILE, history);
  return entry;
}

module.exports = { loadInventory, saveInventory, loadAiHistory, appendAiHistory };
