/* Apply verified cached rules only between tasks. Never fetch from page scripts. */
(() => {
 if(globalThis.__pfSelectorClientInstalled)return;globalThis.__pfSelectorClientInstalled=true;
 let pending=null,version=globalThis.SelectorUpdates.BUILTIN,loading=false;
 const api={version:()=>version,async load(){if(loading)return;loading=true;try{const data=await globalThis.SelectorUpdates.cached(chrome.storage.local,chrome.runtime.getManifest().version);if(data)pending=data;api.apply()}catch(e){console.warn('[PocketFleet rules] cache refused',String(e.message))}finally{loading=false}},apply(){if(!pending||!globalThis.__pfRulesIdle?.())return;try{globalThis.SelectorEngine.installLocal(pending.bundle,s=>document.querySelector(s));version={version:pending.meta.version,revision:pending.meta.revision,source:'cloud'};pending=null}catch(e){pending=null;console.warn('[PocketFleet rules] CSS refused',String(e.message))}}};globalThis.PocketFleetRuleClient=api;
 chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes[globalThis.SelectorUpdates.STORAGE])api.load()});
 chrome.runtime.onMessage.addListener((m,s,reply)=>{if(m.type==='selector-page-version'){reply({...version,pending:pending?.meta.version||null});return false}});
 api.load();setInterval(()=>api.apply(),2000);
})();
