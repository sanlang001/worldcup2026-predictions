import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DATA_FILE = path.join(ROOT, "data.js");
const REPORTS_DIR = path.join(ROOT, "reports");
const UPSTREAM_OWNER = "joearkon";
const UPSTREAM_REPO = "worldcup2026-predictions";
const UPSTREAM_BRANCH = "main";
const SITE_NAME = "光年2026世界杯预测中心";
const SITE_AUTHOR = "1000光年";

const DATA_URL = `https://raw.githubusercontent.com/${UPSTREAM_OWNER}/${UPSTREAM_REPO}/${UPSTREAM_BRANCH}/data.js`;
const REPORTS_API_URL = `https://api.github.com/repos/${UPSTREAM_OWNER}/${UPSTREAM_REPO}/contents/reports`;
const DATA_API_URL = `https://api.github.com/repos/${UPSTREAM_OWNER}/${UPSTREAM_REPO}/contents/data.js?ref=${UPSTREAM_BRANCH}`;

function parseArgs(argv) {
  return {
    dryRun: argv.includes("--dry-run")
  };
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": `${UPSTREAM_REPO}-sync-script`,
      "Accept": "application/vnd.github+json"
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed ${response.status} for ${url}`);
  }

  return response.text();
}

async function fetchJson(url) {
  return JSON.parse(await fetchText(url));
}

async function fetchRepoFileContent(apiUrl) {
  const payload = await fetchJson(apiUrl);
  if (payload.encoding !== "base64" || !payload.content) {
    throw new Error(`Unsupported file payload from ${apiUrl}`);
  }
  return Buffer.from(payload.content.replace(/\n/g, ""), "base64").toString("utf8");
}

function replaceBranding(content) {
  return content
    .replaceAll("2026 世界杯预测中心", SITE_NAME)
    .replaceAll("2026世界杯精准预测", SITE_NAME)
    .replaceAll("powered by <b>坤桑</b>", `powered by <b>${SITE_AUTHOR}</b>`)
    .replaceAll("powered by 坤桑", `powered by ${SITE_AUTHOR}`)
    .replaceAll("worldcup2026.kunkun1023.xyz", "sanlang001.github.io/worldcup2026-predictions")
    .replaceAll(
      '<div style="text-align:center;font-size:10px;margin-top:10px;padding-bottom:8px"><a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener" style="color:#666;text-decoration:none">沪ICP备2025153381号-1</a></div>',
      ""
    );
}

function buildReportApiUrl(fileName) {
  return `https://api.github.com/repos/${UPSTREAM_OWNER}/${UPSTREAM_REPO}/contents/reports/${encodeURIComponent(
    fileName
  )}?ref=${UPSTREAM_BRANCH}`;
}

async function syncDataFile({ dryRun }) {
  const upstreamData = await fetchRepoFileContent(DATA_API_URL);
  const branded = replaceBranding(upstreamData);

  if (dryRun) {
    console.log(`[dry-run] Would update data.js from upstream repository`);
    return false;
  }

  const current = await fs.readFile(DATA_FILE, "utf8");
  if (current === branded) return false;
  await fs.writeFile(DATA_FILE, branded, "utf8");
  return true;
}

async function syncReports({ dryRun }) {
  const list = await fetchJson(REPORTS_API_URL);
  await fs.mkdir(REPORTS_DIR, { recursive: true });

  const remoteNames = new Set(list.map((item) => item.name));
  let changed = false;

  for (const item of list) {
    if (item.type !== "file") continue;
    const content = replaceBranding(await fetchRepoFileContent(buildReportApiUrl(item.name)));
    const target = path.join(REPORTS_DIR, item.name);

    let current = null;
    try {
      current = await fs.readFile(target, "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }

    if (current !== content) {
      changed = true;
      if (dryRun) {
        console.log(`[dry-run] Would write report ${item.name}`);
      } else {
        await fs.writeFile(target, content, "utf8");
      }
    }
  }

  const localFiles = await fs.readdir(REPORTS_DIR);
  for (const file of localFiles) {
    if (!file.endsWith(".html")) continue;
    if (remoteNames.has(file)) continue;

    changed = true;
    if (dryRun) {
      console.log(`[dry-run] Would remove local report not present upstream: ${file}`);
    } else {
      await fs.unlink(path.join(REPORTS_DIR, file));
    }
  }

  return changed;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dataChanged = await syncDataFile(args);
  const reportsChanged = await syncReports(args);

  if (args.dryRun) {
    console.log("Dry run completed.");
    return;
  }

  if (dataChanged || reportsChanged) {
    console.log("Upstream sync completed with changes.");
  } else {
    console.log("Upstream sync completed. No changes detected.");
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
