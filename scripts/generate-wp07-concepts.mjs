import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const outputDirectory = 'docs/design';
const viewport = { width: 1440, height: 960 };

const tokens = `
  :root {
    color-scheme: light;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: #17212b;
    background: #f7f5f0;
  }
  * { box-sizing: border-box; }
  body { margin: 0; width: 1440px; min-height: 960px; background: #f7f5f0; }
  button { font: inherit; }
  .page { width: 1440px; min-height: 960px; padding: 20px 24px 16px; }
  .surface { background: #fff; border: 1px solid #d9d5cc; border-radius: 12px; }
  .header { height: 72px; display: grid; grid-template-columns: 420px 125px 220px 1fr auto; gap: 12px; align-items: center; padding: 0 28px 0 20px; box-shadow: 2px 3px 0 rgba(0,0,0,.07); }
  .brand { display: flex; gap: 14px; align-items: center; }
  .hamster { width: 42px; height: 42px; flex: none; }
  .brand h1 { margin: 0; font-size: 24px; line-height: 1; }
  .brand p { margin: 6px 0 0; color: #53606d; font-size: 12px; }
  .pill { display: inline-flex; width: fit-content; min-height: 28px; padding: 0 13px; align-items: center; justify-content: center; border-radius: 999px; font-size: 11px; font-weight: 650; }
  .pill.ready { color: #146c43; background: #eaf7ef; }
  .pill.info { color: #146c43; background: #eaf7ef; }
  .pill.warn { color: #8a4b08; background: #fff4e5; }
  .date span { display: block; color: #53606d; font-size: 11px; }
  .date strong { display: block; margin-top: 4px; font-size: 13px; font-weight: 600; }
  .actions { display: flex; gap: 12px; }
  .button { height: 40px; padding: 0 18px; border-radius: 8px; border: 1px solid #d9d5cc; background: #fff; color: #17212b; }
  .button.primary { background: #6b3f24; color: #fff; border-color: #6b3f24; }
  .button.danger { color: #a1241b; border-color: #a1241b; }
  .top { display: grid; grid-template-columns: minmax(0, 1fr) 405px; gap: 16px; margin-top: 20px; }
  .brief { height: 173px; padding: 20px 21px; }
  .brief h2 { margin: 0; font-size: 21px; line-height: 1.25; }
  .brief > p { margin: 8px 0 0; color: #53606d; font-size: 13px; line-height: 1.45; }
  .prompt { position: relative; height: 52px; margin-top: 10px; padding: 8px 126px 7px 14px; border-radius: 8px; border: 1px solid #d9d5cc; background: #f0eee8; }
  .prompt span { display: block; color: #53606d; font-size: 10px; font-weight: 650; }
  .prompt code { display: block; margin-top: 4px; color: #17212b; font: 11px/1.35 ui-sans-serif, system-ui, sans-serif; white-space: normal; }
  .prompt .button { position: absolute; top: 7px; right: 12px; height: 38px; }
  .disclaimer { margin-top: 8px; color: #a1241b; font-size: 10.5px; font-weight: 650; }
  .metrics { height: 173px; padding: 18px 20px; }
  .metrics h2 { margin: 0 0 15px; font-size: 14px; }
  .metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); row-gap: 15px; }
  .metric strong { display: block; font: 21px/1 ui-monospace, SFMono-Regular, Menlo, monospace; }
  .metric span { display: block; margin-top: 5px; color: #53606d; font-size: 10px; }
  .workspace { display: grid; grid-template-columns: 280px minmax(500px, 1fr) 342px; gap: 16px; height: 617px; margin-top: 20px; }
  .panel { overflow: hidden; }
  .panel-head { height: 65px; padding: 16px 17px 0; border-bottom: 1px solid #d9d5cc; }
  .panel-head h2 { margin: 0; font-size: 16px; }
  .panel-head p { margin: 6px 0 0; color: #53606d; font-size: 11px; }
  .scroll { height: 551px; padding: 12px 20px; overflow: hidden; }
  .request-card, .volunteer-card { min-height: 92px; margin-bottom: 9px; padding: 11px; border: 1px solid #d9d5cc; border-radius: 9px; background: #fffefc; }
  .card-row { display: flex; justify-content: space-between; align-items: flex-start; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .request-card .id, .volunteer-card .id { font-size: 11px; }
  .request-card h3 { margin: 8px 0 0; font-size: 12px; }
  .request-card p, .volunteer-card p { margin: 5px 0 0; color: #53606d; font-size: 10px; }
  .small-pill { display: inline-flex; margin-top: 8px; padding: 5px 11px; border-radius: 999px; background: #f0eee8; color: #53606d; font-size: 9px; }
  .priority { padding: 6px 12px; border-radius: 999px; font-size: 9px; }
  .priority.urgent { color: #a1241b; background: #fdedec; }
  .priority.high { color: #8a4b08; background: #fff4e5; }
  .plan-body { height: 551px; padding: 18px 28px; }
  .empty { height: 258px; display: grid; grid-template-columns: 150px 1fr; align-items: center; padding: 32px 80px; border: 1px solid #cbb8a8; border-radius: 12px; background: #fbf8f2; }
  .empty .hamster { width: 70px; height: 70px; justify-self: center; }
  .empty h2 { margin: 0; font-size: 22px; }
  .empty p { margin: 12px 0 0; color: #53606d; font-size: 14px; line-height: 1.5; }
  .empty-actions { display: flex; gap: 30px; align-items: center; margin-top: 20px; }
  .tool-area h3 { margin: 40px 0 13px; font-size: 14px; }
  .tools { display: grid; grid-template-columns: repeat(3, 1fr); gap: 13px 18px; padding: 14px; border-radius: 9px; background: #f0eee8; }
  .tool { display: flex; align-items: center; justify-content: space-between; gap: 8px; font: 9px ui-monospace, SFMono-Regular, Menlo, monospace; }
  .tool em { padding: 6px 10px; border-radius: 999px; background: #fff; color: #53606d; font-style: normal; }
  .authority { margin-top: 28px; padding: 16px; border: 1px solid #b7dcc8; border-radius: 9px; background: #eaf7ef; color: #146c43; }
  .authority strong { display: block; font-size: 13px; }
  .authority span { display: block; margin-top: 8px; font-size: 11px; }
  .load { width: 68px; }
  .load small { display: block; color: #53606d; font-size: 9px; }
  .load strong { display: block; margin-top: 4px; font: 12px ui-monospace, monospace; }
  .bar { width: 58px; height: 7px; margin-top: 7px; border-radius: 999px; background: #e5e1d9; }
  .footer { margin-top: 13px; color: #53606d; font-size: 11px; }
  .overlay { position: fixed; inset: 0; display: grid; place-items: center; background: rgba(23,33,43,.93); }
  .dialog { width: 830px; min-height: 800px; padding: 28px 32px 34px; border-radius: 14px; border: 1px solid #b9b3a8; background: #fff; box-shadow: 2px 3px 0 rgba(0,0,0,.2); }
  .dialog-header { display: flex; justify-content: space-between; gap: 16px; align-items: start; }
  .dialog h1 { margin: 0; font-size: 25px; }
  .dialog-intro { margin: 11px 0 0; color: #53606d; font-size: 13px; line-height: 1.5; }
  .dialog-metrics { display: grid; grid-template-columns: repeat(4,1fr); gap: 18px; margin-top: 38px; }
  .dialog-metric { height: 70px; padding: 12px 14px; border-radius: 9px; background: #f0eee8; }
  .dialog-metric strong { display:block; font: 21px ui-monospace, monospace; }
  .dialog-metric span { display:block; margin-top: 5px; color:#53606d; font-size:10px; }
  table { width: 100%; margin-top: 30px; border-collapse: collapse; font-size: 10px; }
  thead { background: #f0eee8; color: #53606d; text-align: left; }
  th { padding: 13px 15px; }
  td { padding: 11px 15px; }
  tbody tr:nth-child(odd) { background: #fcfbf8; }
  .valid { padding: 6px 11px; border-radius: 999px; color:#146c43; background:#eaf7ef; }
  .warning-box { margin-top: 22px; padding: 15px; border-radius: 9px; border:1px solid #e6c89d; background:#fff4e5; color:#8a4b08; }
  .warning-box strong { display:block; font-size:12px; }
  .warning-box span { display:block; margin-top:8px; font-size:11px; }
  .dialog-actions { display:flex; justify-content:flex-end; gap:20px; margin-top:28px; }
`;

