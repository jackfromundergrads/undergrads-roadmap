/* Undergrads Q4 Roadmap
   The ordered list is the spine. Each card opens into the documentation its tier has earned. */

const SUPABASE_URL = 'https://zdinyxtofdzmcwnpdbai.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xafajeAjC5Hg7186vDNthA_X78CnIZ_';
const ALLOWED_DOMAIN = '@undergrads.com';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'roadmap' },
});

const TIERS = [
  { id: 'now',   name: 'Now',   note: 'Full PRD — tables, pilot, test, acceptance criteria.' },
  { id: 'next',  name: 'Next',  note: 'One-pager — what, why, rough size, dependencies.' },
  { id: 'later', name: 'Later', note: 'A title and a sentence. Detail is earned on the way up.' },
];
const SIZES = {
  xs: '≤ 8h', s: '~1 wk', m: '2–4 wk', l: '1–2 mo', xl: 'Quarter+', unsized: 'Unsized',
};
const STATUSES = {
  not_started: 'Not started', in_progress: 'In progress', blocked: 'Blocked',
  shipped: 'Shipped', parked: 'Parked',
};
const DOC_TYPES = {
  prd: 'PRD', one_pager: 'One-pager', note: 'Note',
  test_result: 'Test result', research: 'Research', decision: 'Decision',
};
const OWNERS = ['Jack', 'Luana', 'Lucas'];
const lines = (t) => String(t || '').split('\n').map((x) => x.replace(/^[-*\u2022]\s*/, '').trim()).filter(Boolean);

const main = document.getElementById('main');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (d) => d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';

let state = { user: null, items: [], deps: [], openId: null };

/* ---------------- auth ---------------- */

function renderGate(msg, isError) {
  document.getElementById('who').hidden = true;
  document.getElementById('signOutBtn').hidden = true;
  document.getElementById('newItemBtn').hidden = true;
  main.innerHTML = `
    <div class="gate"><div class="gate-card">
      <h2>Sign in</h2>
      <p class="note">This roadmap is limited to Undergrads accounts. Enter your work email and we'll send a sign-in link — no password.</p>
      <label class="f">Work email
        <input type="email" id="email" placeholder="you${ALLOWED_DOMAIN}" autocomplete="email">
      </label>
      <button class="btn btn-primary" id="sendLink">Send sign-in link</button>
      <p id="gateMsg" class="${isError ? 'err' : 'ok'}">${esc(msg || '')}</p>
    </div></div>`;
  const send = async () => {
    const email = document.getElementById('email').value.trim().toLowerCase();
    const out = document.getElementById('gateMsg');
    if (!email.endsWith(ALLOWED_DOMAIN)) {
      out.className = 'err';
      out.textContent = `Use your ${ALLOWED_DOMAIN} address. Other accounts can't open this roadmap.`;
      return;
    }
    out.className = 'note';
    out.textContent = 'Sending…';
    const { error } = await db.auth.signInWithOtp({
      email, options: { emailRedirectTo: window.location.href.split('#')[0] },
    });
    out.className = error ? 'err' : 'ok';
    out.textContent = error ? error.message : 'Link sent. Check your inbox and open it on this device.';
  };
  document.getElementById('sendLink').onclick = send;
  document.getElementById('email').addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
}

/* ---------------- data ---------------- */

async function load() {
  const [items, deps] = await Promise.all([
    db.from('items').select('*').order('tier').order('sort_order'),
    db.from('dependencies').select('*'),
  ]);
  if (items.error) { main.innerHTML = `<p class="err" style="padding:32px 0">${esc(items.error.message)}</p>`; return; }
  state.items = items.data || [];
  state.deps = deps.data || [];
  renderBoard();
  if (state.openId) openPanel(state.openId);
}

/* ---------------- board ---------------- */

function blockersFor(id) {
  return state.deps
    .filter((d) => d.item_id === id)
    .map((d) => state.items.find((i) => i.id === d.depends_on_item_id))
    .filter((i) => i && i.status !== 'shipped');
}

