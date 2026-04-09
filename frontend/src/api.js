import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  timeout: 20_000,
});

/**
 * Run a search query through the SearchX backend.
 * @param {string} query
 * @returns {Promise<{block, results, drift, is_repeat_query}>}
 */
export async function search(query) {
  const { data } = await api.get("/search", { params: { q: query } });
  return data;
}

/**
 * Record a URL click linked to a search block.
 * @param {string} url
 * @param {number} searchBlockId
 * @returns {Promise<{block}>}
 */
export async function recordClick(url, searchBlockId) {
  const { data } = await api.post("/click", {
    url,
    search_block_id: searchBlockId,
  });
  return data;
}

/**
 * Fetch the full local ledger.
 * @returns {Promise<{blocks, total}>}
 */
export async function getLedger() {
  const { data } = await api.get("/ledger");
  return data;
}

export default api;