function hamsterSvg() {
  return `<svg class="hamster" viewBox="0 0 48 48" aria-hidden="true">
    <circle cx="14" cy="12" r="8" fill="#c9885b" stroke="#6b3f24"/>
    <circle cx="34" cy="12" r="8" fill="#c9885b" stroke="#6b3f24"/>
    <circle cx="24" cy="25" r="19" fill="#d9a06d" stroke="#6b3f24" stroke-width="1.5"/>
    <ellipse cx="24" cy="30" rx="12" ry="10" fill="#f2d2af"/>
    <circle cx="17" cy="22" r="2" fill="#17212b"/><circle cx="31" cy="22" r="2" fill="#17212b"/>
    <path d="M24 27l-3 3h6z" fill="#6b3f24"/><path d="M17 32q4 6 7 0q3 6 7 0" fill="none" stroke="#6b3f24"/>
  </svg>`;
}

function header(state = 'READY') {
  return `<header class="surface header">
    <div class="brand">${hamsterSvg()}<div><h1>DOMHamster</h1><p>The human-approved agent dispatcher</p></div></div>
    <span class="pill ${state === 'READY' ? 'ready' : 'warn'} mono">${state}</span>
    <span class="pill info">WebMCP connected</span>
    <div class="date"><span>Scenario date</span><strong>26 Aug 2026 · Riyadh</strong></div>
    <div class="actions"><button class="button">Activity</button><button class="button">Diagnostics</button><button class="button danger">Reset</button></div>
  </header>`;
}

