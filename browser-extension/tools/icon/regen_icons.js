// 图标重生成：先裁到实际内容边界，再加 4% 安全边距，最后缩放到目标尺寸。
// 动机：源图四周有 13.7% 透明留白（实测），整图直接缩放会把空白一起缩小，
// 导致图标在浏览器工具栏里"没占满"，看起来比旁边的图标小一圈。
// 规范：Chrome 扩展图标应留约 4% 边距（128px 时 ≈ 5px），不能顶满。
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ROOT = path.resolve(__dirname, "../../..");
const SRC = path.join(ROOT, "assets/e439a1b7-1247-4a74-aafa-0dfc72b98c73.png");
const TMP = path.join(ROOT, "build/icon-preview");
const OUT_EXT = path.join(ROOT, "browser-extension/icons");

const MARGIN = 0.04;      // 四周安全边距（占目标尺寸比例）
const BLUR = 0;           // 不做柔化，Chrome 自己会缩放

fs.mkdirSync(OUT_EXT, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });

const sizes = [16, 32, 48, 128];
const manifest = JSON.parse(
  fs.readFileSync(path.join(ROOT, "browser-extension/manifest.json"), "utf8")
);

// 用 SVG 做裁切+缩放：靠 viewBox 的负偏移把内容区映射到满格，再留 margin。
// 这样不需要任何图像库，Chrome 渲染即可。
for (const s of sizes) {
  const inner = Math.round(s * (1 - MARGIN * 2)); // 内容区边长
  const off = (s - inner) / 2;                    // 四周留白
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">` +
    `<clipPath id="c"><rect x="${off}" y="${off}" width="${inner}" height="${inner}"/></clipPath>` +
    `<g clip-path="url(#c)">` +
    // 源图内容区（左留白13.7%≈174px，宽906）→ 映射到 0 0 906 948，再放大到 inner
    `<image href="file:///${SRC}" x="${off - inner * (174 / 906)}" y="${off - inner * (177 / 948)}" ` +
    `width="${inner * (1254 / 906)}" height="${inner * (1254 / 948)}" ` +
    `preserveAspectRatio="none" filter="url(#s)"/>` +
    `</g>` +
    `<filter id="s" x="0" y="0" width="100%" height="100%">` +
    `<feGaussianBlur stdDeviation="${BLUR}"/></filter>` +
    `</svg>`;
  const html =
    '<!doctype html><meta charset="utf-8">' +
    `<style>html,body{margin:0;padding:0;background:transparent}
    svg{display:block}</style>${svg}`;
  const tmpHtml = `${TMP}/crop_${s}.html`;
  const tmpPng = `${TMP}/crop_${s}.png`;
  fs.writeFileSync(tmpHtml, html, "utf8");
  execFileSync(
    CHROME,
    [
      "--headless",
      "--disable-gpu",
      "--default-background-color=00000000",
      `--window-size=${s},${s}`,
      `--screenshot=${tmpPng}`,
      "file:///" + tmpHtml,
    ],
    { stdio: "ignore" }
  );
  fs.copyFileSync(tmpPng, path.join(OUT_EXT, `pocketfleet-${s}.png`));
  console.log(`${s}px -> icons/pocketfleet-${s}.png  ${fs.statSync(tmpPng).size}B`);
}
console.log("完成：已裁切到内容边界 + 4% 边距");
