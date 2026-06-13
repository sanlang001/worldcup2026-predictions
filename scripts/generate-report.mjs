import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DATA_FILE = path.join(ROOT, "data.js");
const REPORTS_DIR = path.join(ROOT, "reports");
const SITE_NAME = "光年2026世界杯预测中心";
const SITE_AUTHOR = "1000光年";

function parseArgs(argv) {
  const flags = {
    writeData: false,
    dryRun: false,
    force: false
  };
  const positional = [];

  for (const arg of argv) {
    if (arg === "--write-data") flags.writeData = true;
    else if (arg === "--dry-run") flags.dryRun = true;
    else if (arg === "--force") flags.force = true;
    else positional.push(arg);
  }

  if (positional.length !== 1) {
    throw new Error(
      "Usage: npm run generate:report -- <config.json> [--write-data] [--dry-run] [--force]"
    );
  }

  return { configPath: positional[0], flags };
}

function escHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function readScore(mainPrediction) {
  const match = String(mainPrediction).match(/(\d+)\s*-\s*(\d+)/);
  if (!match) throw new Error(`Cannot parse score from main prediction: ${mainPrediction}`);
  return { home: Number(match[1]), away: Number(match[2]) };
}

function jsString(value) {
  return JSON.stringify(value);
}

function toMatchEntry(config) {
  return [
    "    {",
    `      date: ${jsString(config.match.dateDisplay)},`,
    `      sortKey: ${jsString(config.match.sortKey)},`,
    `      group: ${jsString(config.match.group)},`,
    `      home: { flag: ${jsString(config.match.home.flag)}, name: ${jsString(config.match.home.name)} },`,
    `      away: { flag: ${jsString(config.match.away.flag)}, name: ${jsString(config.match.away.name)} },`,
    `      mainPred: ${jsString(config.prediction.main)},`,
    `      altPred: ${jsString(config.prediction.alt)},`,
    "      actual: null,",
    '      status: "pending",',
    `      report: ${jsString(config.reportFileName)},`,
    `      note: ${jsString(config.prediction.timelineNote || "")}`,
    "    },"
  ].join("\n");
}

function normalizeConfig(raw) {
  const required = [
    "pageTitle",
    "headerTitle",
    "subtitle",
    "match",
    "prediction",
    "dimensions",
    "probabilities",
    "keyMoments",
    "verdict",
    "sources"
  ];

  for (const key of required) {
    if (!(key in raw)) throw new Error(`Missing required field: ${key}`);
  }

  const score =
    Number.isInteger(raw.prediction.scoreHome) && Number.isInteger(raw.prediction.scoreAway)
      ? { home: raw.prediction.scoreHome, away: raw.prediction.scoreAway }
      : readScore(raw.prediction.main);

  const reportFileName =
    raw.reportFileName ||
    `世界杯小组赛预测_${raw.match.home.name}vs${raw.match.away.name}.html`;

  const footerLabel = raw.footerLabel || `${raw.match.group}预测`;

  return {
    ...raw,
    reportFileName,
    footerLabel,
    score
  };
}

function renderLeanClass(lean) {
  if (lean === "home") return "lean-home";
  if (lean === "away") return "lean-away";
  return "lean-even";
}

function renderBarClass(side) {
  if (side === "home") return "bar";
  if (side === "away") return "bar away";
  return "bar mid";
}

function renderReport(config) {
  const maxPct = Math.max(...config.probabilities.map((item) => item.pct), 1);

  const dimensionsHtml = config.dimensions
    .map(
      (item) => `
  <div class="dim">
    <span class="dim-name">${escHtml(item.name)}</span><span class="dim-lean ${renderLeanClass(item.lean)}">${escHtml(item.label)}</span>
    <span class="dim-desc">${item.desc}</span>
  </div>`
    )
    .join("");

  const probabilitiesHtml = config.probabilities
    .map((item) => {
      const width = Math.round((item.pct / maxPct) * 100);
      return `<div class="bar-row"><span class="bar-label">${escHtml(item.label)}</span><div class="bar-wrap"><div class="${renderBarClass(
        item.side
      )}" style="width:${width}%"></div></div><span class="bar-pct">${escHtml(item.pct)}%</span></div>`;
    })
    .join("\n  ");

  const playersHtml = config.keyMoments.players
    .map(
      (player) =>
        `<div class="player"><b>${escHtml(player.name)}</b><span>${player.desc}</span></div>`
    )
    .join("\n    ");

  const verdictHtml = config.verdict.paragraphs
    .map((paragraph) => `  <p>${paragraph}</p>`)
    .join("\n");

  const sourcesHtml = config.sources
    .map(
      (source) =>
        `<a href="${escHtml(source.url)}">${escHtml(source.label)}</a>`
    )
    .join(" ·\n    ");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escHtml(config.pageTitle)}</title>