function cardHTML(item, rank) {
  const blockers = blockersFor(item.id);
  const unsized = item.size === 'unsized';
  return `
    <button class="card" data-id="${item.id}">
      <span class="card-top">
        <span class="rank">${rank}</span>
        <span class="card-title">${esc(item.title)}</span>
      </span>
      ${item.summary ? `<span class="card-sum">${esc(item.summary)}</span>` : ''}
      <span class="chips">
        <span class="chip ${unsized ? 'chip-unsized' : 'chip-size'}">${SIZES[item.size]}</span>
        ${item.owner ? `<span class="owner">${esc(item.owner)}</span>` : '<span class="owner">Unassigned</span>'}
      </span>
      ${blockers.length ? `<span class="dep">→ Blocked by ${esc(blockers.map((b) => b.title).join(', '))}</span>` : ''}
    </button>`;
}

function renderBoard() {
  document.getElementById('who').hidden = false;
  document.getElementById('who').textContent = state.user.email;
  document.getElementById('signOutBtn').hidden = false;
  document.getElementById('newItemBtn').hidden = false;

  main.innerHTML = `
    <div class="board">
      ${TIERS.map((t) => {
        const rows = state.items.filter((i) => i.tier === t.id);
        return `<section class="col">
          <div class="col-head"><h3>${t.name}</h3><span class="col-count">${rows.length}</span></div>
          <div class="col-rule"></div>
          <p class="col-note">${esc(t.note)}</p>
          <div class="cards">
            ${rows.length ? rows.map((i, n) => cardHTML(i, n + 1)).join('')
              : '<p class="empty">Nothing here yet.</p>'}
          </div>
        </section>`;
      }).join('')}
    </div>
    <p class="legend">
      <span><b>Sizing is effort, not a date.</b></span>
      <span><b>≤ 8h</b> hours</span><span><b>~1 wk</b> a week</span><span><b>2–4 wk</b></span>
      <span><b>1–2 mo</b></span><span><b>Quarter+</b></span>
      <span><b>Unsized</b> not understood well enough yet</span>
    </p>`;

  main.querySelectorAll('.card').forEach((el) => {
    el.onclick = () => openPanel(el.dataset.id);
  });
}

/* ---------------- detail panel ---------------- */

