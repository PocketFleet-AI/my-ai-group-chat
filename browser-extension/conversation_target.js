/* Read-only history discovery. No account API, persisted route or submit action. */
function discoverLatestConversation(brand, expectedURL) {
  if (expectedURL) {
    try {
      const current = new URL(location.href);
      const expected = new URL(expectedURL);
      if (current.origin !== expected.origin) return { blocked: 'route_changed' };
      if (expected.pathname === '/' || expected.pathname === '') {
        if (current.pathname !== '/' && current.pathname !== '') {
          return { blocked: 'route_changed' };
        }
      } else if (current.pathname !== expected.pathname) {
        return { blocked: 'route_changed' };
      }
    } catch {
      if (location.href !== expectedURL) return { blocked: 'route_changed' };
    }
  }

  const definitions = {
    chatgpt: {
      path: /^\/c\/[0-9a-zA-Z_-]+\/?$/,
      containerSelector: 'nav, aside, [data-testid="history"], #history, [aria-label*="history" i], [aria-label*="历史" i]',
      selectors: [
        'nav a[href^="/c/"]',
        'aside a[href^="/c/"]',
        '[data-testid="history"] a[href^="/c/"]',
        '#history a[href^="/c/"]',
        'nav [aria-label*="history" i] a[href^="/c/"]',
        '[aria-label*="历史" i] a[href^="/c/"]'
      ]
    },
    deepseek: {
      path: /^\/a\/chat\/s\/[0-9a-zA-Z_-]+\/?$/,
      containerSelector: 'div.ds-scroll-area, [class*="scroll-area"], nav, aside, [class*="history"], [data-testid*="history"]',
      selectors: [
        'a[href^="/a/chat/s/"]',
        'nav a[href^="/a/chat/s/"]',
        'aside a[href^="/a/chat/s/"]',
        '[class*="history"] a[href^="/a/chat/s/"]'
      ]
    },
    claude: {
      path: /^\/chat\/[0-9a-zA-Z_-]+\/?$/,
      containerSelector: '[class*="nav-scroll"], div.dframe-nav-scroll, [class*="sidebar"], nav, aside, [data-testid*="history"]',
      selectors: [
        'a[href^="/chat/"]',
        'nav a[href^="/chat/"]',
        'aside a[href^="/chat/"]'
      ]
    },
    gemini: {
      path: /^\/app\/[0-9a-f]{16}\/?$/,
      containerSelector: 'conversation-history-list, side-nav, [class*="history"], nav, aside',
      selectors: [
        'a[href*="/app/"]',
        'conversation-history-list a',
        'side-nav a'
      ]
    },
    qwen: {
      path: /^\/c\/[0-9a-zA-Z_-]+\/?$/,
      containerSelector: 'div.sidebar-new-list-content, [class*="sidebar-new-list"], aside nav, aside, [class*="sidebar"]',
      selectors: [
        'a[aria-label="chat-item"]',
        'aside a[href*="/c/"]',
        'a[href^="/c/"]'
      ]
    },
    doubao: {
      path: /^\/chat\/[a-zA-Z0-9_-]+\/?$/,
      containerSelector: '[class*="sidebar"], [class*="history-list"], nav, aside',
      selectors: [
        'a[href*="/chat/"]',
        'nav a[href*="/chat/"]'
      ]
    },
    grok: {
      path: /^\/c\/[0-9a-zA-Z_-]+\/?$/,
      containerSelector: 'nav, aside, [class*="sidebar"], [data-testid*="history"]',
      selectors: [
        'a[href^="/c/"]',
        'nav a[href^="/c/"]',
        'aside a[href^="/c/"]'
      ]
    }
  };
  const definition = definitions[brand];
  if (!definition) return { blocked: 'latest_history_unsupported' };

  // 2026-10-17 指挥官指导：检测侧边栏展开状态，若处于折叠状态自动尝试展开
  try {
    if (typeof document !== 'undefined') {
      const toggle = document.querySelector('button#sidebar-toggle-button, button[aria-label*="展开边栏" i], button[aria-label*="展开侧栏" i], button[aria-label*="展开主菜单" i], button[aria-label*="展开" i], button[aria-label*="Main menu" i], button[aria-label*="Open sidebar" i], button[data-testid*="sidebar" i], button[mattooltip*="展开" i]');
      if (toggle && (toggle.getAttribute('aria-expanded') === 'false' || toggle.getAttribute('data-state') === 'closed')) {
        toggle.click();
      }
    }
  } catch {}

  const visible = node => {
    if (!node || !node.getBoundingClientRect) return false;
    const rect = node.getBoundingClientRect();
    const style = typeof getComputedStyle === 'function' ? getComputedStyle(node) : {};
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  };

  const isExcluded = node => {
    if (!node) return true;
    if (node.closest) {
      if (node.closest('[data-pinned="true"], [aria-label*="pinned" i], [data-testid*="pinned" i], [aria-label*="置顶" i], [data-testid*="pin" i], [aria-label*="固定" i]')) return true;
      if (node.closest('[data-testid*="project" i], [aria-label*="project" i], [aria-label*="gpts" i], [data-testid*="gpts" i], [data-testid*="workspace" i]')) return true;
      const section = node.closest('section, div[role="region"], li, div');
      if (section) {
        const sectionHeading = section.querySelector?.('h2, h3, [role="heading"]');
        const headingText = (sectionHeading?.textContent || '').trim();
        if (/^(pinned|置顶|projects|gpts|explore|工作区|项目|固定)$/i.test(headingText)) return true;
      }
    }
    // 检查节点所在条目容器是否含有钉子/固定标记 (例如 Gemini 侧栏右侧的图钉图标)
    const item = (node.closest && node.closest('div, li, conversation-list-item, [role="listitem"]')) || node.parentElement;
    if (item) {
      if (item.querySelector?.('[data-pinned="true"], [aria-label*="pinned" i], [aria-label*="固定" i], [aria-label*="取消固定" i], [mattooltip*="固定" i], [mattooltip*="pin" i], mat-icon[fonticon*="pin"], mat-icon[fonticon*="keep"], [data-mat-icon-name*="pin"], [data-mat-icon-name*="keep"]')) {
        return true;
      }
      const icons = item.querySelectorAll?.('mat-icon, i, [class*="icon"], svg');
      if (icons) {
        for (const icon of icons) {
          const iconText = (icon.textContent || '').trim().toLowerCase();
          if (iconText === 'keep' || iconText === 'pin' || iconText === 'push_pin' || iconText.includes('📌')) {
            return true;
          }
        }
      }
    }
    const text = (node.textContent || '').trim();
    if (/^(new chat|新建对话|新对话|新聊天|开启新对话)$/i.test(text)) return true;
    return false;
  };

  const select = nodes => {
    for (const node of nodes) {
      if (!node || isExcluded(node)) continue;
      // 必须严格属于可信历史侧边栏容器，绝不选主内容区、页脚等全页面游离链接
      if (node.closest && !node.closest(definition.containerSelector)) continue;
      // 必须严格在当前 DOM 中可见，绝不回退至不可见候选
      if (!visible(node)) continue;
      let url;
      try {
        const rawHref = node.getAttribute ? node.getAttribute('href') : node.href;
        if (!rawHref) continue;
        url = new URL(rawHref, location.href);
      } catch {
        continue;
      }
      if (url.origin === location.origin && definition.path.test(url.pathname)) {
        if (url.pathname === '/c/new' || url.pathname === '/c/' || url.pathname === '/a/chat/s/' || url.pathname === '/chat/' || url.pathname === '/chat' || url.pathname === '/app/' || url.pathname === '/app') continue;
        if (url.pathname.startsWith('/g/') || url.pathname.includes('/project/') || url.pathname.includes('/workspace/')) continue;
        if (url.pathname.includes('/library') || url.pathname.includes('/scheduled') || url.pathname.includes('/notebooks') || url.pathname.includes('/customize')) continue;
        return url.href;
      }
    }
    return null;
  };

  // 1. 优先按时间倒序段落标头（今天 / 昨天 / 最近 等）逐段寻找最近普通会话
  const headingRegex = /^(today|yesterday|previous 7 days|previous 30 days|recent|今天|昨天|前 7 天|前 30 天|最近|近期|récents|zuletzt|recientes|最近のチャット|최근)$/i;
  for (const heading of document.querySelectorAll('nav h2, nav h3, aside h2, aside h3, nav [role="heading"], aside [role="heading"]')) {
    if (!headingRegex.test((heading.textContent || '').trim())) continue;
    let region = heading.parentElement;
    for (let depth = 0; region && depth < 3; depth++, region = region.parentElement) {
      if (region.querySelectorAll('h2,h3,[role="heading"]').length > 1) break;
      const url = select(region.querySelectorAll('a[href]'));
      if (url) return { url };
    }
  }

  // 2. 遍历各优先选择器矩阵
  for (const selector of definition.selectors) {
    const matched = document.querySelectorAll(selector);
    if (matched && matched.length > 0) {
      const url = select(matched);
      if (url) return { url };
    }
  }

  return { blocked: 'latest_conversation_not_identifiable', reason: 'history_list_empty_or_loading' };
}
globalThis.discoverLatestConversation = discoverLatestConversation;
if (typeof module !== 'undefined') module.exports = { discoverLatestConversation };
