/* MPH.assistant: Saud, Klaket's assistant, in a side panel. It's an agent-native app (agent/) shown in an iframe.
     open    signs the user in to the assistant with their Klaket session (POST <agentUrl>/api/mph/session, which
             checks the token with Supabase and sets the assistant's own cookie), then loads its chat.
     bridge  agent-native's browser-session bridge (js/vendor/agent-native-host.js): this page registers itself with
             the assistant's server, so the agent can read where the user is (production, tab) and ask this page to
             navigate or refresh. It runs here, not in the iframe, so it keeps working while the panel is closed.
   Hidden unless MPH_CONFIG.agentUrl is set; on localhost it also needs ?db=local, since the local assistant talks to
   the local Supabase stack. */
(function () {
  const cfg = window.MPH_CONFIG || {};
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const enabled = () => !!cfg.agentUrl && !!window.AgentNativeHost && (!local || !!cfg.localDb) && !!MPH.session;
  let panel = null, frame = null, bridge = null, signedInAs = null;

  const tabId = (() => { try { return sessionStorage.getItem('mph.assistant.tab') || (sessionStorage.setItem('mph.assistant.tab', crypto.randomUUID()), sessionStorage.getItem('mph.assistant.tab')); } catch (e) { return crypto.randomUUID(); } })();

  async function signIn() {
    const { data } = await MPH.sb.auth.getSession();
    const token = data && data.session && data.session.access_token;
    if (!token) throw new Error('Sign in to Klaket first.');
    const res = await fetch(`${cfg.agentUrl}/api/mph/session`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ access_token: token }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.error || `The assistant didn't accept the sign-in (${res.status}).`);
    signedInAs = data.session.user.id;
  }

  // what the assistant sees about this page
  function context() {
    const r = MPH.route();
    const s = MPH.session || {};
    const prod = r.section === 'p' ? { type: 'production', id: r.productionId, name: (document.querySelector('.crumbs .here') || {}).textContent || undefined } : undefined;
    return {
      url: location.href,
      title: document.title,
      route: { name: r.section === 'p' ? `production.${r.view}` : r.section, pathname: location.hash.replace(/^#/, ''), params: r.section === 'p' ? { productionId: r.productionId, tab: r.view } : {} },
      resource: prod,
      user: s.user ? { id: s.user.id, email: s.user.email, name: (s.profile && s.profile.full_name) || undefined } : undefined,
      organization: s.org ? { id: s.org.id, name: s.org.name } : undefined,
      data: { app: 'Klaket', tabs: ['overview', 'brief', 'concepts', 'script', 'treatment'], hashFormat: 'p.<production id>.<tab>' },
    };
  }

  const goTo = (payload) => {
    const p = payload || {};
    const hash = p.hash || (p.productionId ? `p.${p.productionId}.${p.tab || 'overview'}` : p.path);
    if (!hash) throw new Error('Say where to go: { hash: "p.<production id>.<tab>" }');
    MPH.go(String(hash).replace(/^#/, ''));
    return { ok: true, hash };
  };

  function startBridge() {
    if (bridge) bridge.stop();
    bridge = window.AgentNativeHost.createAgentNativeBrowserSessionBridge({
      endpoint: `${cfg.agentUrl}/_agent-native/browser-sessions`, // sent with the assistant's cookie (credentials: include)
      session: { id: tabId, label: 'Klaket' },
      label: 'Klaket',
      getContext: context,
      commands: {
        navigate: (req) => goTo(req.payload),
        openResource: (req) => goTo(req.payload),
        'open-resource': (req) => goTo(req.payload),
        refreshData: () => MPH.refresh(),
        'refresh-data': () => MPH.refresh(),
      },
      // live actions on this tab (the assistant runs them with run-browser-session-action)
      actions: [{
        name: 'open-production-tab',
        description: 'Show the user a production in Klaket: tab is overview, brief, concepts (ideas), script or treatment.',
        schema: { type: 'object', properties: { production_id: { type: 'string' }, tab: { type: 'string', enum: ['overview', 'brief', 'concepts', 'script', 'treatment'] } }, required: ['production_id'] },
        run: ({ production_id, tab }) => goTo({ productionId: production_id, tab }),
      }],
    }).start();
  }

  function build() {
    panel = document.createElement('aside');
    panel.className = 'assistant-panel';
    panel.setAttribute('aria-label', 'Saud, Klaket assistant');
    panel.innerHTML = `
      <div class="assistant-head">
        <span class="assistant-title">${MPH.ui ? MPH.ui.icon('sparkles') : ''}Saud</span>
        <span class="spacer"></span>
        <a class="btn btn-sm btn-ghost" target="_blank" rel="noopener" href="${cfg.agentUrl}/chat" title="Open in a new tab">${MPH.ui ? MPH.ui.icon('external-link') : '↗'}</a>
        <button class="btn btn-sm btn-ghost" data-assistant-close title="Close">${MPH.ui ? MPH.ui.icon('x') : '✕'}</button>
      </div>
      <div class="assistant-body"><div class="assistant-msg muted small">Connecting…</div></div>`;
    document.body.appendChild(panel);
    panel.querySelector('[data-assistant-close]').addEventListener('click', close);
    if (window.lucide) window.lucide.createIcons();
  }

  async function open() {
    if (!enabled()) return;
    if (!panel) build();
    document.body.classList.add('assistant-open');
    panel.hidden = false;
    const body = panel.querySelector('.assistant-body');
    const me = MPH.session && MPH.session.user && MPH.session.user.id;
    if (frame && signedInAs === me) return;
    try {
      await signIn();
      body.innerHTML = '';
      frame = document.createElement('iframe');
      frame.className = 'assistant-frame';
      frame.title = 'Saud, Klaket assistant';
      frame.allow = 'clipboard-read; clipboard-write; microphone';
      frame.src = `${cfg.agentUrl}/chat`;
      body.appendChild(frame);
      startBridge();
    } catch (err) {
      body.innerHTML = `<div class="assistant-msg">${MPH.ui ? MPH.ui.errorBox(err.message) : err.message}<p class="small muted">Is the assistant running? <code>cd agent && pnpm dev</code></p><button class="btn btn-sm btn-outline" data-assistant-retry>Try again</button></div>`;
      body.querySelector('[data-assistant-retry]').addEventListener('click', () => { frame = null; open(); });
      if (window.lucide) window.lucide.createIcons();
    }
  }

  function close() {
    if (panel) panel.hidden = true;
    document.body.classList.remove('assistant-open');
  }

  const toggle = () => (panel && !panel.hidden ? close() : open());

  // a different Klaket user signing in must not inherit the previous one's assistant
  if (MPH.sb) MPH.sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
      if (bridge) bridge.stop();
      bridge = null; signedInAs = null;
      if (frame) frame.remove();
      frame = null; close();
    }
  });

  MPH.assistant = { enabled, open, close, toggle };
})();
