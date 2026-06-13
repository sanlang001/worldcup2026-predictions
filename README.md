# ⚽ 光年2026世界杯预测中心

> 每场赛前用「五维框架 + 盘口」做综合预测，赛后复盘命中情况，持续累积可复用的判断经验。
>
> 🌐 在线站点：**[sanlang001.github.io/worldcup2026-predictions](https://sanlang001.github.io/worldcup2026-predictions/)** · powered by **1000光年**

---

## 这是什么

2026 美加墨世界杯（48 队 / 104 场）期间，每天对当日比赛做赛前预测，输出独立的预测报告页，并在赛后做复盘。整站是**纯静态**页面（HTML/CSS/JS，无后端、无构建），可部署到 GitHub Pages。

- **不是投注工具**，是一个把"足球判断"结构化、可回溯、可验证的娱乐项目。
- 所有比分预测都给**主预测 + 次选**双锚，赛后按口径自动算命中率。

## 功能

- **📅 赛程时间轴**：小组赛全 72 场（北京时间），按日期分组、今日自动定位，已预测场次可点开完整报告。
- **🏆 战绩看板**：`比分命中率`（比分为王，仅精确/次选算命中）+ `方向命中率`（胜平负）双指标；下方「战绩流水」按最近在前列出已开赛场次的 预测/次选/实际/命中。
- **🌍 小组积分榜**：从已完赛结果实时计算 赛/胜/平/负/净胜/积分，每组前 2 标绿（出线区），便于第二、三轮参考积分形势。
- **📊 单场预测报告**：五维评判 + 比分概率分布 + 关键先生 + 最终评判 + 盘口采集时间戳 + 资料来源。
- **⚖ 赛后复盘**：对值得复盘的场次做差距拆解（模型误差 vs 变异），沉淀进复盘台账。
- **🌙/☀️ 暗/亮主题**切换（localStorage 记忆）。

## 预测方法论

**五维框架**：① 阵容硬实力 ② 状态与近况 ③ 历史交锋与魔咒 ④ 赛场因素 ⑤ 软性指标 —— 叠加**盘口/市场**作为外部锚，给出主预测比分 + 次选比分。

**盘口动态**（进行中的实验）：报告记录盘口采集时间戳与距开赛时长；盘口往主预测方向移动＝确认，**反向倾斜＝判断可能有偏＝纠偏警示**。相关观察记录在 [`复盘台账.md`](复盘台账.md)，样本足够前**不反向影响预测、不改框架**。

## 目录结构

```
.
├── index.html          # 预测中心主页（时间轴 / 战绩看板 / 积分榜）
├── data.js             # 数据源：matches(预测+实际) / fixtures(72场赛程) / groups(12组)
├── theme.css, theme.js # 暗/亮主题（全站共享，含报告页返回主页按钮）
├── reports/            # 每场的预测报告 + 复盘报告（独立 HTML）
├── 复盘台账.md          # 复盘 + 跨场信号观察（预测前必读，纯记录不改框架）
├── deploy.sh           # 旧的 Cloudflare Pages 发布脚本（当前可忽略）
├── .github/workflows/  # GitHub Pages 自动发布工作流
└── README.md
```

## 本地查看

直接双击 `index.html` 即可（纯静态，无需服务器）。报告页中文文件名通过 `encodeURI` 处理，`file://` 下链接也可点。

## 自动生成报告

原始站点本身**没有接自动预测 API**，而是：

1. 手工整理一场比赛的五维判断与盘口信息
2. 生成一份独立 `reports/*.html` 报告
3. 把这场比赛追加到 `data.js` 的 `matches` 数组

现在仓库里已经补了一套本地生成工具，可以把这个流程自动化成“配置驱动”：

```bash
npm run generate:report -- scripts/examples/match-config.example.json --dry-run
```

如果你的 PowerShell 拦截了 `npm.ps1`，可以直接这样运行：

```bash
node scripts/generate-report.mjs scripts/examples/match-config.example.json --dry-run
```

真正写入报告文件：

```bash
npm run generate:report -- scripts/examples/match-config.example.json
```

生成报告并同步写入首页数据：

```bash
npm run generate:report -- scripts/examples/match-config.example.json --write-data
```

相关文件：

```text
package.json
scripts/generate-report.mjs
scripts/examples/match-config.example.json
```

这套工具目前能做到：

- 根据一份 JSON 配置自动生成和原站风格一致的报告页
- 可选地自动把该比赛写入 `data.js -> matches`
- 保持首页时间轴、战绩、积分榜继续按原逻辑自动渲染

这套工具**还不能自动上网抓数据、自动做预测判断**。如果你要真正做到“未预测比赛自动生成预测直到全部完成”，下一步需要再接：

1. 赛程/赔率/伤病数据源
2. 一套预测规则或模型
3. 自动把抓到的信息转成上面这份 JSON 配置

## 同步原站更新

如果你希望你的站点自动跟随原站 `joearkon/worldcup2026-predictions` 的每日更新，现在仓库里已经补了同步脚本和定时任务：

```text
scripts/sync-upstream.mjs
.github/workflows/sync-upstream.yml
```

本地手动试跑：

```bash
node scripts/sync-upstream.mjs --dry-run
```

本地实际同步：

```bash
node scripts/sync-upstream.mjs
```

这套同步会做的事：

1. 拉取上游仓库最新 `data.js`
2. 拉取上游仓库 `reports/` 全部 HTML
3. 自动替换成你的站名和作者
4. 自动去掉原备案号
5. GitHub Actions 每 3 小时自动同步一次，并自动提交回你的仓库

注意：

- 这是“同步原站内容”，不是你自己的独立预测模型
- 目前同步目标固定为 `joearkon/worldcup2026-predictions`
- 如果你自己改了同名报告页，下次同步会被上游覆盖

## 部署

推荐用 GitHub Pages 自动发布：

1. 把这个项目推到你自己的 GitHub 仓库。
2. 仓库默认分支使用 `main`。
3. 进入 GitHub 仓库 `Settings -> Pages`。
4. 在 `Build and deployment` 里选择 `GitHub Actions`。
5. 之后每次你推送到 `main`，站点都会自动发布。

工作流文件已准备好：

```text
.github/workflows/deploy-github-pages.yml
```

发布后的免费公开地址通常是：

```text
https://<你的 GitHub 用户名>.github.io/<仓库名>/
```

如果你后面把仓库名改成 `<你的 GitHub 用户名>.github.io`，还可以直接用：

```text
https://<你的 GitHub 用户名>.github.io/
```

## 每日更新流程

1. 在 `data.js` 的 `matches` 数组**开头**追加当日预测（含 `mainPred`/`altPred`）。
2. 把对应预测报告 HTML 放进 `reports/`。
3. 赛后回填 `actual` 比分与 `status`（exact/alt/direction/miss）——时间轴、战绩、积分榜全部自动重算。
4. 值得复盘的场次出一份复盘报告，并更新 `复盘台账.md`。

## 当前战绩（小组赛进行中）

| 指标 | 数值 |
|------|------|
| 比分命中率 | **75%**（4 场中 3 场比分命中） |
| 方向命中率 | **100%**（胜平负全对） |

> 墨西哥 2-0 南非 ✅精确 ｜ 韩国 2-1 捷克 🟡次选 ｜ 加拿大 1-1 波黑 🟡次选 ｜ 美国 4-1 巴拉圭 🔵方向

## 免责声明

本项目为**娱乐性质的赛事预测**，所有内容**不构成任何投注建议**。足球是圆的，理性观赛。

---

*powered by 1000光年 · ⚽ 光年2026世界杯预测中心*
