/**
 * mirror.js — Full site mirroring service.
 *
 * Downloads a website (HTML + CSS + JS + images + fonts) to a local temp
 * directory at: data/mirror-backup/<url-hash>/
 *
 * Uses `website-scraper` (ESM v6) loaded via dynamic import so it works
 * from this CommonJS module.
 */

const fs   = require("fs");
const path = require("path");
const { sha256 } = require("./hasher");

const MIRROR_BASE_DIR = path.join(__dirname, "..", "..", "data", "mirror-backup");

// ── Helpers ───────────────────────────────────────────────────────────────────

function countFiles(dir) {
  try {
    let n = 0;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      n += entry.isDirectory() ? countFiles(path.join(dir, entry.name)) : 1;
    }
    return n;
  } catch { return 0; }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Mirror a website to a local folder.
 *
 * @param {string} url  - Target URL
 * @returns {Promise<string|null>}  Absolute path to the mirrored folder, or null on failure
 */
async function mirrorSite(url) {
  // Ensure base dir exists
  fs.mkdirSync(MIRROR_BASE_DIR, { recursive: true });

  const hash     = sha256(url).substring(0, 16);
  const outDir   = path.join(MIRROR_BASE_DIR, hash);

  // Start with a clean slate — website-scraper requires the directory to NOT
  // exist; it creates it internally and throws if it already exists.
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
  }

  // Dynamically import ESM-only package
  let scrape;
  try {
    const mod = await import("website-scraper");
    scrape = mod.default;
  } catch (e) {
    console.warn(`   ⚠️  website-scraper unavailable: ${e.message}`);
    return null;
  }

  console.log(`   🪞 Mirroring: ${url}`);
  try {
    await scrape({
      urls: [{ url, filename: "index.html" }],
      directory: outDir,
      recursive: false,       // single-page mirror (all assets, no link-following)
      maxDepth: 1,
      prettifyUrls: false,
      filenameGenerator: "bySiteStructure",
      requestConcurrency: 6,
      ignoreErrors: true,
      defaultFilename: "index.html",
      request: {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      },
      sources: [
        { selector: "link[rel~=stylesheet]",   attr: "href" },
        { selector: "link[rel~=icon]",          attr: "href" },
        { selector: "link[as=script]",          attr: "href" },
        { selector: "link[as=style]",           attr: "href" },
        { selector: "script",                   attr: "src"  },
        { selector: "img",                      attr: "src"  },
        { selector: "img",                      attr: "srcset" },
        { selector: "source",                   attr: "src"  },
        { selector: "source",                   attr: "srcset" },
        { selector: "video",                    attr: "src"  },
        { selector: "audio",                    attr: "src"  },
        { selector: "embed",                    attr: "src"  },
        { selector: "object",                   attr: "data" },
        { selector: "input",                    attr: "src"  },
        { selector: "track",                    attr: "src"  },
        { selector: "meta[property~=image]",    attr: "content" },
        { selector: "meta[name~=image]",        attr: "content" },
      ],
    });

    const fileCount = countFiles(outDir);
    console.log(`   ✅ Mirror done: ${fileCount} file(s) saved → ${outDir}`);
    return outDir;
  } catch (err) {
    console.warn(`   ⚠️  Mirror partial/failed for ${url}: ${err.message}`);
    // Return path anyway — even a partial mirror is useful
    return countFiles(outDir) > 0 ? outDir : null;
  }
}

module.exports = { mirrorSite, MIRROR_BASE_DIR };
