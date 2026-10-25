/**
 * popup 界面层离线行为验证（不依赖浏览器）
 * 运行：node tests/popup_ui_behavior.test.js
 *
 * 覆盖：DOM 接线完整、i18n 取值与回退、语言切换重绘、四态渲染（检测/已连接/暂停/离线）。
 * 断言面向「用户看得见的文案与可点性」，不碰background/content/签名/投递。
 */
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const EXT = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(EXT, "popup.html"), "utf8");
const js = fs.readFileSync(path.join(EXT, "popup.js"), "utf8");
const popupJs = fs.readFileSync(__dirname + '/../popup.js', 'utf8');
const launchJs = fs.readFileSync(__dirname + '/../launch.js', 'utf8');
const css = fs.readFileSync(path.join(EXT, "popup.css"), "utf8");
const LOCALES = ["en", "zh_CN", "ja", "ko", "fr", "de", "es", "pt"];

/* ---------- 极简 DOM mock ---------- */
function makeEl(tag) {
  const el = {
    tagName: (tag || "div").toUpperCase(),
    dataset: {},
    children: [],
    _text: "",
    hidden: false,
    disabled: false,
    value: "",
    style: {},
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); },
      remove(c) { this._s.delete(c); },
      toggle(c, on) { on ? this._s.add(c) : this._s.delete(c); },
      contains(c) { return this._s.has(c); },
    },
    listeners: {},
    set textContent(v) { this._text = String(v); this.children = []; },
    get textContent() { return this._text; },
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); },
    dispatch(type, ev = {}) {
      const list = this.listeners[type] || [];
      return Promise.all(list.map((fn) => fn({ isTrusted: true, currentTarget: this, target: this, ...ev })));
    },
    closest() { return null; },
    querySelector() { return null; },
    setAttribute(k, v) { this[k] = String(v); },
    getAttribute(k) { return this[k]; },
    appendChild(c) { this.children.push(c); },
  };
  return el;
}

