/* Explicit Studio jobs only. One send attempt; no meeting delivery IDs or TG routing. */
(() => {
 const HOST='com.pocketfleet.selectorstudio',ENDPOINT='http://127.0.0.1:18767';
 let connection=null,connectingAt=0,running=false;
 let instance=null;
 const activeTabs=new Set();globalThis.PocketFleetStudioTabs=activeTabs;
 const history={
 'chatgpt-folded-host':['[data-testid="history"] a[href^="/c/"]','nav [aria-label*="history" i] a[href^="/c/"]','nav a[href^="/c/"]'],
 'claude-web':['nav a[href^="/chat/"]','[aria-label*="history" i] a[href^="/chat/"]'],
 'gemini-earth-sandbox':['[data-test-id="conversation"] a[href^="/app/"]','nav a[href^="/app/"]','a.conversation[href^="/app/"]'],
 'deepseek-remainder':['nav a[href^="/a/chat/s/"]','[class*="history"] a[href^="/a/chat/s/"]'],
 'qwen-theta':['nav a[href^="/c/"]','[class*="history"] a[href^="/c/"]'],
 'qwen-theta-tongyi':['nav a[href^="/c/"]','[class*="history"] a[href*="session"]'],
 'doubao-heart':['[class*="history"] a[href^="/chat/"]'],
 'glm-xingtu':['[class*="history"] a[href*="chat"]'],
 'copilot-grayfold':['[aria-label*="history" i] a[href*="/chats/"]'],
 'kimi-motin':['[class*="history"] a[href^="/chat/"]','nav a[href^="/chat/"]']};
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 async function execute(tabId,func,args=[]){const res=await chrome.scripting.executeScript({target:{tabId},func,args});return res[0]?.result}
 function inspect(rules,jobId,op,expectedURL){
  const visible=n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'};
  const all=k=>{const found=new Set();for(const s of rules[k]||[])for(const n of document.querySelectorAll(s))found.add(n);return [...found]};
  const text=n=>(n?.value??n?.innerText??n?.textContent??'').replace(/\s+/g,' ').trim();
  try{
   if(expectedURL&&location.href!==expectedURL)return {blocked:'route_changed'};
   if(op==='guard'||op==='prepare'||op==='send'){
    if(typeof globalThis.__pfStudioCanStart!=='function'||!globalThis.__pfStudioCanStart())return {blocked:'bridge_paused'};
   }
   if(op==='guard'){
    if(!globalThis.__pfRulesIdle||!globalThis.__pfRulesIdle())return {blocked:'page_or_task_busy'};
    const editors=all('editor').filter(visible);
    if(editors.length===0)return {blocked:'editor_unmatched'};
    if(editors.some(n=>text(n)))return {blocked:'user_draft'};
    globalThis.PocketFleetStudioReserved=jobId;return {ok:true};
   }
   if(globalThis.PocketFleetStudioReserved!==jobId)return {blocked:'test_lease_lost'};
   if(!globalThis.__pfStudioTaskIdle?.())return {blocked:'task_started'};
   const fields={};for(const k of Object.keys(rules)){const nodes=all(k);fields[k]={count:nodes.length,visible:nodes.filter(visible).length,invalid:[],chosen:rules[k].find(s=>document.querySelector(s))||''}}
   if(op==='prepare'){
    if(typeof globalThis.__pfStudioCanStart!=='function'||!globalThis.__pfStudioCanStart())return {blocked:'bridge_paused',fields};
    const editors=all('editor').filter(visible);if(editors.length!==1)return {blocked:'editor_ambiguous',fields};if(text(editors[0]))return {blocked:'user_draft',fields};if(all('generation').some(visible))return {blocked:'generating',fields};
    const prompt='PocketFleet 连通性测试，请只回复：PFTEST-'+jobId+'。无需执行其他任务。';
    const lease={url:location.href,prompt,nonce:'PFTEST-'+jobId,previousUsers:new Set(all('userMessages')),previousAssistants:new Set(all('assistantMessages')),attempted:false};globalThis.__pfStudioLease=lease;
    const editor=editors[0];editor.focus();if(editor.tagName==='TEXTAREA'||editor.tagName==='INPUT'){const prototype=editor.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(editor,prompt);editor.dispatchEvent(new Event('input',{bubbles:true}));editor.dispatchEvent(new Event('change',{bubbles:true}))}else if(editor.isContentEditable){if(!document.execCommand('insertText',false,prompt))return {blocked:'input_event_unsupported',fields}}else return {blocked:'editor_type_unsupported',fields};return {ok:true,url:lease.url,fields};
   }
   const lease=globalThis.__pfStudioLease;if(!lease||location.href!==lease.url)return {blocked:'route_changed',fields};
   if(op==='send'){
    if(typeof globalThis.__pfStudioCanStart!=='function'||!globalThis.__pfStudioCanStart())return {blocked:'bridge_paused',fields};
    if(lease.attempted)return {blocked:'already_attempted',fields};const editors=all('editor').filter(visible);if(editors.length!==1||text(editors[0])!==lease.prompt||all('generation').some(visible))return {blocked:'draft_or_generation_changed',fields};
    const buttons=all('submit').filter(visible);if(buttons.length!==1)return {blocked:'submit_ambiguous',fields};if(buttons[0].disabled||buttons[0].getAttribute('aria-disabled')==='true')return {waiting:true};lease.attempted=true;buttons[0].click();return {ok:true,fields};
   }
   if(op==='receipt'){
    const users=all('userMessages'),user=users[users.length-1];if(!user||lease.previousUsers.has(user)||!text(user).includes(lease.prompt))return {waiting:true,fields};
    const assistants=all('assistantMessages'),reply=assistants[assistants.length-1];const after=reply&&Boolean(user.compareDocumentPosition(reply)&Node.DOCUMENT_POSITION_FOLLOWING);
    const matched=reply&&!lease.previousAssistants.has(reply)&&after&&text(reply).includes(lease.nonce);return {matched:Boolean(matched),generating:all('generation').some(visible),fields};
   }
  }catch{return {blocked:'invalid_css_or_dom_error'}}
 }
 async function waitPage(tabId){for(let i=0;i<40;i++){const tab=await chrome.tabs.get(tabId);if(tab.status==='complete'){try{const ready=await execute(tabId,()=>Boolean(globalThis.__pfRulesIdle));if(ready)return tab}catch{}}await sleep(250)}throw Error('page_not_ready')}
 async function guardPage(tabId,job,url){let result;for(let i=0;i<24;i++){result=await execute(tabId,inspect,[job.rules,job.job_id,'guard',url]);if(result?.ok||result?.blocked!=='page_or_task_busy')return result;await sleep(250)}return result}
 async function run(job){
  const result={id:job.profile.id,status:'unverified',reason:'',origin:'',fields:null,attested:false};let tabId=null;
  try{
   const trusted=globalThis.CHAT_AI_ADAPTER_PROFILES.find(p=>(p.selectorKey||p.id)===job.profile.id);if(!trusted||JSON.stringify(trusted.origins)!==JSON.stringify(job.profile.origins))throw Error('profile_identity_mismatch');
   globalThis.SelectorEngine.validate({schema:1,revision:1,targets:{[job.profile.id]:job.rules}});
   const key='studio_attempt_'+job.job_id;if((await chrome.storage.local.get(key))[key])throw Error('already_claimed');await chrome.storage.local.set({[key]:Date.now()});
   const tabs=(await chrome.tabs.query({})).filter(t=>{try{return trusted.origins.includes(new URL(t.url).origin)}catch{return false}});if(tabs.length>1)throw Error('multiple_platform_tabs');
   const tab=tabs[0]||await chrome.tabs.create({url:trusted.origins[0]+'/',active:false});tabId=tab.id;activeTabs.add(tabId);await chrome.storage.local.set({['studio_tab_'+tabId]:Date.now()+120000});await waitPage(tabId);
   const guard=await guardPage(tabId,job);if(!guard?.ok)throw Error(guard?.blocked||'guard_failed');
   await chrome.tabs.update(tabId,{url:trusted.origins[0]+'/',active:true});await waitPage(tabId);
   // Latest is selected from the platform's ordered recent-history list, never tab recency.
   let latest=null;for(let i=0;i<20&&!latest;i++){latest=await execute(tabId,(selectors,origins)=>{for(const s of selectors){const candidates=[...document.querySelectorAll(s)].filter(a=>{const r=a.getBoundingClientRect();return r.width>0&&r.height>0&&!a.closest('[data-pinned="true"], [aria-label*="pinned" i]')});if(candidates.length){const u=new URL(candidates[0].getAttribute('href'),location.href);if(origins.includes(u.origin)&&u.pathname!=='/'&&u.pathname!=='/app')return u.href}}return null},[history[job.profile.id]||[],trusted.origins]);if(!latest)await sleep(300)}if(!latest)throw Error('latest_conversation_not_identifiable');
   await chrome.tabs.update(tabId,{url:latest});await waitPage(tabId);const guard2=await guardPage(tabId,job,latest);if(!guard2?.ok)throw Error(guard2?.blocked||'latest_not_ready');
   const prep=await execute(tabId,inspect,[job.rules,job.job_id,'prepare',latest]);if(!prep?.ok)throw Error(prep?.blocked||'prepare_failed');result.fields=prep.fields;result.origin=new URL(latest).origin;
   let sent=false;for(let i=0;i<20;i++){const s=await execute(tabId,inspect,[job.rules,job.job_id,'send',latest]);if(s?.ok){sent=true;result.fields=s.fields;break}if(!s?.waiting)throw Error(s?.blocked||'send_not_confirmed');await sleep(250)}if(!sent)throw Error('send_not_ready');
   let quietAt=0;for(let i=0;i<65;i++){const r=await execute(tabId,inspect,[job.rules,job.job_id,'receipt',latest]);if(r?.blocked)throw Error(r.blocked);if(r?.matched&&!r.generating){quietAt ||= Date.now();if(Date.now()-quietAt>=3000){result.status='auto_pass';result.reason='单次测试发送与本轮随机编号回执已确认；生成终态仍为 DOM 启发式';result.fields=r.fields;break}}else quietAt=0;await sleep(1000)}if(result.status!=='auto_pass')throw Error('receipt_unconfirmed_no_retry');
  }catch(e){const reason=String(e.message||e);result.reason=/^[a-z_]{3,80}$/.test(reason)?reason:'browser_operation_failed'}finally{if(tabId){try{await execute(tabId,id=>{if(globalThis.PocketFleetStudioReserved===id){globalThis.PocketFleetStudioReserved=null;globalThis.__pfStudioLease=null}},[job.job_id])}catch{}activeTabs.delete(tabId);await chrome.storage.local.remove('studio_tab_'+tabId)}}return result;
 }
 async function poll(){if(running||!chrome.runtime.sendNativeMessage)return;running=true;try{if(!connection){if(Date.now()-connectingAt<30000)return;connectingAt=Date.now();connection=await chrome.runtime.sendNativeMessage(HOST,{op:'connect'});if(connection?.endpoint!==ENDPOINT||typeof connection.token!=='string'||connection.token.length<40){connection=null;return}}
   if(!instance){const data=await chrome.storage.local.get('studio_browser_instance');instance=data.studio_browser_instance||crypto.randomUUID();if(!data.studio_browser_instance)await chrome.storage.local.set({studio_browser_instance:instance})}
   const headers={Authorization:'Bearer '+connection.token,'X-Studio-Client':instance,'X-Studio-Browser':navigator.userAgent.includes('Edg/')?'edge':'chrome'};
   const r=await fetch(ENDPOINT+'/jobs',{headers,credentials:'omit',redirect:'error',signal:AbortSignal.timeout(3000)});if(r.status===204)return;if(!r.ok)throw Error('studio_not_ready');const job=await r.json();const result=await run(job);await fetch(ENDPOINT+'/result',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({job_id:job.job_id,hash:job.hash,result}),credentials:'omit',redirect:'error',signal:AbortSignal.timeout(5000)});
  }catch{connection=null}finally{running=false}}
 globalThis.PocketFleetStudioRunner={poll};
 if(typeof module!=='undefined')module.exports={inspect};
})();
