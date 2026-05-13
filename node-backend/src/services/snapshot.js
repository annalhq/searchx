/**
 * snapshot.js — Website snapshot service using Puppeteer.
 *
 * Provides two things:
 *   1. Full-page screenshot (PNG, base64-encoded) 
 *   2. Full HTML extraction (after JS rendering)
 *
 * Also extracts readable text content and page metadata (title, description,
 * links, images) similar to what the Internet Archive stores.
 */

const puppeteer = require("puppeteer");

/**
 * Captures a full-page screenshot and extracts the rendered HTML + metadata.
 *
 * @param {string} url - The URL to snapshot
 * @returns {Promise<{
 *   screenshot: string,      // base64-encoded PNG
 *   html: string,            // full rendered HTML
 *   text: string,            // visible text content
 *   title: string,
 *   description: string,
 *   links: string[],
 *   images: string[],
 *   capturedAt: string,
 * }>}
 */
async function captureSnapshot(url) {
  let browser;
  try {
    console.log(`   📸 Launching headless browser for: ${url}`);

    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--window-size=1280,900",
      ],
    });

    const page = await browser.newPage();

    // Set a realistic viewport
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });

    // Set a user-agent to avoid bot blocks
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Navigate with a generous timeout, wait for network to mostly settle
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Wait a bit more for lazy-loaded content
    await new Promise((r) => setTimeout(r, 1500));

    // ── Screenshot ──────────────────────────────────────────────────────────
    const screenshotBuffer = await page.screenshot({
      fullPage: true,
      type: "png",
      encoding: "base64",
    });

    // ── Full rendered HTML ───────────────────────────────────────────────────
    const html = await page.content();

    // ── Page metadata & text extraction ─────────────────────────────────────
    const metadata = await page.evaluate(() => {
      // Visible text — strip script/style tags
      const clone = document.body.cloneNode(true);
      clone.querySelectorAll("script, style, noscript, svg").forEach((el) => el.remove());
      const text = (clone.innerText || clone.textContent || "")
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 100000); // cap at 100 KB

      // Meta description
      const descEl =
        document.querySelector('meta[name="description"]') ||
        document.querySelector('meta[property="og:description"]');
      const description = descEl ? descEl.getAttribute("content") : "";

      // All links
      const links = Array.from(document.querySelectorAll("a[href]"))
        .map((a) => a.href)
        .filter((h) => h.startsWith("http"))
        .slice(0, 200);

      // All images
      const images = Array.from(document.querySelectorAll("img[src]"))
        .map((img) => img.src)
        .filter((s) => s.startsWith("http"))
        .slice(0, 50);

      return {
        title: document.title || "",
        description,
        links,
        images,
        text,
      };
    });

    console.log(`   ✅ Snapshot captured: ${metadata.title || url}`);

    return {
      screenshot: screenshotBuffer,
      html,
      text: metadata.text,
      title: metadata.title,
      description: metadata.description,
      links: metadata.links,
      images: metadata.images,
      capturedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn(`   ⚠️  Puppeteer snapshot failed for ${url}: ${err.message}`);
    // Return empty snapshot so archiving can continue
    return {
      screenshot: "",
      html: "",
      text: "",
      title: "",
      description: "",
      links: [],
      images: [],
      capturedAt: new Date().toISOString(),
      error: err.message,
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { captureSnapshot };
