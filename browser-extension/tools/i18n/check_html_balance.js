// 校验 popup.html 标签配平 + 关键节点存在（2026-10-13 多次编辑 HTML 后必备）
const fs = require("fs");
const html = fs.readFileSync(
  __dirname + "/../../popup.html",
  "utf8"
);

const VOID = new Set(["meta", "link", "br", "hr", "img", "input", "source", "area", "base", "col", "embed", "param", "track", "wbr"]);

const stack = [];
let ok = true;
const re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*?)(\/?)>/g;
let m;
while ((m = re.exec(html))) {
  const [, closing, tag, attrs, selfClose] = m;
  const t = tag.toLowerCase();
  if (VOID.has(t) || selfClose) continue;
  if (!closing) {
    stack.push({ t, i: m.index });
  } else {
    const top = stack.pop();
    if (!top || top.t !== t) {
      console.log("不配对: </" + t + "> 位置 " + m.index + "，栈顶是 " + (top ? top.t : "空"));
      ok = false;
      break;
    }
  }
}
if (stack.length) {
  console.log("未闭合:", stack.map((x) => x.t + "@" + x.i).join(", "));
  ok = false;
}
console.log(ok ? "标签配平 OK" : "标签不配平");

// 关键节点
const ids = ["aboutUpdates", "update-rows", "checkExtensionUpdate", "checkRuleUpdate",
  "aboutExtVersion", "latestExtVersion", "currentRuleVersion", "latestRuleVersion",
  "execCard", "stateCard"];
const missing = ids.filter((id) => !html.includes('id="' + id + '"') && !html.includes('class="update-rows"'));
console.log(missing.length ? "缺节点: " + missing.join(", ") : "关键节点齐全");

const rows = (html.match(/class="update-row"/g) || []).length;
console.log("update-row 行数:", rows, rows === 2 ? "OK" : "应为 2");
process.exit(ok && !missing.length && rows === 2 ? 0 : 1);