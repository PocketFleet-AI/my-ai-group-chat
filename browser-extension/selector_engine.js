/* Data-only DOM rules. Identity, origins and execution remain pinned in code. */
(() => {
  if(globalThis.SelectorEngine){if(typeof module!=='undefined')module.exports=globalThis.SelectorEngine;return;}
  const keys = new Set([
    'editor',
    'submit',
    'generation',
    'userMessages',
    'assistantMessages',
    'expandButtons',
    'userMessageFullText',
    'userMessageFolded',
    'idleControl',
    'submitControl',
    'stopControl',
    'completedActions',
    'errorIndicators',
    'cancelIndicators'
  ]);
  let overrides = Object.freeze({});
  function validate(bundle) {
    if (!bundle || bundle.schema !== 1 || !Number.isSafeInteger(bundle.revision) || bundle.revision < 1) throw new Error('Invalid selector schema');
    if (Object.keys(bundle).some(key => !['schema', 'revision', 'targets'].includes(key))) throw new Error('Unknown bundle field');
    if (!bundle.targets || Object.getPrototypeOf(bundle.targets) !== Object.prototype) throw new Error('Invalid targets');
    const result = {};
    for (const [id, rules] of Object.entries(bundle.targets)) {
      if (!globalThis.CHAT_AI_ADAPTER_PROFILES.some(p => (p.selectorKey || p.id) === id)) throw new Error('Unknown adapter');
      if (!rules || Object.getPrototypeOf(rules) !== Object.prototype) throw new Error('Invalid rules');
      const target = {};
      for (const [key, values] of Object.entries(rules)) {
        if (!keys.has(key) || !Array.isArray(values) || !values.length || values.length > 16) throw new Error('Capability denied');
        if (values.some(s => typeof s !== 'string' || !s.trim() || s.length > 512)) throw new Error('Invalid selector');
        target[key] = Object.freeze([...values]);
      }
      result[id] = Object.freeze(target);
    }
    return Object.freeze(result);
  }
  const engine = Object.freeze({ validate,
    selectors(profile, key) { return overrides[profile?.selectorKey || profile?.id]?.[key] || profile?.selectors?.[key] || []; },
    first(scope, selectors) {
      for (const selector of selectors || []) { try { const found = scope.querySelector(selector); if (found) return found; } catch {} }
      return null;
    },
    all(scope, selectors) {
      if (!selectors?.length) return [];
      // Normal rules use one native DOM query; isolate entries only on syntax failure.
      try { return [...scope.querySelectorAll(selectors.join(', '))]; } catch {}
      const found = new Set();
      for (const selector of selectors || []) {
        try { for (const node of scope.querySelectorAll(selector)) found.add(node); } catch {}
      }
      return [...found].sort((a, b) => {
        const position = a.compareDocumentPosition(b);
        return position & 1 ? 0 : position & 4 ? -1 : position & 2 ? 1 : 0;
      });
    },
    installLocal(bundle, syntaxCheck) {
      const next = validate(bundle);
      if (typeof syntaxCheck !== 'function') throw new Error('Syntax validator required');
      for (const rules of Object.values(next)) for (const list of Object.values(rules)) for (const s of list) syntaxCheck(s);
      overrides = next;
    },
  });
  globalThis.SelectorEngine = engine;
  if (typeof module !== 'undefined') module.exports = engine;
})();