<link rel="stylesheet" href="../theme.css?v=2">
<script src="../theme.js?v=2"></script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0d0d0d;color:#d4d4d4;font-family:'PingFang SC','Microsoft YaHei',sans-serif;padding:28px 20px;max-width:920px;margin:0 auto;line-height:1.7}
h1{font-size:24px;color:#fff;text-align:center;margin-bottom:4px}
.sub{text-align:center;font-size:12px;color:#666;margin-bottom:26px}
.vs-banner{display:flex;align-items:center;justify-content:center;gap:26px;background:linear-gradient(135deg,rgba(213,43,30,.18),rgba(17,17,17,.9) 40%,rgba(17,17,17,.9) 60%,rgba(0,60,140,.22));border:1px solid #222;border-radius:14px;padding:26px 18px;margin-bottom:18px}
.team{text-align:center;flex:1}
.team-flag{font-size:44px}
.team-name{font-size:19px;font-weight:800;color:#fff;margin-top:4px}
.team-tag{font-size:11px;color:#888;margin-top:2px}
.score-box{text-align:center}
.score{font-size:46px;font-weight:900;color:#e8b84b;letter-spacing:4px;font-variant-numeric:tabular-nums}
.score-label{font-size:11px;color:#666;margin-top:2px}
.card{background:#111;border:1px solid #1e1e1e;border-radius:10px;padding:18px 20px;margin-bottom:14px}
.card-title{font-size:12px;font-weight:700;color:#e8b84b;letter-spacing:.08em;margin-bottom:12px}
.dim{display:flex;align-items:baseline;gap:12px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.04);flex-wrap:wrap}
.dim:last-child{border-bottom:none}
.dim-name{font-size:13px;font-weight:700;color:#ddd;min-width:108px}
.dim-lean{font-size:11px;font-weight:700;padding:1px 9px;border-radius:4px;white-space:nowrap}
.lean-home{background:rgba(213,43,30,.16);color:#ff6b5e;border:1px solid rgba(213,43,30,.45)}
.lean-away{background:rgba(0,60,140,.2);color:#6aa5e8;border:1px solid rgba(0,60,140,.55)}
.lean-even{background:rgba(120,120,120,.12);color:#999;border:1px solid #333}
.dim-desc{font-size:12px;color:#999;flex:1;min-width:240px}
.bar-row{display:flex;align-items:center;gap:10px;margin:5px 0;font-size:12px}
.bar-label{min-width:64px;color:#bbb;font-variant-numeric:tabular-nums}
.bar-wrap{flex:1;background:#1a1a1a;height:14px;border-radius:4px;overflow:hidden}
.bar{height:100%;border-radius:4px;background:linear-gradient(90deg,#8c1f15,#ff6b5e)}
.bar.away{background:linear-gradient(90deg,#1d3f6e,#6aa5e8)}
.bar.mid{background:linear-gradient(90deg,#7a6210,#e8b84b)}
.bar-pct{min-width:38px;text-align:right;color:#e8b84b;font-weight:700;font-variant-numeric:tabular-nums}
.note{font-size:11px;color:#555;margin-top:10px}
.kv{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:4px}
@media(max-width:620px){.kv{grid-template-columns:1fr 1fr}}
.kv-item{background:#0a0a0a;border:1px solid #1a1a1a;border-radius:7px;padding:9px 11px}
.kv-l{font-size:10px;color:#555}
.kv-v{font-size:13px;font-weight:700;color:#fff;margin-top:2px}
.player-row{display:flex;gap:10px;flex-wrap:wrap;margin-top:6px}
.player{background:#0a0a0a;border:1px solid #222;border-radius:7px;padding:8px 12px;font-size:12px}
.player b{color:#fff}
.player span{color:#777;font-size:11px;display:block}
.verdict{background:linear-gradient(135deg,rgba(232,160,4,.08),rgba(17,17,17,.95));border:1px solid rgba(232,160,4,.35);border-radius:12px;padding:20px 22px;margin:18px 0}
.verdict-title{font-size:13px;font-weight:800;color:#e8b84b;margin-bottom:8px}
.verdict p{font-size:13px;color:#ccc;margin-bottom:8px}
.srcs{font-size:11px;color:#555;line-height:2}
.srcs a{color:#5a8abf;text-decoration:none}
.footer{text-align:center;font-size:11px;color:#444;margin-top:26px;letter-spacing:.05em}
.footer b{color:#e8b84b}
</style>
</head>
<body>

<h1>${escHtml(config.headerTitle)}</h1>
<div class="sub">${escHtml(config.subtitle)}</div>

<div class="vs-banner">
  <div class="team">
    <div class="team-flag">${escHtml(config.match.home.flag)}</div>
    <div class="team-name">${escHtml(config.match.home.name)}</div>
    <div class="team-tag">${escHtml(config.match.home.tag || "")}</div>
  </div>
  <div class="score-box">
    <div class="score">${escHtml(config.score.home)} : ${escHtml(config.score.away)}</div>
    <div class="score-label">${escHtml(config.prediction.scoreLabel)}</div>
  </div>
  <div class="team">
    <div class="team-flag">${escHtml(config.match.away.flag)}</div>
    <div class="team-name">${escHtml(config.match.away.name)}</div>
    <div class="team-tag">${escHtml(config.match.away.tag || "")}</div>
  </div>
</div>

<div class="card">
  <div class="card-title">⚔ 五维综合评判</div>${dimensionsHtml}
</div>

<div class="card">
  <div class="card-title">📊 比分概率分布（综合赔率市场 + 上述五维修正）</div>
  ${probabilitiesHtml}
  <div class="note">${escHtml(config.marketNote || "")}</div>
</div>

<div class="card">
  <div class="card-title">🎯 关键先生</div>
  <div class="kv">
    <div class="kv-item"><div class="kv-l">首球候选</div><div class="kv-v">${escHtml(config.keyMoments.firstScorer)}</div></div>
    <div class="kv-item"><div class="kv-l">胜负手</div><div class="kv-v">${escHtml(config.keyMoments.swing)}</div></div>
    <div class="kv-item"><div class="kv-l">奇兵</div><div class="kv-v">${escHtml(config.keyMoments.wildcard)}</div></div>
  </div>
  <div class="player-row">
    ${playersHtml}
  </div>
</div>

<div class="verdict">
  <div class="verdict-title">${escHtml(config.verdict.title)}</div>
${verdictHtml}
</div>

<div class="card">
  <div class="card-title">📚 资料来源</div>
  <div class="srcs">
    ${sourcesHtml}
  </div>
</div>

<div class="footer">⚽ 2026 FIFA World Cup ${escHtml(config.footerLabel)} · 娱乐向，不构成投注建议 · powered by <b>${escHtml(
    SITE_AUTHOR
  )}</b></div>

</body>
</html>
`;
}

async function updateDataFile(config, { force }) {
  const current = await fs.readFile(DATA_FILE, "utf8");

  if (!force) {
    if (current.includes(`report: ${jsString(config.reportFileName)}`)) {
      throw new Error(`data.js already contains report entry: ${config.reportFileName}`);
    }

    if (
      current.includes(`sortKey: ${jsString(config.match.sortKey)}`) &&
      current.includes(`name: ${jsString(config.match.home.name)}`) &&
      current.includes(`name: ${jsString(config.match.away.name)}`)
    ) {
      throw new Error("data.js already appears to contain the same match");
    }
  }

  const marker = "  matches: [\n";
  if (!current.includes(marker)) {
    throw new Error("Unable to locate matches array in data.js");
  }

  const next = current.replace(marker, `${marker}${toMatchEntry(config)}\n`);
  await fs.writeFile(DATA_FILE, next, "utf8");
}

async function main() {
  const { configPath, flags } = parseArgs(process.argv.slice(2));
  const absoluteConfigPath = path.resolve(ROOT, configPath);
  const rawConfig = JSON.parse(await fs.readFile(absoluteConfigPath, "utf8"));
  const config = normalizeConfig(rawConfig);
  const outputPath = path.join(REPORTS_DIR, config.reportFileName);
  const html = renderReport(config);

  if (flags.dryRun) {
    console.log(`Dry run OK: ${config.reportFileName}`);
    console.log(`Would write report to: ${outputPath}`);
    if (flags.writeData) {
      console.log("Would prepend this entry to data.js:\n");
      console.log(toMatchEntry(config));
    }
    return;
  }

  try {
    await fs.access(outputPath);
    if (!flags.force) throw new Error(`Report already exists: ${config.reportFileName}`);
  } catch (error) {
    if (error.code !== "ENOENT" && !String(error.message).startsWith("Report already exists")) {
      throw error;
    }
    if (String(error.message).startsWith("Report already exists")) throw error;
  }

  await fs.mkdir(REPORTS_DIR, { recursive: true });
  await fs.writeFile(outputPath, html, "utf8");

  if (flags.writeData) {
    await updateDataFile(config, flags);
  }

  console.log(`Generated report: ${path.relative(ROOT, outputPath)}`);
  if (flags.writeData) {
    console.log("Updated data.js with pending match entry.");
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
