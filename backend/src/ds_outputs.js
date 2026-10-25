/*
Data Science outputs loader for the Full-Stack backend (Phase 1).

The backend serves Data Science results as files, not as a live API:
it reads data-science/outputs/business_summary.json and
baseline_model.json. The directory is configurable via the
DS_OUTPUTS_DIR environment variable. The default is the relative path
../../data-science/outputs from fullstack/backend, i.e. the
data-science/outputs folder in the same prototype root.

If either file is missing or unreadable, this returns available=false
with both outputs null, so GET /api/v1/insights can still return the
inventory-only insights with a clear note instead of crashing.
All values served here are dummy data: both source files carry
data_label "dummy", and the backend preserves that label.
*/
const fs = require("fs");
const path = require("path");

const DEFAULT_DS_OUTPUTS_DIR = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "data-science",
  "outputs"
);

function resolveDsOutputsDir(envDir) {
  if (envDir) return path.resolve(envDir);
  return DEFAULT_DS_OUTPUTS_DIR;
}

function readJsonFile(file) {
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function loadDsOutputs(dir) {
  const sourceDir = dir || resolveDsOutputsDir(process.env.DS_OUTPUTS_DIR);
  try {
    const businessSummary = readJsonFile(
      path.join(sourceDir, "business_summary.json")
    );
    const baselineModel = readJsonFile(
      path.join(sourceDir, "baseline_model.json")
    );
    return {
      available: true,
      business_summary: businessSummary,
      baseline_model: baselineModel,
      source_dir: sourceDir,
      error: null,
    };
  } catch (err) {
    return {
      available: false,
      business_summary: null,
      baseline_model: null,
      source_dir: sourceDir,
      error: err.message,
    };
  }
}

module.exports = { resolveDsOutputsDir, loadDsOutputs, DEFAULT_DS_OUTPUTS_DIR };