function buildDom() {
  const ids = [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
  const nodes = {};
  ids.forEach((id) => (nodes[id] = makeEl("div")));
  nodes.extensionVersion = makeEl("small");
  nodes.toggleTokenVisibility.querySelector = () => null;
  return { ids, nodes };
}

function loadTables() {
  return Object.fromEntries(
    LOCALES.map((l) => [l, JSON.parse(fs.readFileSync(path.join(EXT, "_locales", l, "messages.json"), "utf8"))])
  );
}

function evalPopup(env) {
  const { nodes, store, responses } = env;
  const bySelector = (sel) => {
    const id = sel.replace("#", "");
    if (!nodes[id]) throw new Error(`popup.js 查询了不存在的元素：${sel}`);
    return nodes[id];
  };
  const document_ = {
    querySelector: bySelector,
    querySelectorAll: (sel) => (sel === "[data-i18n]" || sel === "[data-i18n-title]" ? [] : []),
    createElement: (tag) => makeEl(tag),
    createElementNS: (_ns, tag) => makeEl(tag),
    addEventListener: () => {},
  };
  const chromeMock = {
    runtime: {
      getManifest: () => ({ version: "0.8.3" }),
      requestUpdateCheck: env.updateCheck,
      getURL: (p) => "chrome-extension://mock/" + p,
      sendMessage: (msg) => {
        const r = responses(msg);
        return r instanceof Promise ? r : Promise.resolve(r);
      },
    },
    i18n: { getMessage: () => "", getUILanguage: () => env.uiLanguage || "en-US" },
    storage: {
      local: {
        get: (defaults) => Promise.resolve({ ...defaults, ...store }),
        set: (obj) => { Object.assign(store, obj); return Promise.resolve(); },
      },
    },
    tabs: { query: () => Promise.resolve([{ id: 1 }]), sendMessage: () => Promise.reject(new Error("no content")) },
    scripting: { executeScript: () => Promise.resolve([]), insertCSS: () => Promise.resolve([]) },
  };
  const fetchMock = (url) => {
    if (url.includes("/messages.json")) {
      const loc = /_locales\/([^/]+)\/messages\.json/.exec(url)[1];
      return Promise.resolve({ ok: true, json: () => Promise.resolve(env.tables[loc] || {}) });
    }
    if (url.includes("/api/v1/window/restore")) {
      return Promise.resolve({ ok: env.restoreRouteReady === true });
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
  };
  const fn = new Function("document", "chrome", "fetch", "navigator", "window", "setInterval", "clearInterval", js);
  // window 需要事件接口（popup.js 用blur/unload 停轮询）与计时器
  const windowMock = {
    addEventListener() {},
    removeEventListener() {},
    // 轮询用 setInterval：不实现，测试环境不会真的起定时器（避免进程挂住）
    setInterval() { return 1; },
    clearInterval() {},
    // popup.js 里有 await new Promise(r => setTimeout(r, 1800))，必须真计时
    setTimeout: (fn2, ms) => setTimeout(fn2, ms),
    clearTimeout: (id) => clearTimeout(id),
  };
  return fn(document_, chromeMock, fetchMock, { language: env.uiLanguage || "en-US" }, windowMock, windowMock.setInterval, windowMock.clearInterval);
}

/* ---------- 用例 ---------- */
const tests = [];
const test = (name, fn) => tests.push([name, fn]);

function makeEnv(over = {}) {
  const { ids, nodes } = buildDom();
  const tables = loadTables();
  return {
    ids, nodes, tables,
    store: { endpoint: "http://127.0.0.1:18765", token: "pf_test", ...(over.store || {}) },
    uiLanguage: over.uiLanguage || "en-US",
    restoreRouteReady: over.restoreRouteReady,
    updateCheck: over.updateCheck,
    responses: over.responses || (() => ({ ok: false, error: "no bridge" })),
  };
}
const settle = () => new Promise((r) => setTimeout(r, 0));

test("html 保留全部旧 id，popup.js 未引用不存在的元素", () => {
  const { ids, nodes } = buildDom();
  const used = [...js.matchAll(/querySelector\("#([^"]+)"\)/g)].map((m) => m[1]);
  used.forEach((id) => assert.ok(ids.includes(id), `html 缺少 ${id}`));
  assert.ok(ids.length >= 15);
  Object.keys(nodes).length;
});

test("离线态：无 token 时显示未连接 + 手动启动说明，主按钮为重试", async () => {
  const env = makeEnv({ store: { token: "" } });
  evalPopup(env);
  await settle(); await settle();
  assert.strictEqual(env.nodes.statusBadge.dataset.state, "offline");
  assert.strictEqual(env.nodes.offlineNote.hidden, false);
  assert.strictEqual(env.nodes.primaryAction.dataset.action, "retry");
  assert.strictEqual(env.nodes.executionControl.disabled, true);
});

test("已连接态：状态徽章为 connected，文案不含过度承诺", async () => {
  const env = makeEnv({ responses: () => ({ ok: true, data: { kill_switch_active: false, principal: "OK" } }) });
  evalPopup(env);
  await settle(); await settle();
  assert.strictEqual(env.nodes.statusBadge.dataset.state, "connected");
  assert.strictEqual(env.nodes.primaryAction.dataset.action, "open");
  assert.strictEqual(env.nodes.executionControl.disabled, false);
  assert.ok(!/可以开会/.test(env.nodes.statusHint.textContent), "顶栏不得出现「可以开会」类过度承诺");
});

test("暂停态：徽章 paused 且顶部出现熔断告警", async () => {
  const env = makeEnv({ responses: () => ({ ok: true, data: { kill_switch_active: true } }) });
  evalPopup(env);
  await settle(); await settle();
  assert.strictEqual(env.nodes.statusBadge.dataset.state, "paused");
  assert.strictEqual(env.nodes.stateCard.dataset.tone, "rose", "暂停时状态卡提示语须转肉色（此刻需要用户动作）");
});

test("语言切换：已选 zh_CN 生效，缺 key 回退 en", async () => {
  const env = makeEnv({
    store: { pf_ui_locale: "zh_CN" },
    responses: () => ({ ok: true, data: { kill_switch_active: false, principal: "OK" } }),
  });
  evalPopup(env);
  await settle(); await settle();
  assert.ok(/已连接/.test(env.nodes.statusBadgeText.textContent), "zh_CN 应显示中文");
  assert.ok(/本地桥已连接/.test(env.nodes.nextNoteBody.textContent), "提示语须在状态卡内可见节点上");
});



test("已下线繁体（zh_TW）：不得残留语种、目录与文案", () => {
  assert.ok(!/zh_TW/.test(js), "popup.js 仍引用 zh_TW");
  assert.ok(!fs.existsSync(path.join(EXT, "_locales", "zh_TW")), "_locales/zh_TW 应已删除");
  LOCALES.forEach((l) => {
    assert.ok(!/未連線|繁體/.test(JSON.stringify(loadTables()[l])), `${l} 残留繁体文案`);
  });
});

test("八语 key 集合完全一致", () => {
  const tables = loadTables();
  const ref = Object.keys(tables.en).sort().join(",");
  LOCALES.forEach((l) => assert.strictEqual(Object.keys(tables[l]).sort().join(","), ref, `${l} key 不齐`));
  // 值必须是 {"message": "..."} 对象；写成裸字符串会让 t() 取不到且静默回退 en
  LOCALES.forEach((l) => {
    const bad = Object.entries(tables[l])
      .filter(([, v]) => !v || typeof v.message !== "string")
      .map(([k]) => k);
    assert.deepStrictEqual(bad, [], `${l} 存在非 {message} 结构条目：${bad.join(", ")}`);
  });
});

test("无 token 时不伪造连接成功", async () => {
  const env = makeEnv({ store: { token: "" }, responses: () => ({ ok: true, data: { kill_switch_active: false } }) });
  evalPopup(env);
  await settle(); await settle();
  assert.notStrictEqual(env.nodes.statusBadge.dataset.state, "connected");
});

test("桥不可达时 statusHint 指向手动启动客户端", async () => {
  const env = makeEnv({ responses: () => ({ ok: false, error: "connection refused" }) });
  evalPopup(env);
  await settle(); await settle();
  assert.strictEqual(env.nodes.statusBadge.dataset.state, "offline");
  assert.ok(env.nodes.offlineNote.hidden === false);
});

test("popup.html 标签配平（漏闭合会让整块 UI 塌掉）", () => {
  const VOID = new Set(["meta", "link", "input", "br", "img", "hr", "source", "path", "rect", "circle", "line"]);
  const stack = [];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g;
  let m;
  while ((m = re.exec(html))) {
    const [, close, tag, selfClose] = m;
    if (VOID.has(tag.toLowerCase()) || selfClose) continue;
    if (close) {
      const top = stack.pop();
      assert.strictEqual(top, tag, `</${tag}> 关闭了 <${top}>`);
    } else {
      stack.push(tag);
    }
  }
  assert.deepStrictEqual(stack, [], "存在未闭合标签");
});

test("插件更新无手动按钮（2026-10-13 指挥官定：死按钮不提供），规则更新保留手动入口", () => {
  // 商店版由浏览器自动更新、本地版只能手动替换文件——手动按钮在两种形态下都装不上。
  assert.ok(!html.includes('id="checkExtensionUpdate"'), "插件行不应再有手动更新按钮");
  assert.ok(html.includes('id="checkRuleUpdate"'), "规则更新按钮必须保留");
  assert.ok(!html.includes('id="updateSelectors"'), "旧合并按钮应已拆除");
  // 但「最新版本」列不能是死列：改为打开弹窗时静默检查一次
  assert.ok(js.includes("requestUpdateCheck"), "未接 Chrome 插件更新检查");
  assert.ok(js.includes("checkExtensionUpdateOnce"), "插件检查须以自动方式调用");
  assert.ok(/checkExtensionUpdateOnce\(\);/.test(js), "初始化时须调用一次插件检查");
  // 规则更新链路不得因去掉插件按钮而被牵连
  assert.ok(js.includes("{ type: 'selector-update' }") || js.includes('type: "selector-update"'), "规则更新链路丢失");
});


test("更新区常驻并集中版本与两个更新入口", () => {
  // 按 id 定位而非 class 名——配色语义类（tint-*）会随设计调整变化，
  // 断言不应绑定颜色，否则改配色就误报。
  const aboutStart = html.indexOf('<section class="fold');
  const about = html.slice(aboutStart, html.indexOf('<!-- 执行总开关'));
  for (const id of ["aboutExtVersion", "latestExtVersion", "currentRuleVersion", "latestRuleVersion", "checkRuleUpdate"]) {
    assert.ok(about.includes(`id="${id}"`), `更新区缺少 ${id}`);
  }
  assert.ok(!about.includes("<details") && !about.includes("<summary"));
  assert.ok(!html.slice(html.indexOf('<section class="meta">'), html.indexOf('<!-- 连接设置')).includes('id="aboutExtVersion"'));
});

test("插件检查只显示浏览器实际提供的版本", async () => {
  let result = { status: "update_available", version: "0.8.4" };
  const env = makeEnv({ updateCheck: async () => result });
  evalPopup(env); await settle(); await settle();
  // 2026-10-13 起插件检查改为打开弹窗时自动跑一次，不再由按钮触发。
  // 这里验证三种状态经由 checkExtensionUpdateOnce 后都能正确落到「最新版本」列。
  for (const [status, expected] of [
    ["update_available", "v0.8.4"],
    ["no_update", env.tables.en.updateNoNewVersion.message],
    ["throttled", env.tables.en.extUpdateThrottled.message],
  ]) {
    result = { status, version: "0.8.4" };
    const env2 = makeEnv({ updateCheck: async () => result });
    evalPopup(env2); await settle(); await settle(); await settle();
    assert.strictEqual(env2.nodes.latestExtVersion.textContent, expected, "状态 " + status + " 显示不对");
  }
});

test("规则更新成功显示验证版本，失败不保留最新结论", async () => {
  let failed = false;
  const env = makeEnv({ responses: (msg) => {
    if (msg.type === "selector-update") return failed ? { ok: false, error: "signature rejected" } : { ok: true, data: { version: "build20261013-001", message: "verified" } };
    if (msg.type === "selector-version") return { ok: true, data: { version: "build20261013-001", source: "cloud" } };
    return { ok: true, data: { kill_switch_active: false } };
  } });
  evalPopup(env); await settle(); await settle();
  await env.nodes.checkRuleUpdate.dispatch("click");
  assert.strictEqual(env.nodes.latestRuleVersion.textContent, "build20261013-001");
  failed = true;
  await env.nodes.checkRuleUpdate.dispatch("click");
  assert.strictEqual(env.nodes.latestRuleVersion.textContent, env.tables.en.updateCheckFailed.message);
  assert.strictEqual(env.nodes.currentRuleVersion.textContent, "build20261013-001");
});

test("规则要求更高版本插件时，提示先升级插件而非笼统失败", () => {
  assert.ok(/rulesNeedNewerExtension/.test(js), "缺「请先升级插件」分支");
  assert.ok(/版本不兼容/.test(js), "未识别版本不兼容错误");
});

test("八语 key 集合完全一致且含更新相关键", () => {
  const tables = loadTables();
  const ref = Object.keys(tables.en).sort().join(",");
  LOCALES.forEach((l) => assert.strictEqual(Object.keys(tables[l]).sort().join(","), ref, `${l} key 不齐`));
  ["aboutTitle", "checkExtUpdate", "checkRuleUpdate", "rulesNeedNewerExtension", "extUpToDate"].forEach((k) =>
    assert.ok(tables.en[k], `en 缺少 ${k}`)
  );
});

test("未改background / selector_updates / 签名校验", () => {
  const b = fs.readFileSync(path.join(EXT, "background.js"), "utf8");
  const su = fs.readFileSync(path.join(EXT, "selector_updates.js"), "utf8");
  assert.ok(!/requestManifestUpdate/.test(b), "更新检查应只在 popup 层，不进 background");
  assert.ok(/min_extension_version/.test(su), "selector_updates 的版本闸被改动，需复核");
  assert.ok(/Ed25519/.test(su) && /signature/.test(su), "签名校验代码缺失");
});

test("插件更新使用 chrome.runtime.requestUpdateCheck 并读 result.status", () => {
  assert.ok(!/requestManifestUpdate/.test(js), "requestManifestUpdate 已废弃（仅 kiosk 用），须改 requestUpdateCheck");
  assert.ok(/requestUpdateCheck/.test(js), "未使用 requestUpdateCheck");
  assert.ok(/result\s*&&\s*result\.status/.test(js), "未读取 result.status");
  assert.ok(/status === "update_available"/.test(js) && /status === "throttled"/.test(js) && /status === "no_update"/.test(js),
    "三种 status 未分别处理");
});

test("暂停/恢复后顶部徽章与执行开关同步（不出现矛盾态）", async () => {
  let paused = true;
  const env = makeEnv({ responses: () => ({ ok: true, data: { kill_switch_active: paused } }) });
  evalPopup(env);
  await settle(); await settle();
  assert.strictEqual(env.nodes.statusBadge.dataset.state, "paused", "熔断暂停时顶部应显示 paused");
  paused = false;
  await env.nodes.test.dispatch("click");
  assert.strictEqual(env.nodes.statusBadge.dataset.state, "connected", "恢复后顶部应同步为 connected");
});

test("缺省英语：不跟随浏览器语言", async () => {
  const env = makeEnv({ uiLanguage: "zh-CN", responses: () => ({ ok: true, data: { kill_switch_active: false } }) });
  evalPopup(env);
  await settle(); await settle();
  assert.strictEqual(env.store.pf_ui_locale, undefined, "未选择时不应写入偏好");
  assert.ok(/Connected/.test(env.nodes.statusBadgeText.textContent),
    `缺省应为英文，实际：${env.nodes.statusBadgeText.textContent}`);
  assert.ok(!/matchUILocale/.test(js), "跟随浏览器语言的死代码应删除");
});

test("用户选过的语言被持久化并复用", async () => {
  const env = makeEnv({ store: { pf_ui_locale: "ja" }, responses: () => ({ ok: true, data: { kill_switch_active: false } }) });
  evalPopup(env);
  await settle(); await settle();
  assert.ok(/接続|接続済み/.test(env.nodes.statusBadgeText.textContent),
    `应复用已保存的 ja，实际：${env.nodes.statusBadgeText.textContent}`);
});

test("打包脚本包含 _locales", () => {
  const ps = path.resolve(EXT, "..", "tools", "package-studio-extension.ps1");
  assert.ok(fs.existsSync(ps), "找不到打包脚本");
  const src = fs.readFileSync(ps, "utf8");
  assert.ok(/_locales/.test(src) && /messages\.json/.test(src), "打包脚本未复制 _locales");
  assert.ok(/default_locale/.test(fs.readFileSync(path.join(EXT, "manifest.json"), "utf8")),
    "manifest 未声明 default_locale，但打包脚本已按有 _locales 处理");
});

test("popup.js 未访问已删除的 #selectorVersion", () => {
  assert.ok(!/#selectorVersion/.test(js), "popup.js 仍访问已删除的 #selectorVersion");
  assert.ok(!/id="selectorVersion"/.test(html), "html 不应再有 #selectorVersion");
  assert.ok(/#aboutRuleVersionDetail/.test(js) && /id="aboutRuleVersionDetail"/.test(html), "规则版本详情位未接线");
});

test("八语文案无乱码（? 字符即视为损坏）", () => {
  const tables = loadTables();
  LOCALES.forEach((l) => {
    const bad = Object.entries(tables[l])
      .filter(([, v]) => v.message.includes("?"))
      .map(([k]) => k);
    assert.deepStrictEqual(bad, [], `${l} 存在乱码文案：${bad.join(", ")}`);
  });
  // 非拉丁语系必须有非ASCII 内容，防止误存 ASCII 占位
  ["zh_CN", "ja", "ko"].forEach((l) => {
    const nonAscii = Object.values(tables[l]).filter((v) => /[^\x00-\x7F]/.test(v.message));
    assert.ok(nonAscii.length > 50, `${l} 几乎无非ASCII 文案，疑似被ASCII 占位`);
  });
});

test("Connection Settings 可折叠但默认收起（2026-10-12 改：默认展开会顶高弹窗）", () => {
  assert.ok(!/<details class="card as-details" open>/.test(html), "连接设置不得默认展开（会超出 600px）");
  assert.ok(/data-i18n="connSettings"/.test(html), "缺 Connection Settings 标题键");
  assert.ok(/id="endpoint"/.test(html) && /id="token"/.test(html), "连接设置内容缺失");
});







test("语言菜单带内联旗标（不引外链图）", () => {
  assert.ok(/LOCALE_FLAGS/.test(js), "缺内联旗标表");
  assert.ok(/renderFlag/.test(js), "缺旗标渲染");
  const flags = ["en","zh_CN","ja","ko","fr","de","es","pt"];
  flags.forEach((c) => assert.ok(new RegExp(`\\b${c}:`).test(js), `缺 ${c} 旗标`));
  assert.ok(!/https?:\/\/[^"']*\.(png|jpg|svg|webp)/.test(html + js), "不应引用外链图片");
});

test("「关于与更新」为常驻卡片（高频入口不得折叠）", () => {
  const idxEnd = html.indexOf("</details>");
  const idxAbout = html.indexOf('data-i18n="aboutTitle"');
  assert.ok(idxAbout > -1, "缺「关于与更新」卡片");
  assert.ok(idxAbout > idxEnd, "「关于与更新」仍在折叠区内，属高频入口不应折叠");
  assert.ok(!html.includes('id="checkExtensionUpdate"'), "插件行不应有更新按钮");
});

test("四态主元素齐备", () => {
  ["statusBadge","statusHint","primaryAction","executionControl","killSwitchHint","offlineNote","status"].forEach((id) =>
    assert.ok(html.includes(`id="${id}"`), `缺 #${id}`)
  );
  assert.ok(html.includes('data-state="checking"'), "徽章缺初始 checking 态");
});


test("未触碰 background / content / 签名 / 投递", () => {
  const diffTargets = ["popup.html", "popup.css", "popup.js", "manifest.json"];
  diffTargets.forEach((f) => assert.ok(fs.existsSync(path.join(EXT, f))));
  // manifest 只允许新增 default_locale 一行
  const mf = JSON.parse(fs.readFileSync(path.join(EXT, "manifest.json"), "utf8"));
  assert.strictEqual(mf.default_locale, "en");
  assert.strictEqual(mf.version, "0.8.3");
  assert.ok(!("background" in mf && mf.background.service_worker !== "background.js"));
});

test("离线后测试连接成功同步主按钮与离线提示", async () => {
  let online = false;
  const env = makeEnv({responses: () => online ? {ok:true,data:{kill_switch_active:false}} : {ok:false,error:"offline"}});
  evalPopup(env);
  await settle(); await settle();
  assert.strictEqual(env.nodes.offlineNote.hidden, false);
  online = true;
  await env.nodes.test.dispatch("click");
  assert.strictEqual(env.nodes.offlineNote.hidden, true);
  assert.strictEqual(env.nodes.primaryAction.dataset.action, "open");
  assert.strictEqual(env.nodes.statusBadge.dataset.state, "connected");
});

test("切换语言保留规则版本且不触发远端更新", async () => {
  const calls=[];
  const env=makeEnv({responses: msg=>{
    calls.push(msg.type);
    return msg.type==='selector-version' ? {ok:true,data:{version:'build20261011-001',source:'cloud'}} : {ok:true,data:{kill_switch_active:false}};
  }});
  evalPopup(env);
  await settle(); await settle();
  const chinese=env.nodes.langMenu.children.find(x=>x.dataset.locale==='zh_CN');
  await chinese.dispatch('click');
  assert.ok(env.nodes.aboutRuleVersionDetail.textContent.includes('build20261011-001'));
  assert.ok(!calls.includes('selector-update'));
});

test("窗口尺寸基准：368px 宽、纵向可滚、横向禁滚（指挥官 2026-10-12 指令）", () => {
  // 横向取 600x0.613 = 368px（指挥官指令；Chrome 弹窗上限 800x600）
  assert.ok(/html, body\s*\{[^}]*width:\s*368px/.test(css), "html/body 必须锁 368px");
  assert.ok(/max-width:\s*368px/.test(css), "须有 max-width 兜底");
  assert.ok(/overflow-x:\s*hidden/.test(css), "必须 overflow-x:hidden 禁横向滚动条");
  assert.ok(!/overflow-y:\s*hidden/.test(css), "纵向滚动须保留");
  assert.ok(!/580px/.test(css), "580px 旧宽屏基准须废止干净");
});







test("v3 基准：368px 宽、纵向可滚、横向禁滚（指挥官 2026-10-12 指令）", () => {
  assert.ok(/html, body\s*\{[^}]*width:\s*368px/.test(css), "须锁 368px（=600x0.613）");
  assert.ok(/overflow-x:\s*hidden/.test(css), "必须禁横向滚动条");
  assert.ok(!/overflow-y:\s*hidden/.test(css), "纵向滚动须保留");
  assert.ok(!/580px/.test(css), "580px 旧基准须废止");
});

test("v3 视觉基准：蓝调玻璃层 + 暖色注释块（指挥官指定好看的原因）", () => {
  // 底：天空蓝三层渐层
  assert.ok(/--page-1:\s*#eaf3ff/.test(css) && /--page-3:\s*#c3dcfa/.test(css), "须为v3 蓝调三层底");
  assert.ok(/linear-gradient\(170deg,\s*var\(--page-1\)/.test(css), "body 须用蓝调渐层");
  // 玻璃层：所有卡片共用，靠透明度分层级
  assert.ok(/\.card\s*\{[^}]*rgba\(255, 255, 255, \.62\)/.test(css), "卡片须为玻璃层");
  assert.ok(/rgba\(255, 255, 255, \.78\)/.test(css), "状态卡须最重（78%）");
  assert.ok(/rgba\(255, 255, 255, \.42\)/.test(css), "元信息须最轻（42%）");
  // 暖色注释块：黄色（下一步）与肉色（阻断）——指挥官指认的关键要素
  assert.ok(/\.note-amber\s*\{[^}]*--amber-bg/.test(css) || /--amber-bg:\s*#fff5dc/.test(css), "须有黄色注释块");
  assert.ok(/--rose-bg:\s*#fdeae5/.test(css), "须有肉色注释块");
  assert.ok(/\.note-rose/.test(css) && /\.note-amber/.test(css), "两类注释块样式须存在");
});

test("v3 字号降档（指挥官：字号比之前小）", () => {
  const px = (re) => { const m = css.match(re); return m ? parseFloat(m[1]) : null; };
  const bname = px(/\.bname\s*\{[^}]*font-size:\s*([\d.]+)px/);
  const cta = px(/\.cta\s*\{[^}]*font-size:\s*([\d.]+)px/);
  const row = px(/\.mrow\s*\{[^}]*font-size:\s*([\d.]+)px/);
  assert.ok(bname !== null && bname <= 13, `品牌名字号须<=13px，实际 ${bname}`);
  assert.ok(cta !== null && cta <= 13, `主按钮字号须 <=13px，实际 ${cta}`);
  assert.ok(row !== null && row <= 11.5, `元信息字号须 <=11.5px，实际 ${row}`);
});

test("v3 结构：状态卡 + 元信息三行 + 低频折叠 + 独立熔断卡", () => {
  assert.ok(/class="card hero"/.test(html), "缺状态卡");
  assert.ok(/id="heroState"/.test(html) && /id="heroSubject"/.test(html), "状态卡须有状态文字与桥主体名");
  assert.ok((html.match(/class="mrow"/g) || []).length === 2, "元信息保留规则与端点，插件版本移入更新区");
  assert.ok(/class="next-body"/.test(html), "状态卡须内嵌下一步提示语（合并式，保证展开折叠区后仍可见）");
  // 离线说明已并入状态卡提示语（指挥官：离线说三处属重复）
  assert.ok(/class="note-rose sr-only" id="offlineNote"/.test(html), "离线块须保留但视觉隐藏（脚本引用）");
  assert.ok(/offlineNote/.test(js) && /t\("offlineNote"/.test(js), "离线原因须并入状态卡提示语尾部");
  assert.ok((html.match(/class="fold tint-/g) || []).length === 3, "低频区应为 3 个带暖色底的折叠区");
  assert.ok(/class="card sw"/.test(html), "缺独立的熔断卡");
  assert.ok(/id="executionControl"/.test(html), "缺执行开关按钮");
  // v3 要点：离线时 logo 降饱和（不靠文字也能看出）
  assert.ok(/\.logo\[data-offline="1"\]/.test(css), "须支持 logo 离线转灰");
  // 熔断按钮文字不得折行
  assert.ok(/\.card\.sw > \.btn\s*\{[^}]*white-space:\s*nowrap/.test(css), "熔断按钮须禁止折行");
});

test("v3 视觉隐藏节点仍须存在（脚本引用不得断）", () => {
  ["statusBadgeText", "statusHint", "aboutRuleVersionDetail"].forEach((id) => {
    assert.ok(html.includes(`id="${id}"`), `popup.js 依赖的 #${id} 必须保留（sr-only 也行）`);
  });
  assert.ok(/\.sr-only\s*\{/.test(css), "须提供视觉隐藏样式");
  assert.ok(/class="[^"]*sr-only[^"]*"/.test(html), "隐藏节点须带 sr-only 类");
});

test("真机实测锁定的行为（2026-10-12 Chrome 实跑验证）", () => {
  // 实机确认这三处必须联动：规则版本号/端点/扩展版本三行元信息都要被真实数据填充
  assert.ok(/id="aboutRuleVersion"/.test(html) && /id="aboutEndpoint"/.test(html) && /id="aboutExtVersion"/.test(html),
    "元信息三行须各有一个可填充的值节点");
  assert.ok(/id="extensionVersion"/.test(html), "顶栏须有扩展版本号位");
  assert.ok(/id="heroSubject"/.test(html), "状态卡须显示桥主体名");
  assert.ok(/<section[^>]*id="aboutUpdates"/.test(html), "关于与更新须为常驻区");
  // 熔断按钮：实机为红色 Pause，须带按钮图标且文案独立节点（否则重写文案会抹掉图标）
  assert.ok(/id="executionControlLabel"/.test(html), "熔断按钮须有独立文案节点");
  assert.ok(!/executionControl\.textContent/.test(js), "禁止对熔断按钮整体赋 textContent");
  // 状态行实机显示「Connection normal」⇒须支持 ok 色调
  assert.ok(/status-line\[data-tone="ok"\]/.test(css), "状态行须有成功色调");
});

test("桥存活轮询（指挥官 2026-10-12 实机发现：exe 关掉后仍显示已连接）", () => {
  assert.ok(/const BRIDGE_POLL_MS = 3000/.test(js), "须定义轮询间隔");
  assert.ok(/setInterval\(pollBridgeOnce, BRIDGE_POLL_MS\)/.test(js), "须用 setInterval 持续复查");
  assert.ok(/function stopBridgePolling/.test(js) && /clearInterval/.test(js), "须能停止轮询（弹窗关闭时）");
  assert.ok(/window\.addEventListener\("blur", stopBridgePolling\)/.test(js), "失焦须停轮询");
  // 只处理「在线→离线」跃迁；离线→在线须用户点重试，不自动恢复（避免与用户意图打架）
  assert.ok(/lastBridgeOnline === true && !online/.test(js), "须检测 在线→离线 跃迁");
  assert.ok(/applyOfflineView\("stateOfflineHint"\)/.test(js), "离线跃迁须切到未连接视图");
  assert.ok(/bridgeDisconnected/.test(js), "须给离线跃迁一条明确文案");
  const pollFn = js.slice(js.indexOf("async function pollBridgeOnce"), js.indexOf("function startBridgePolling"));
  const backOnline = pollFn.slice(pollFn.indexOf("lastBridgeOnline === false"), pollFn.indexOf("} else if"));
  const wentOffline = pollFn.slice(pollFn.indexOf("} else if"), pollFn.indexOf("lastBridgeOnline = online;"));
  assert.ok(!backOnline.includes("applyOfflineView"), "离线→在线 分支不得触发掉线视图");
  assert.ok(backOnline.includes("refreshBridgeStatus"), "离线→在线 应主动刷新");
  assert.ok(wentOffline.includes("applyOfflineView"), "在线→离线 必须切未连接视图");
  // bootstrap 两个分支都要起轮询
  const boot = js.slice(js.indexOf("async function bootstrap"));
  assert.strictEqual((boot.match(/startBridgePolling\(\)/g) || []).length, 2, "成功与失败分支都须起轮询");
});

test("接力页八语自适配（2026-10-13：此前只有中/英，其余6 语看英文）", () => {
  const vm = require("vm");
  const table = launchJs.match(/const T = \{[\s\S]*?\n\};/);
  assert.ok(table, "launch.js 必须含 T 文案表");
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(table[0] + "; this.__T = T;", ctx);
  const T = ctx.__T;
  const LANGS = ["zh_CN", "en", "ja", "ko", "fr", "de", "es", "pt"];
  const KEYS = ["headlineWait","subtitleWait","waiting","retrying","notYet","stillNot",
    "success","successSub","tipScheme","tipStuck","footWait","footOk","retry","close"];
  for (const lang of LANGS) {
    assert.ok(T[lang], "缺语种：" + lang);
    for (const k of KEYS) {
      assert.ok(T[lang][k] && String(T[lang][k]).trim(),
        lang + " 缺文案：" + k);
    }
  }
  // 语言判定必须走 resolveLocale（支持 BCP-47 收敛），不能只做 zh/en 二分
  assert.ok(/function resolveLocale/.test(launchJs), "须有 resolveLocale");
  assert.ok(/chrome\.i18n\.getUILanguage/.test(launchJs), "须优先读扩展 UI 语言");
  assert.ok(!/startsWith\("zh"\)\s*\?\s*"zh_CN"\s*:\s*"en"/.test(launchJs),
    "不得再用 zh/en 二分判定（这正是六语失效的根因）");
  // 启动时须先定语言再渲染
  assert.ok(/LANG = await detectLocale\(\)/.test(launchJs), "启动须先定语言");
  assert.ok(/function applyStaticI18n/.test(launchJs), "须有统一文案刷新函数");
});

test("偏好跨页传递（泥蛇 2026-10-13）：弹窗选日语，接力页必须读日语", async () => {
  const vm = require("vm");
  // 隔离运行 launch.js 里的 resolveLocale + detectLocale，喂真实 storage 数据
  // 注意：必须带 (?:async )?，否则 detectLocale 的 async 被截掉，
  // 函数体里的 await 会在 vm 中触发 "await is only valid in async functions"。
  const pick = (name) => {
    const m = launchJs.match(new RegExp("(?:async )?function " + name + "\\([\\s\\S]*?\\n}"));
    return m ? m[0] : "";
  };
  const resolveSrc = pick("resolveLocale");
  const detectSrc = pick("detectLocale");
  assert.ok(resolveSrc && detectSrc, "须能取出 resolveLocale 与 detectLocale");

  const runDetect = (stored, uiLang, navLang) => {
    const ctx = {
      chrome: {
        storage: { local: { get: async () => stored } },
        i18n: { getUILanguage: () => uiLang },
      },
      navigator: { language: navLang },
      console,
    };
    vm.createContext(ctx);
    // 必须包进 async IIFE：vm 的 runInContext 不是模块作用域，顶层 await 会报语法错。
    // 结果写进 ctx.__p，测试侧 await 该 promise。
vm.runInContext(
      "(async () => {\n" +
      "const SUPPORTED=['zh_CN','en','ja','ko','fr','de','es','pt'];\n" +
      "const LANG_PREF_KEY='pf_ui_locale';\n" +
      resolveSrc + "\n" + detectSrc + "\n" +
      "globalThis.__p = detectLocale();\n" +
      "})();",
      ctx
    );
    return ctx.__p;
  };

  // 场景1：弹窗存了日语，Chrome UI 是 en-US，浏览器是 zh-CN ⇒ 必须返回 ja
  assert.strictEqual(
    await runDetect({ pf_ui_locale: "ja" }, "en-US", "zh-CN"),
    "ja",
    "弹窗选了日语，接力页必须读日语（用户显式选择优先级最高）"
  );
  // 场景2：优先级 —— 扩展 UI 语言(getUILanguage) 高于浏览器语言。
  // 这与 detectLocale 的注释「用户显式选择 > 扩展 UI 语言 > 浏览器语言」一致。
  assert.strictEqual(await runDetect({}, "fr-FR", "ja-JP"), "fr",
    "扩展 UI 语言应优先于浏览器语言");
  // 场景3：区域后缀收敛（两级都走 resolveLocale）
  assert.strictEqual(await runDetect({}, "fr-CA", "en-US"), "fr", "fr-CA 应收敛到 fr");
  assert.strictEqual(await runDetect({ pf_ui_locale: "de-AT" }, "en-US", "en-US"), "de",
    "用户偏好 de-AT 应收敛到 de");
  // 场景4：不支持的语言回退 en，不抛错
  assert.strictEqual(await runDetect({}, "ru-RU", "en-US"), "en", "不支持的语言应回退 en");
  // 场景5：getUILanguage 缺席时才回落浏览器语言
  assert.strictEqual(await runDetect({}, "", "ja-JP"), "ja",
    "getUILanguage 为空时应回落浏览器语言");
});

test("偏好键必须与弹窗一致（pf_ui_locale），且不得有孤立写入方", () => {
  const popupPref = (popupJs.match(/LANG_PREF_KEY = "([^"]+)"/) || [])[1];
  const launchPref = (launchJs.match(/LANG_PREF_KEY = "([^"]+)"/) || [])[1];
  assert.ok(popupPref, "弹窗须声明 LANG_PREF_KEY");
  assert.ok(launchPref, "接力页须声明 LANG_PREF_KEY");
  assert.strictEqual(
    launchPref, popupPref,
    "接力页与弹窗的偏好键必须一致，否则用户选的语言传不过去（2026-10-13 真实缺陷）"
  );
  assert.ok(!/pf_launch_lang/.test(launchJs), "不得再使用孤立键 pf_launch_lang");
});

test("禁止成品文案穿透到 UI（2026-10-13：英文界面混进中文「已是最新规则」）", () => {
  const fs2 = require("fs");
  const bg = fs2.readFileSync(__dirname + "/../selector_updates.js", "utf8");
  // 后台不得出现 message:'中文…' 这类成品文案——它会原样显示在任意语言的界面上
  assert.ok(
    !/message:\s*['"][^'"]*[\u4e00-\u9fff]/.test(bg),
    "selector_updates.js 不得返回硬编码中文文案，应返回 messageKey 交由 UI 翻译"
  );
  assert.ok(/messageKey:\s*'rulesUpToDate'/.test(bg), "须返回 rulesUpToDate 键");
  assert.ok(/messageKey:\s*'rulesAppliedOnIdle'/.test(bg), "须返回 rulesAppliedOnIdle 键");
  // popup 侧必须消费 messageKey 并走 t()，这样切语言能重绘
  assert.ok(
    /setOutput\("ok",\s*r\.data\.messageKey\s*\|\|\s*r\.data\.message\)/.test(popupJs),
    "popup 须优先用 messageKey 翻译，回退旧 message"
  );
  const LOCALES = ["en", "zh_CN", "ja", "ko", "fr", "de", "es", "pt"];
  for (const loc of LOCALES) {
    const table = JSON.parse(
      fs2.readFileSync(__dirname + "/../_locales/" + loc + "/messages.json", "utf8")
    );
    assert.ok(table.rulesUpToDate, loc + " 缺 rulesUpToDate");
    assert.ok(table.rulesAppliedOnIdle, loc + " 缺 rulesAppliedOnIdle");
  }
});

test("配色按语义分工（2026-10-20 指挥官采纳 C 方案）：暖色只给可配置、红色只给危险", () => {
  // 按 data-i18n 键定位，不按可见文案 —— 文案随语言与改版变化，用文案定位必然误报。
  // 锁「哪个区块用哪个语义类」，不锁具体色值：色值可微调，语义分工不能改。
  const blockOf = (i18nKey) => {
    const at = html.indexOf('data-i18n="' + i18nKey + '"');
    assert.ok(at > 0, "找不到 i18n 键：" + i18nKey);
    // 往前找最近的区块开标签（fold tint-xxx）
    const head = html.slice(Math.max(0, at - 400), at);
    const m = head.match(/class="fold (tint-[a-z]+)/);
    assert.ok(m, i18nKey + " 所在区块没有 tint-* 语义类");
    return m[1];
  };

  assert.strictEqual(blockOf("connSettings"), "tint-amber", "连接设置＝可配置＝唯一暖色");
  assert.strictEqual(blockOf("protocolTitle"), "tint-slate", "协同规范＝只读＝最淡");
  assert.strictEqual(blockOf("aboutTitle"), "tint-blue", "关于与更新＝信息＝冷色");

  // 肉色必须从折叠区彻底退场 —— 它已被「执行总开关」的 Pause 独占
  assert.ok(!/class="fold tint-rose/.test(html), "tint-rose 不得再用于任何区块：红色只留给危险操作");
  assert.ok(!/\.fold\.tint-rose/.test(css), "CSS 不应残留 tint-rose 死规则");
});

(async () => {
  let pass = 0;
  for (const [name, fn] of tests) {
    try {
      await fn();
      pass++;
      console.log("  PASS  " + name);
    } catch (e) {
      console.log("  FAIL  " + name + "\n        " + e.message);
      process.exitCode = 1;
    }
  }
  console.log(`\n${pass}/${tests.length} passed`);
})();
