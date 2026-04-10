/**
 * searxng.js — SearXNG search proxy service.
 *
 * Forwards search queries to the SearXNG instance and normalises results.
 */

const axios = require("axios");
const config = require("../config");

/**
 * Search SearXNG for a given query.
 * @param {string} query - The search query
 * @param {number} [page=1] - Page number
 * @param {string} [category=""] - Optional category filter
 * @returns {Promise<{ query: string, results: object[], number_of_results: number, suggestions: string[] }>}
 */
async function search(query, page = 1, category = "") {
  const params = {
    q: query,
    format: "json",
    pageno: page,
  };
  if (category) params.categories = category;

  try {
    const resp = await axios.get(`${config.SEARXNG_URL}/search`, {
      params,
      timeout: 15000,
      headers: { Accept: "application/json" },
    });

    return {
      query: resp.data.query || query,
      results: resp.data.results || [],
      number_of_results: resp.data.number_of_results || 0,
      suggestions: resp.data.suggestions || [],
      infoboxes: resp.data.infoboxes || [],
      answers: resp.data.answers || [],
    };
  } catch (err) {
    console.error("SearXNG search failed:", err.message);
    throw new Error(`SearXNG unreachable: ${err.message}`);
  }
}

/**
 * Fetch the HTML content of a URL for archiving.
 * @param {string} url - Target URL
 * @returns {Promise<string>} HTML content (capped at 50 KB)
 */
async function fetchPageContent(url) {
  try {
    const resp = await axios.get(url, {
      timeout: 10000,
      maxContentLength: 50 * 1024, // 50 KB cap
      headers: {
        "User-Agent": "SearchX-Archiver/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
      responseType: "text",
    });
    return resp.data;
  } catch (err) {
    console.warn(`⚠️  Could not fetch ${url}: ${err.message}`);
    return "";
  }
}

module.exports = { search, fetchPageContent };