const requests = [
  ['R-101','Food delivery','URGENT','North · 09:00–10:30','Lifting'],
  ['R-102','Food delivery','URGENT','Central · 09:00–11:00','Food handling'],
  ['R-103','Transport','HIGH','East · 10:30–12:00','Driving'],
  ['R-104','Translation','URGENT','South · 11:30–12:30','Arabic'],
  ['R-105','Delivery','HIGH','North · 12:30–14:00','Lifting'],
];
const volunteers = [
  ['V-01','North zone','Lifting · AR / EN'],['V-02','Central zone','Food handling · EN'],
  ['V-03','East zone','Driving · lifting · AR / EN'],['V-04','South zone','Setup · AR / UR'],
  ['V-05','West zone','Driving · setup · EN'],
];

function briefAndMetrics(assigned = 0, unassigned = 8, warnings = 0) {
  return `<section class="top">
    <article class="surface brief">
      <h2>Coordinate the day. Let the agent draft. Keep the human in charge.</h2>
      <p>DOMHamster turns a live coordination board into structured WebMCP tools so an agent can build and repair a plan while a coordinator controls locks and approval.</p>
      <div class="prompt"><span>Demo prompt</span><code>Build today’s plan. Prioritize urgent food deliveries, keep every volunteer at three tasks or fewer, and make sure R-104 has an Arabic-speaking volunteer.</code><button class="button">Copy prompt</button></div>
      <div class="disclaimer">Fictional demo data only. Non-emergency coordination; not an emergency-dispatch system.</div>
    </article>
    <aside class="surface metrics"><h2>Live coordination summary</h2><div class="metric-grid">
      ${[['8','Open requests'],['5','Volunteers'],[String(assigned),'Assigned'],[String(unassigned),'Unassigned'],['0','Hard errors'],[String(warnings),'Warnings']].map(([v,l]) => `<div class="metric"><strong>${v}</strong><span>${l}</span></div>`).join('')}
    </div></aside>
  </section>`;
}

function primaryHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${tokens}</style></head><body><div class="page">
    ${header()}${briefAndMetrics()}
    <main class="workspace">
      <section class="surface panel"><div class="panel-head"><h2>Requests</h2><p>8 open · privacy-minimized</p></div><div class="scroll">
        ${requests.map(([id,title,priority,meta,badge]) => `<article class="request-card"><div class="card-row"><span class="id mono">${id}</span><span class="priority ${priority === 'URGENT' ? 'urgent' : 'high'}">${priority}</span></div><h3>${title}</h3><p>${meta}</p><span class="small-pill">${badge}</span></article>`).join('')}
      </div></section>
      <section class="surface panel"><div class="panel-head"><h2>Assignment plan</h2><p>Shared agent + coordinator workspace</p></div><div class="plan-body">
        <section class="empty">${hamsterSvg()}<div><h2>No assignment draft yet</h2><p>Ask your browser agent to use DOMHamster’s WebMCP tools, or copy the demo prompt above.</p><div class="empty-actions"><span class="pill ready mono">5 tools available</span><button class="button primary">Copy demo prompt</button></div></div></section>
        <section class="tool-area"><h3>Agent tool lifecycle</h3><div class="tools">${[['get_coordination_overview','read'],['list_open_requests','read'],['list_available_volunteers','read'],['create_assignment_draft','write'],['get_audit_history','read']].map(([name,type]) => `<div class="tool"><span>${name}</span><em>${type}</em></div>`).join('')}</div></section>
        <div class="authority"><strong>Human authority is enforced</strong><span>Lock, approval, rejection, discard and reset are never exposed as agent tools.</span></div>
      </div></section>
      <aside class="surface panel"><div class="panel-head"><h2>Volunteers</h2><p>5 available · max 3 tasks</p></div><div class="scroll">
        ${volunteers.map(([id,zone,skills]) => `<article class="volunteer-card"><div class="card-row"><div><span class="id mono">${id}</span><p>${zone}</p><span class="small-pill">${skills}</span></div><div class="load"><small>Load</small><strong>0 / 3</strong><div class="bar"></div></div></div></article>`).join('')}
      </div></aside>
    </main><div class="footer">READY · Canonical fictional scenario · No private contact fields rendered</div>
  </div></body></html>`;
}

function approvalHtml() {
  const rows = [
    ['R-101','V-01','09:00','—'],['R-102','V-02','09:00','—'],['R-103','V-03','10:30','—'],
    ['R-104','V-04','11:30','Arabic matched'],['R-105','V-03','13:00','Locked by coordinator'],
    ['R-106','V-05','13:00','Agent repair'],['R-107','V-05','14:00','—'],['R-108','V-03','15:00','—'],
  ];
  return `<!doctype html><html><head><meta charset="utf-8"><style>${tokens}</style></head><body>
    <div class="page">${header('AWAITING_APPROVAL')}${briefAndMetrics(8,0,2)}</div>
    <div class="overlay"><section class="dialog">
      <div class="dialog-header"><div><h1>Review draft v4 before approval</h1><p class="dialog-intro">Approval authorizes the agent to commit this exact version for 120 seconds. Any edit, unlock, rejection, cancellation, reset, reload, or expiry invalidates approval.</p></div><span class="pill warn">Human decision required</span></div>
      <div class="dialog-metrics">${[['8','Assignments'],['1','Locked'],['2','Warnings'],['0','Hard errors']].map(([v,l]) => `<div class="dialog-metric"><strong>${v}</strong><span>${l}</span></div>`).join('')}</div>
      <table><thead><tr><th>Request</th><th>Volunteer</th><th>Start</th><th>Status</th><th>Human control</th></tr></thead><tbody>${rows.map(([r,v,t,c]) => `<tr><td class="mono">${r}</td><td class="mono">${v}</td><td class="mono">${t}</td><td><span class="valid">Valid</span></td><td>${c}</td></tr>`).join('')}</tbody></table>
      <div class="warning-box"><strong>2 non-blocking warnings</strong><span>Zone efficiency and workload balance remain visible but do not block approval.</span></div>
      <div class="dialog-actions"><button class="button">Cancel review</button><button class="button danger">Reject and return</button><button class="button primary">Approve version 4</button></div>
    </section></div>
  </body></html>`;
}

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const [name, html] of [
    ['domhamster-primary-screen.png', primaryHtml()],
    ['domhamster-approval-state.png', approvalHtml()],
  ]) {
    const page = await browser.newPage({ viewport });
    await page.setContent(html, { waitUntil: 'load' });
    await page.screenshot({ path: `${outputDirectory}/${name}`, fullPage: false });
    await page.close();
  }
} finally {
  await browser.close();
}