async function openPanel(id) {
  state.openId = id;
  const item = state.items.find((i) => i.id === id);
  if (!item) return;

  const [docs, acs, ups, decs] = await Promise.all([
    db.from('documents').select('*').eq('item_id', id).order('created_at'),
    db.from('acceptance_criteria').select('*').eq('item_id', id).order('sort_order'),
    db.from('updates').select('*').eq('item_id', id).order('created_at', { ascending: false }),
    db.from('decisions').select('*').eq('item_id', id).order('decided_on', { ascending: false }),
  ]);

  const blockers = blockersFor(id);
  const old = document.getElementById('panelRoot');
  if (old) old.remove();

  const root = document.createElement('div');
  root.id = 'panelRoot';
  root.innerHTML = `
    <div class="scrim" id="scrim"></div>
    <aside class="panel" role="dialog" aria-label="${esc(item.title)}">
      <div class="panel-head">
        <h2>${esc(item.title)}</h2>
        <button class="btn btn-sm btn-onnavy" id="closePanel" style="margin-left:auto">Close</button>
      </div>
      <div class="panel-body">

        <div class="meta">
          <div class="meta-cell"><div class="meta-k">Tier</div><div class="meta-v">${item.tier[0].toUpperCase() + item.tier.slice(1)}</div></div>
          <div class="meta-cell"><div class="meta-k">Estimate</div><div class="meta-v">${SIZES[item.size]}${item.size_confidence ? ` <span style="font-weight:500;color:var(--ink-secondary)">(${item.size_confidence})</span>` : ''}</div></div>
          <div class="meta-cell"><div class="meta-k">Owner</div><div class="meta-v">${esc(item.owner || 'Unassigned')}</div></div>
        </div>

        ${item.size_note ? `<p class="note">${esc(item.size_note)}</p>` : ''}
        ${item.kpi ? `<p class="oneline"><span class="k">What it moves</span><span class="v">${esc(item.kpi)}</span></p>` : ''}

        ${item.summary ? `<div class="sec"><h3>Summary</h3><p class="prose">${esc(item.summary)}</p></div>` : ''}
        ${item.rationale ? `<div class="sec"><h3>Why now</h3><p class="prose">${esc(item.rationale)}</p></div>` : ''}

        <div class="sec">
          <h3>Scope</h3>
          ${(item.scope_in || item.scope_out) ? `
            <div class="split">
              <div class="scope-box scope-in"><div class="scope-k">In scope</div>
                ${lines(item.scope_in).length ? `<ul>${lines(item.scope_in).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="empty">Not defined.</p>'}</div>
              <div class="scope-box scope-out"><div class="scope-k">Out of scope</div>
                ${lines(item.scope_out).length ? `<ul>${lines(item.scope_out).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="empty">Not defined.</p>'}</div>
            </div>` : `<p class="gap">Not scoped yet. Until in and out of scope are written down, this title could mean several different deliverables.</p>`}
        </div>

        <div class="sec">
          <h3>How we build it</h3>
          ${item.approach ? `<p class="prose">${esc(item.approach)}</p>` : '<p class="gap">No approach written down. This is the half a roadmap usually leaves out.</p>'}
        </div>

        <div class="sec">
          <div class="sec-head"><h3>Definition of done</h3>
            <button class="btn btn-sm btn-ghost" id="addAcBtn">Add</button></div>
          <div id="acForm" hidden></div>
          ${(acs.data || []).length ? (acs.data).map((a) => `
            <label class="ac ${a.is_met ? 'met' : ''}">
              <input type="checkbox" data-ac="${a.id}" ${a.is_met ? 'checked' : ''}>
              <span class="ac-text">${esc(a.criterion)}
                ${a.is_met && a.verified_by ? `<span class="ac-by">Verified by ${esc(a.verified_by)} ${fmtDate(a.verified_at)}</span>` : ''}
              </span>
            </label>`).join('')
            : '<p class="empty">Nothing defined yet.</p>'}
        </div>

        ${blockers.length ? `<div class="sec"><h3>Depends on</h3><p class="prose">${esc(blockers.map((b) => b.title).join(', '))}</p></div>` : ''}

        <div class="sec">
          <h3>Risks and unknowns</h3>
          ${item.risks ? `<p class="prose">${esc(item.risks)}</p>` : '<p class="gap">None recorded. An item with no known risks is usually an item nobody has thought hard about.</p>'}
        </div>

        <div class="sec">
          <h3>What it needs</h3>
          ${item.needs ? `<p class="prose">${esc(item.needs)}</p>` : '<p class="empty">Nothing beyond the team we have.</p>'}
        </div>

        <div class="sec">
          <div class="sec-head"><h3>Decisions made</h3>
            <button class="btn btn-sm btn-ghost" id="addDecBtn">Add</button></div>
          <div id="decForm" hidden></div>
          ${(decs.data || []).length ? (decs.data).map((d) => `
            <div class="dec">
              <div class="dec-top">${esc(d.decision)}</div>
              <div class="dec-meta">${esc(d.decided_by || 'Team')} · ${fmtDate(d.decided_on)}</div>
              ${d.rationale ? `<div class="dec-why">${esc(d.rationale)}</div>` : ''}
            </div>`).join('')
            : '<p class="empty">No decisions logged.</p>'}
        </div>

        <div class="sec">
          <div class="sec-head"><h3>Attachments</h3>
            <button class="btn btn-sm btn-ghost" id="addDocBtn">Add</button></div>
          <div id="docForm" hidden></div>
          ${(docs.data || []).length ? (docs.data).map((d) => `
            <details class="doc">
              <summary><span class="tag">${DOC_TYPES[d.doc_type]}</span>${esc(d.title)}</summary>
              <div class="doc-body">${esc(d.body || 'Empty.')}</div>
            </details>`).join('')
            : '<p class="empty">None.</p>'}
        </div>

        <div class="sec">
          <div class="sec-head"><h3>Progress log</h3>
            <button class="btn btn-sm btn-ghost" id="addUpBtn">Post</button></div>
          <div id="upForm" hidden></div>
          ${(ups.data || []).length ? (ups.data).map((u) => `
            <div class="upd">
              <div class="upd-meta">${esc(u.author || 'Someone')} · ${fmtDate(u.created_at)}</div>
              <div class="upd-body">${esc(u.body)}</div>
            </div>`).join('')
            : '<p class="empty">No updates yet.</p>'}
        </div>

        <div class="sec">
          <div class="sec-head"><h3>Edit</h3></div>
          <div class="form">
            <label class="f">Title<input type="text" id="eTitle" value="${esc(item.title)}"></label>
            <label class="f">Summary<textarea id="eSummary">${esc(item.summary || '')}</textarea></label>
            <label class="f">Why now<textarea id="eRationale">${esc(item.rationale || '')}</textarea></label>
            <label class="f">What it moves<input type="text" id="eKpi" value="${esc(item.kpi || '')}"></label>
            <div class="frow">
              <label class="f">In scope (one per line)<textarea id="eScopeIn">${esc(item.scope_in || '')}</textarea></label>
              <label class="f">Out of scope (one per line)<textarea id="eScopeOut">${esc(item.scope_out || '')}</textarea></label>
            </div>
            <label class="f">How we build it<textarea id="eApproach">${esc(item.approach || '')}</textarea></label>
            <label class="f">Risks and unknowns<textarea id="eRisks">${esc(item.risks || '')}</textarea></label>
            <label class="f">What it needs<textarea id="eNeeds" style="min-height:60px">${esc(item.needs || '')}</textarea></label>
            <div class="frow">
              <label class="f">Tier<select id="eTier">${TIERS.map((t) => `<option value="${t.id}" ${item.tier === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}</select></label>
              <label class="f">Estimate<select id="eSize">${Object.entries(SIZES).map(([k, v]) => `<option value="${k}" ${item.size === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
              <label class="f">Confidence<select id="eConf"><option value="">—</option>${['high', 'medium', 'low'].map((c) => `<option value="${c}" ${item.size_confidence === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
            </div>
            <div class="frow">
              <label class="f">Owner<select id="eOwner"><option value="">Unassigned</option>${OWNERS.map((o) => `<option value="${o}" ${item.owner === o ? 'selected' : ''}>${o}</option>`).join('')}</select></label>
              <label class="f">Rank<input type="text" id="eRank" value="${item.sort_order}" inputmode="numeric"></label>
            </div>
            <label class="f">Estimate note<textarea id="eSizeNote" style="min-height:60px">${esc(item.size_note || '')}</textarea></label>
            <div class="actions">
              <button class="btn btn-sm btn-danger" id="delItem">Delete</button>
              <button class="btn btn-sm btn-primary" id="saveItem">Save changes</button>
            </div>
          </div>
        </div>

      </div>
    </aside>`;
  document.body.appendChild(root);
  wirePanel(item, root);
}

function closePanel() {
  state.openId = null;
  const r = document.getElementById('panelRoot');
  if (r) r.remove();
}

function wirePanel(item, root) {
  root.querySelector('#scrim').onclick = closePanel;
  root.querySelector('#closePanel').onclick = closePanel;

  root.querySelectorAll('[data-ac]').forEach((cb) => {
    cb.onchange = async () => {
      await db.from('acceptance_criteria').update({
        is_met: cb.checked,
        verified_by: cb.checked ? state.user.email : null,
        verified_at: cb.checked ? new Date().toISOString() : null,
      }).eq('id', cb.dataset.ac);
      openPanel(item.id);
    };
  });

  const toggleForm = (btnId, boxId, html, onSave) => {
    const btn = root.querySelector(btnId), box = root.querySelector(boxId);
    btn.onclick = () => {
      box.hidden = !box.hidden;
      if (!box.hidden) {
        box.innerHTML = html;
        box.querySelector('.cancel').onclick = () => { box.hidden = true; };
        box.querySelector('.save').onclick = async () => { await onSave(box); openPanel(item.id); };
      }
    };
  };

  toggleForm('#addDocBtn', '#docForm', `
    <div class="form">
      <div class="frow">
        <label class="f">Type<select class="dType">${Object.entries(DOC_TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
        <label class="f">Title<input type="text" class="dTitle" placeholder="e.g. CRM V1 PRD"></label>
      </div>
      <label class="f">Body<textarea class="dBody" style="min-height:160px"></textarea></label>
      <div class="actions"><button class="btn btn-sm btn-ghost cancel">Cancel</button><button class="btn btn-sm btn-primary save">Add document</button></div>
    </div>`, async (box) => {
    const title = box.querySelector('.dTitle').value.trim();
    if (!title) return;
    await db.from('documents').insert({
      item_id: item.id, doc_type: box.querySelector('.dType').value,
      title, body: box.querySelector('.dBody').value, author: state.user.email,
    });
  });

  toggleForm('#addAcBtn', '#acForm', `
    <div class="form">
      <label class="f">Criterion<textarea class="acText" style="min-height:70px" placeholder="Something you can check as done or not done."></textarea></label>
      <div class="actions"><button class="btn btn-sm btn-ghost cancel">Cancel</button><button class="btn btn-sm btn-primary save">Add criterion</button></div>
    </div>`, async (box) => {
    const criterion = box.querySelector('.acText').value.trim();
    if (!criterion) return;
    await db.from('acceptance_criteria').insert({ item_id: item.id, criterion });
  });

  toggleForm('#addUpBtn', '#upForm', `
    <div class="form">
      <label class="f">Update<textarea class="upText" style="min-height:80px" placeholder="What changed since last time?"></textarea></label>
      <div class="actions"><button class="btn btn-sm btn-ghost cancel">Cancel</button><button class="btn btn-sm btn-primary save">Post update</button></div>
    </div>`, async (box) => {
    const body = box.querySelector('.upText').value.trim();
    if (!body) return;
    await db.from('updates').insert({ item_id: item.id, body, author: state.user.email });
  });

  toggleForm('#addDecBtn', '#decForm', `
    <div class="form">
      <label class="f">Decision<textarea class="dcText" style="min-height:60px" placeholder="What was decided?"></textarea></label>
      <label class="f">Why<textarea class="dcWhy" style="min-height:60px" placeholder="Optional."></textarea></label>
      <div class="actions"><button class="btn btn-sm btn-ghost cancel">Cancel</button><button class="btn btn-sm btn-primary save">Log decision</button></div>
    </div>`, async (box) => {
    const decision = box.querySelector('.dcText').value.trim();
    if (!decision) return;
    await db.from('decisions').insert({
      item_id: item.id, decision,
      rationale: box.querySelector('.dcWhy').value || null,
      decided_by: state.user.email,
    });
  });

  root.querySelector('#saveItem').onclick = async () => {
    const rank = parseInt(root.querySelector('#eRank').value, 10);
    const { error } = await db.from('items').update({
      title: root.querySelector('#eTitle').value.trim(),
      summary: root.querySelector('#eSummary').value,
      rationale: root.querySelector('#eRationale').value,
      kpi: root.querySelector('#eKpi').value,
      tier: root.querySelector('#eTier').value,
      size: root.querySelector('#eSize').value,
      size_confidence: root.querySelector('#eConf').value || null,
      size_note: root.querySelector('#eSizeNote').value,
      scope_in: root.querySelector('#eScopeIn').value,
      scope_out: root.querySelector('#eScopeOut').value,
      approach: root.querySelector('#eApproach').value,
      risks: root.querySelector('#eRisks').value,
      needs: root.querySelector('#eNeeds').value,
      owner: root.querySelector('#eOwner').value || null,
      sort_order: Number.isFinite(rank) ? rank : item.sort_order,
    }).eq('id', item.id);
    if (error) { alertInline(root, error.message); return; }
    closePanel();
    load();
  };

  root.querySelector('#delItem').onclick = async () => {
    const btn = root.querySelector('#delItem');
    if (btn.dataset.armed !== '1') {
      btn.dataset.armed = '1';
      btn.textContent = 'Click again to delete';
      return;
    }
    await db.from('items').delete().eq('id', item.id);
    closePanel();
    load();
  };
}

function alertInline(root, msg) {
  const p = document.createElement('p');
  p.className = 'err';
  p.textContent = msg;
  root.querySelector('.panel-body').prepend(p);
}

/* ---------------- new item ---------------- */

function newItem() {
  const old = document.getElementById('panelRoot');
  if (old) old.remove();
  const root = document.createElement('div');
  root.id = 'panelRoot';
  root.innerHTML = `
    <div class="scrim" id="scrim"></div>
    <aside class="panel" role="dialog" aria-label="New item">
      <div class="panel-head"><h2>New item</h2>
        <button class="btn btn-sm btn-onnavy" id="closePanel" style="margin-left:auto">Close</button></div>
      <div class="panel-body"><div class="form">
        <label class="f">Title<input type="text" id="nTitle" placeholder="What are we building?"></label>
        <label class="f">Summary<textarea id="nSummary"></textarea></label>
        <div class="frow">
          <label class="f">Tier<select id="nTier">${TIERS.map((t) => `<option value="${t.id}">${t.name}</option>`).join('')}</select></label>
          <label class="f">Size<select id="nSize">${Object.entries(SIZES).map(([k, v]) => `<option value="${k}" ${k === 'unsized' ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
          <label class="f">Owner<select id="nOwner"><option value="">Unassigned</option>${OWNERS.map((o) => `<option value="${o}">${o}</option>`).join('')}</select></label>
        </div>
        <div class="actions"><button class="btn btn-primary" id="createItem">Add item</button></div>
      </div></div>
    </aside>`;
  document.body.appendChild(root);
  root.querySelector('#scrim').onclick = closePanel;
  root.querySelector('#closePanel').onclick = closePanel;
  root.querySelector('#createItem').onclick = async () => {
    const title = root.querySelector('#nTitle').value.trim();
    if (!title) return;
    const tier = root.querySelector('#nTier').value;
    const last = state.items.filter((i) => i.tier === tier).length;
    const { error } = await db.from('items').insert({
      title, summary: root.querySelector('#nSummary').value,
      tier, size: root.querySelector('#nSize').value,
      owner: root.querySelector('#nOwner').value || null,
      sort_order: last + 1,
    });
    if (error) { alertInline(root, error.message); return; }
    closePanel();
    load();
  };
}

/* ---------------- boot ---------------- */

document.getElementById('signOutBtn').onclick = async () => { await db.auth.signOut(); };
document.getElementById('newItemBtn').onclick = newItem;
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanel(); });

db.auth.onAuthStateChange((_evt, session) => {
  if (session && session.user) {
    if (!session.user.email.endsWith(ALLOWED_DOMAIN)) {
      db.auth.signOut();
      renderGate(`${session.user.email} is not an Undergrads account.`, true);
      return;
    }
    state.user = session.user;
    load();
  } else {
    state.user = null;
    renderGate('');
  }
});

db.auth.getSession().then(({ data }) => {
  if (!data.session) renderGate('');
});
