const API_BASE = "http://127.0.0.1:8000";
const FETCH_TIMEOUT_MS = 10_000;
const DRAFT_ANCHOR = "data-mailmind-ai-draft";
const ANCHOR_THREAD = "thread";
const ANCHOR_COMPOSE = "compose";
const COMPOSE_FAB_ID = "mailmind-compose-fab";
const PERSONA_KEY = "mailmindPersona";
const WELCOME_KEY = "mailmind_fab_welcome_dismissed";
const STYLES_ID = "mailmind-injected-ui-styles";
const DEFAULT_BTN = "✨ AI Draft";
const LOADING_LBL = "Generating...";

const prefersReducedMotion = () => {
  try {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {
    return false;
  }
};

let draftFlowInProgress = false;
let fabResizeHandler = null;

function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(null, args), delay);
  };
}

function getMain() {
  return document.querySelector('div[role="main"]');
}

function loadPersona() {
  return new Promise((resolve) => {
    const end = (payload) => {
      try {
        resolve(payload);
      } catch (e) {
        /* */
      }
    };
    const ok = (p, stale) => end({ persona: p || null, staleExtension: !!stale });
    try {
      if (typeof chrome === "undefined") {
        ok(null, true);
        return;
      }
      const st = chrome.storage;
      if (!st || !st.local || typeof st.local.get !== "function") {
        ok(null, true);
        return;
      }
      st.local.get([PERSONA_KEY], (r) => {
        let lastErr = null;
        try {
          if (chrome.runtime) lastErr = chrome.runtime.lastError;
        } catch (e) {
          ok(null, true);
          return;
        }
        if (lastErr) {
          const m = (lastErr.message && String(lastErr.message)) || "";
          if (
            /Extension context invalidated|context invalidated|message port closed|invalidated/i.test(
              m
            )
          ) {
            ok(null, true);
            return;
          }
          ok(null, false);
          return;
        }
        try {
          ok((r && r[PERSONA_KEY]) || null, false);
        } catch (e) {
          ok(null, true);
        }
      });
    } catch (e) {
      ok(null, true);
    }
  }).catch(() => ({ persona: null, staleExtension: true }));
}

function isPersonaConfigured(p) {
  return !!(p && String(p.fullName || "").trim());
}

function getWelcomeDismissed(cb) {
  try {
    if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) {
      cb(true);
      return;
    }
    chrome.storage.local.get([WELCOME_KEY], (r) => {
      try {
        if (chrome.runtime && chrome.runtime.lastError) {
          cb(true);
          return;
        }
        cb(!!(r && r[WELCOME_KEY]));
      } catch (e) {
        cb(true);
      }
    });
  } catch (e) {
    cb(true);
  }
}

function setWelcomeDismissed() {
  try {
    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [WELCOME_KEY]: 1 });
    }
  } catch (e) {
    /* */
  }
}

function extractLatestEmailText() {
  const main = getMain();
  if (!main) return "";

  const list = main.querySelector('div[role="list"]');
  if (list) {
    const items = list.querySelectorAll('div[role="listitem"]');
    if (items.length) {
      const last = items[items.length - 1];
      const body =
        last.querySelector(".a3s") ||
        last.querySelector('div[data-message-id]') ||
        last.querySelector('div[dir="ltr"]') ||
        last;
      const text = (body && body.innerText) || "";
      if (text.trim()) return text.trim();
    }
  }

  const a3sNodes = main.querySelectorAll(".a3s");
  if (a3sNodes.length) {
    const lastA = a3sNodes[a3sNodes.length - 1];
    const t = (lastA.innerText || "").trim();
    if (t) return t;
  }

  return (main.innerText || "").trim();
}

function isVisible(el) {
  if (!el) return false;
  const s = getComputedStyle(el);
  if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0")
    return false;
  return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

function findComposeBox() {
  const main = getMain() || document.body;
  const labeled = main.querySelector(
    'div[aria-label="Message Body"][contenteditable="true"], div[aria-label="Message body"][contenteditable="true"]'
  );
  if (labeled && isVisible(labeled)) return labeled;

  const candidates = main.querySelectorAll(
    'div[contenteditable="true"][role="textbox"], div[contenteditable="true"][g_editable="true"]'
  );
  for (let i = candidates.length - 1; i >= 0; i--) {
    if (isVisible(candidates[i])) return candidates[i];
  }

  const any = main.querySelectorAll('div[contenteditable="true"]');
  for (let i = any.length - 1; i >= 0; i--) {
    if (isVisible(any[i])) return any[i];
  }
  return null;
}

function setComposeText(el, text) {
  el.focus();
  if (document.execCommand) {
    const sel = window.getSelection();
    if (sel && sel.removeAllRanges) {
      const range = document.createRange();
      range.selectNodeContents(el);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }
  el.textContent = "";
  if (document.execCommand("insertText", false, text) === true) {
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }
  el.innerText = text;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function findReplyButtonInMain(main) {
  for (const b of main.querySelectorAll('div[role="button"]')) {
    const al = (b.getAttribute("aria-label") || "").toLowerCase();
    if (al === "reply" || al === "reply all" || (al.startsWith("reply") && al.length < 32))
      return b;
  }
  return null;
}

/* --- Injected premium UI (toasts, dialog, fab) --- */

function ensureInjectedStyles() {
  if (document.getElementById(STYLES_ID)) return;
  const s = document.createElement("style");
  s.id = STYLES_ID;
  s.textContent = `
    :root { --mm-ease: cubic-bezier(0.2, 0.8, 0.2, 1); }
    @media (prefers-reduced-motion: reduce) {
      .mm-anim, .mm-toast, .mm-fab-btn, .mm-fab-label { transition: none !important; animation: none !important; }
    }
    #mailmind-toast-host {
      position: fixed; z-index: 2147483640; right: 16px; top: 16px;
      display: flex; flex-direction: column; align-items: flex-end; gap: 10px;
      pointer-events: none; max-width: min(400px, calc(100vw - 32px));
    }
    .mm-toast {
      pointer-events: auto;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      font-size: 13px; line-height: 1.4; padding: 12px 16px; border-radius: 12px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.06) inset;
      background: linear-gradient(165deg, rgba(32,35,45,0.95) 0%, rgba(18,20,28,0.98) 100%);
      color: #e8eaed; border: 1px solid rgba(255,255,255,0.1);
      transform: translateX(8px); opacity: 0; transition: transform 0.3s var(--mm-ease), opacity 0.3s var(--mm-ease);
    }
    .mm-toast.mm-toast-on { transform: translateX(0); opacity: 1; }
    .mm-toast--success { border-color: rgba(66, 133, 244, 0.35); }
    .mm-toast--error { border-color: rgba(234, 67, 53, 0.4); }
    .mm-toast--info { border-color: rgba(255, 255, 255, 0.12); }
    .mm-toast-title { font-weight: 600; margin: 0 0 2px; font-size: 13px; }
    .mm-toast-body { margin: 0; opacity: 0.92; }

    .mm-ov {
      position: fixed; z-index: 2147483646; inset: 0;
      display: flex; align-items: center; justify-content: center;
      padding: 24px; background: rgba(5,8,20,0.55); backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }
    .mm-card {
      position: relative; z-index: 1; width: min(420px, 100%);
      max-height: min(88vh, 720px); overflow: auto; border-radius: 16px;
      background: linear-gradient(150deg, #1e222d 0%, #12151c 100%);
      color: #e8eaed; border: 1px solid rgba(255,255,255,0.08);
      box-shadow: 0 32px 64px -20px rgba(0,0,0,0.6);
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    }
    .mm-card__head { padding: 22px 24px 12px; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .mm-card__h { margin: 0; font-size: 18px; font-weight: 600; letter-spacing: -0.02em; }
    .mm-card__sub { margin: 6px 0 0; font-size: 13px; color: #9aa0a6; line-height: 1.45; }
    .mm-card__body { padding: 20px 24px 8px; }
    .mm-field { margin-bottom: 16px; }
    .mm-lbl { display: block; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #9aa0a6; margin-bottom: 6px; }
    .mm-input, .mm-sel, .mm-ta {
      width: 100%; box-sizing: border-box; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12);
      background: rgba(0,0,0,0.25); color: #e8eaed; font-size: 14px; padding: 10px 12px; outline: none;
    }
    .mm-input:focus, .mm-sel:focus, .mm-ta:focus {
      border-color: rgba(138, 180, 248, 0.55); box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.2);
    }
    .mm-ta { resize: vertical; min-height: 72px; }
    .mm-foot { display: flex; gap: 10px; justify-content: flex-end; padding: 12px 24px 20px; }
    .mm-btn { border-radius: 10px; font-size: 14px; font-weight: 600; padding: 10px 18px; cursor: pointer; border: none; font-family: inherit; }
    .mm-btn--ghost { background: rgba(255,255,255,0.08); color: #e8eaed; border: 1px solid rgba(255,255,255,0.1); }
    .mm-btn--ghost:hover { background: rgba(255,255,255,0.12); }
    .mm-btn--primary {
      color: #fff; background: linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%);
      box-shadow: 0 4px 16px rgba(29, 78, 216, 0.35);
    }
    .mm-btn--primary:hover { filter: brightness(1.06); }
    .mm-sel { cursor: pointer; }

    #mailmind-compose-fab {
      left: max(12px, env(safe-area-inset-left, 0px));
      right: auto !important;
      bottom: calc(96px + env(safe-area-inset-bottom, 0px));
      z-index: 999990; position: fixed; transition: opacity 0.2s var(--mm-ease);
    }
    #mailmind-compose-fab .mm-fab-btn {
      display: inline-flex; align-items: center; gap: 0; min-height: 40px; padding: 0 10px; border: none; cursor: pointer; border-radius: 999px;
      font-family: system-ui, -apple-system, Roboto, sans-serif; font-size: 13px; font-weight: 600;
      background: linear-gradient(180deg, #fafbfc 0%, #e8ebef 100%);
      color: #1a1a1a; box-shadow: 0 2px 12px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.08);
      opacity: 0.75; transition: opacity 0.2s, box-shadow 0.2s, transform 0.2s, gap 0.25s;
    }
    #mailmind-compose-fab .mm-fab-btn:hover, #mailmind-compose-fab .mm-fab-btn:focus-visible {
      opacity: 1; box-shadow: 0 4px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(66,133,244,0.35);
      transform: translateY(-1px); gap: 6px; outline: none;
    }
    #mailmind-compose-fab .mm-fab-icon { font-size: 16px; line-height: 1; padding: 0 2px; }
    #mailmind-compose-fab .mm-fab-label { max-width: 0; overflow: hidden; white-space: nowrap; transition: max-width 0.28s var(--mm-ease), opacity 0.2s; opacity: 0.85; }
    #mailmind-compose-fab .mm-fab-btn:hover .mm-fab-label,
    #mailmind-compose-fab .mm-fab-btn:focus-visible .mm-fab-label { max-width: 200px; opacity: 1; }
    .mm-fab--expanded .mm-fab-label { max-width: 200px; opacity: 1; }
    #mailmind-compose-fab .mm-fab-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    @media (max-width: 520px) { #mailmind-compose-fab .mm-fab-label { max-width: 200px; opacity: 1; } }
    @media (prefers-reduced-motion: reduce) {
      #mailmind-compose-fab .mm-fab-btn:hover { transform: none; }
    }

    .mm-welcome {
      position: absolute; bottom: calc(100% + 12px); left: 0; min-width: 240px; max-width: min(300px, 90vw);
      background: linear-gradient(165deg, #242830 0%, #16181f 100%); color: #e8eaed;
      border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 14px 16px; font-size: 13px;
      line-height: 1.45; font-family: system-ui, -apple-system, Roboto, sans-serif;
      box-shadow: 0 12px 40px rgba(0,0,0,0.35);
    }
    .mm-welcome strong { color: #fff; font-weight: 600; }
    .mm-welcome kbd { font: 11px ui-monospace, monospace; background: rgba(0,0,0,0.35); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.12); }
    .mm-welcome-actions { display: flex; justify-content: flex-end; margin-top: 10px; }
    .mm-welcome-btn { font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 8px; background: #3b82f6; color: #fff; border: none; cursor: pointer; }

    .mm-thread-btn { border: none; cursor: pointer; border-radius: 999px; font-family: system-ui, -apple-system, Roboto, sans-serif;
      font-size: 13px; font-weight: 600; padding: 8px 16px; color: #0d1117;
      background: linear-gradient(180deg, #fafbfc 0%, #e8ebef 100%);
      box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.08); }
    .mm-thread-btn:disabled { opacity: 0.5; }
  `;
  (document.documentElement || document.body).appendChild(s);
}

function getToastHost() {
  let h = document.getElementById("mailmind-toast-host");
  if (!h) {
    h = document.createElement("div");
    h.id = "mailmind-toast-host";
    h.setAttribute("role", "region");
    h.setAttribute("aria-label", "MailMind notifications");
    (document.body || document.documentElement).appendChild(h);
  }
  return h;
}

function showToast({ title, message, variant = "info", duration = 5000 }) {
  ensureInjectedStyles();
  const bodyText = (message && String(message)) || "";
  const titleText = (title && String(title)) || "";
  const t = document.createElement("div");
  t.className = "mm-toast mm-toast--" + (variant || "info");
  t.setAttribute("role", "status");
  if (bodyText) {
    t.innerHTML =
      (titleText ? '<p class="mm-toast-title"></p>' : "") + '<p class="mm-toast-body"></p>';
    if (titleText) t.querySelector(".mm-toast-title").textContent = titleText;
    t.querySelector(".mm-toast-body").textContent = bodyText;
  } else {
    t.innerHTML = titleText
      ? '<p class="mm-toast-title"></p>'
      : '<p class="mm-toast-body"></p>';
    const el = t.querySelector(".mm-toast-title, .mm-toast-body");
    if (el) el.textContent = titleText;
  }
  getToastHost().appendChild(t);
  requestAnimationFrame(() => t.classList.add("mm-toast-on"));
  const d = Math.min(12000, Math.max(2500, duration));
  setTimeout(() => {
    t.classList.remove("mm-toast-on");
    setTimeout(() => t.remove(), 280);
  }, d);
}

function positionComposeFab() {
  const fab = document.getElementById(COMPOSE_FAB_ID);
  if (!fab) return;
  const narrow = window.innerWidth < 520;
  const bottom = narrow ? 88 : 100;
  fab.style.bottom = "calc(" + bottom + "px + env(safe-area-inset-bottom, 0px))";
  fab.style.left = "max(12px, env(safe-area-inset-left, 0px))";
}

function injectWelcomeTooltip(fab, btn) {
  getWelcomeDismissed((dismissed) => {
    if (dismissed) return;
    if (!fab.isConnected) return;
    const tip = document.createElement("div");
    tip.className = "mm-welcome";
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || "");
    const mod = isMac ? "⌘" : "Ctrl";
    tip.innerHTML =
      "<strong>MailMind</strong> — Generating works best with your reply open. Keyboard: <kbd>" +
      mod +
      "</kbd> <kbd>Shift</kbd> <kbd>.</kbd><div class='mm-welcome-actions'><button type='button' class='mm-welcome-btn'>Got it</button></div>";
    const ok = tip.querySelector(".mm-welcome-btn");
    const remove = () => {
      setWelcomeDismissed();
      tip.remove();
    };
    ok.addEventListener("click", remove);
    fab.appendChild(tip);
    if (!prefersReducedMotion()) {
      setTimeout(() => {
        if (tip.isConnected) remove();
      }, 12000);
    }
  });
}

function injectThreadButton() {
  const main = getMain();
  if (!main) return;
  if (main.querySelector(`[${DRAFT_ANCHOR}="${ANCHOR_THREAD}"]`)) return;

  ensureInjectedStyles();
  const wrap = document.createElement("div");
  wrap.setAttribute(DRAFT_ANCHOR, ANCHOR_THREAD);
  Object.assign(wrap.style, {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    margin: "8px 0",
    padding: "0 4px",
  });

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "mm-thread-btn";
  btn.setAttribute("aria-label", "Open AI draft options to generate a reply with MailMind");
  btn.textContent = DEFAULT_BTN;
  wrap.appendChild(btn);
  const reply = findReplyButtonInMain(main);
  if (reply && reply.parentNode) {
    reply.parentNode.insertBefore(wrap, reply);
  } else {
    const h2 = main.querySelector("h2");
    if (h2 && h2.parentNode) h2.parentNode.insertBefore(wrap, h2.nextSibling);
    else main.insertBefore(wrap, main.firstChild);
  }

  btn.addEventListener("click", () => onDraftClick(btn));
}

function injectComposeFab() {
  const compose = findComposeBox();
  const existing = document.getElementById(COMPOSE_FAB_ID);
  if (!compose) {
    if (existing) {
      existing.remove();
      if (fabResizeHandler) {
        window.removeEventListener("resize", fabResizeHandler);
        fabResizeHandler = null;
      }
    }
    return;
  }
  if (existing) return;

  ensureInjectedStyles();
  const fab = document.createElement("div");
  fab.id = COMPOSE_FAB_ID;
  fab.setAttribute(DRAFT_ANCHOR, ANCHOR_COMPOSE);
  fab.setAttribute("role", "group");
  fab.setAttribute("aria-label", "MailMind AI draft for compose");
  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || "");
  const shortcutHint = isMac ? "⌘⇧ ." : "Ctrl+Shift+ .";
  fab.setAttribute("title", "AI Draft — " + shortcutHint);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "mm-fab-btn";
  const ariaShortcut = isMac
    ? "Command Shift Period"
    : "Control Shift Period";
  btn.setAttribute(
    "aria-label",
    "Generate AI email draft. Keyboard shortcut: " + ariaShortcut
  );
  btn.innerHTML =
    '<span class="mm-fab-icon" aria-hidden="true">✨</span><span class="mm-fab-label">AI Draft</span>';
  fab.appendChild(btn);
  (document.body || document.documentElement).appendChild(fab);
  positionComposeFab();
  if (!fabResizeHandler) {
    fabResizeHandler = debounce(() => positionComposeFab(), 150);
    window.addEventListener("resize", fabResizeHandler, { passive: true });
  }
  btn.addEventListener("click", () => onDraftClick(btn));
  injectWelcomeTooltip(fab, btn);
}

function personaForApi(p) {
  if (!p) return null;
  return {
    fullName: (p.fullName || "").trim() || null,
    position: (p.position || "").trim() || null,
    businessName: (p.businessName || "").trim() || null,
    contactInfo: (p.contactInfo || "").trim() || null,
    tone: (p.tone || "").trim() || null,
    instructions: (p.instructions || "").trim() || null,
  };
}

function showIntentDialog() {
  return new Promise((resolve) => {
    if (document.getElementById("mailmind-intent-overlay")) {
      showToast({ title: "Dialog open", message: "Finish or cancel the open prompt first.", variant: "info", duration: 3200 });
      resolve(null);
      return;
    }
    ensureInjectedStyles();
    const ov = document.createElement("div");
    ov.id = "mailmind-intent-overlay";
    ov.className = "mm-ov";
    ov.setAttribute("role", "dialog");
    ov.setAttribute("aria-modal", "true");
    ov.setAttribute("aria-labelledby", "mm-dlg-title");

    const box = document.createElement("div");
    box.className = "mm-card";
    box.innerHTML = `
      <div class="mm-card__head">
        <h2 id="mm-dlg-title" class="mm-card__h">Shape your reply</h2>
        <p class="mm-card__sub">We’ll use the last message in the thread, your persona, and these options.</p>
      </div>
      <div class="mm-card__body">
        <div class="mm-field">
          <label class="mm-lbl" for="mm-intent">Response direction</label>
          <select id="mm-intent" class="mm-sel">
            <option value="auto">Let the AI pick the best reply</option>
            <option value="decline_service">Decline the offer (polite)</option>
            <option value="enquire">Enquire or ask for more</option>
            <option value="refund">Refund or billing</option>
            <option value="custom">Custom (notes only)</option>
          </select>
        </div>
        <div class="mm-field">
          <label class="mm-lbl" for="mm-length">Length</label>
          <select id="mm-length" class="mm-sel">
            <option value="short">Short</option>
            <option value="medium" selected>Medium</option>
            <option value="long">Long</option>
          </select>
        </div>
        <div class="mm-field">
          <label class="mm-lbl" for="mm-extra">Extra notes (optional)</label>
          <textarea id="mm-extra" class="mm-ta" rows="3" placeholder="e.g. we already have a provider — keep it brief."></textarea>
        </div>
      </div>
      <div class="mm-foot">
        <button type="button" class="mm-btn mm-btn--ghost" id="mm-cancel">Cancel</button>
        <button type="button" class="mm-btn mm-btn--primary" id="mm-ok">Generate</button>
      </div>
    `;
    ov.appendChild(box);
    const host = document.documentElement || document.body;
    host.appendChild(ov);

    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cleanup(null);
        document.removeEventListener("keydown", onKey, true);
      }
    };
    document.addEventListener("keydown", onKey, true);

    const firstFocus = box.querySelector("#mm-intent");
    if (firstFocus && firstFocus.focus) {
      setTimeout(() => {
        try {
          firstFocus.focus();
        } catch (e) {
          /* */
        }
      }, 0);
    }

    const cleanup = (v) => {
      document.removeEventListener("keydown", onKey, true);
      ov.remove();
      resolve(v);
    };

    box.querySelector("#mm-cancel").addEventListener("click", () => cleanup(null));
    ov.addEventListener("click", (e) => {
      if (e.target === ov) cleanup(null);
    });
    box.querySelector("#mm-ok").addEventListener("click", () => {
      const intent = (box.querySelector("#mm-intent") || {}).value || "auto";
      const responseLength =
        (box.querySelector("#mm-length") && box.querySelector("#mm-length").value) || "medium";
      const extra = (box.querySelector("#mm-extra") && box.querySelector("#mm-extra").value) || "";
      if (intent === "custom" && !String(extra).trim()) {
        showToast({
          title: "Add details",
          message: "For Custom, add a short note in Extra notes, or change the response direction.",
          variant: "error",
          duration: 5500,
        });
        return;
      }
      cleanup({
        intent,
        responseLength: ["short", "medium", "long"].includes(responseLength)
          ? responseLength
          : "medium",
        extraInstructions: String(extra).trim() || null,
      });
    });
  });
}

function resetAllDraftButtons() {
  const sel = document.querySelectorAll(
    `.mm-thread-btn, #${COMPOSE_FAB_ID} .mm-fab-btn, [${DRAFT_ANCHOR}="compose"] .mm-fab-btn`
  );
  sel.forEach((b) => {
    b.disabled = false;
    b.classList.remove("mm-fab--expanded");
    if (b.classList.contains("mm-fab-btn")) {
      b.innerHTML =
        '<span class="mm-fab-icon" aria-hidden="true">✨</span><span class="mm-fab-label">AI Draft</span>';
    } else {
      b.textContent = DEFAULT_BTN;
    }
  });
}

function setMainButtonsLoading(loading) {
  document
    .querySelectorAll(`.mm-thread-btn, #${COMPOSE_FAB_ID} .mm-fab-btn`)
    .forEach((b) => {
      b.disabled = loading;
      if (b.classList.contains("mm-fab-btn")) {
        b.classList.toggle("mm-fab--expanded", loading);
        b.innerHTML =
          '<span class="mm-fab-icon" aria-hidden="true">✨</span><span class="mm-fab-label">' +
          (loading ? LOADING_LBL : "AI Draft") +
          "</span>";
      } else b.textContent = loading ? LOADING_LBL : DEFAULT_BTN;
    });
}

function onDraftClick(btn) {
  if (draftFlowInProgress) {
    showToast({ title: "One moment", message: "A draft is already in progress.", variant: "info", duration: 2800 });
    return;
  }
  draftFlowInProgress = true;
  (async () => {
    let abortTimer = null;
    const finishFlow = () => {
      if (abortTimer != null) {
        clearTimeout(abortTimer);
        abortTimer = null;
      }
      resetAllDraftButtons();
      draftFlowInProgress = false;
    };
    try {
      const compose0 = findComposeBox();
      if (!compose0) {
        showToast({
          title: "Reply not open",
          message: "Open Reply or a new message first, then use AI Draft.",
          variant: "error",
        });
        return;
      }

      let persona;
      let staleExtension = true;
      try {
        const out = await loadPersona();
        persona = out.persona;
        staleExtension = !!out.staleExtension;
      } catch (e) {
        staleExtension = true;
        persona = null;
      }
      if (staleExtension) {
        showToast({
          title: "Extension reloaded",
          message: "Refresh this Gmail page (F5 or ⌘R), then try AI Draft again.",
          variant: "error",
          duration: 7000,
        });
        return;
      }
      if (!isPersonaConfigured(persona)) {
        showToast({
          title: "Set up your persona",
          message: "Open the MailMind icon in the toolbar, add your name, and Save.",
          variant: "info",
          duration: 6500,
        });
        return;
      }

      const text = extractLatestEmailText();
      if (!text) {
        showToast({
          title: "No email text",
          message: "Open a conversation, then try again.",
          variant: "error",
        });
        return;
      }

      const plan = await showIntentDialog();
      if (!plan) {
        return;
      }

      const ac = new AbortController();
      abortTimer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
      if (btn) setMainButtonsLoading(true);

      const bodyPayload = {
        email: text,
        persona: personaForApi(persona),
        intent: plan.intent,
        responseLength: plan.responseLength || "medium",
        extraInstructions: plan.extraInstructions,
      };

      const r = await fetch(`${API_BASE}/generate`, {
        method: "POST",
        signal: ac.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });
      if (!r.ok) {
        showToast({
          title: "Request failed",
          message: "Check the server and your API key, then try again.",
          variant: "error",
        });
        return;
      }
      const data = await r.json();
      const replyText = (data && data.reply) || "";
      if (typeof replyText !== "string" || !replyText.trim()) {
        showToast({ title: "No reply", message: "The server did not return text.", variant: "error" });
        return;
      }
      const box = findComposeBox();
      if (!box) {
        showToast({
          title: "Compose closed",
          message: "The reply area closed. Open Reply again, then use AI Draft.",
          variant: "error",
        });
        return;
      }
      setComposeText(box, replyText.trim());
      showToast({ title: "Draft inserted", message: "Review and edit before sending.", variant: "success", duration: 4000 });
    } catch (e) {
      if (e && e.name === "AbortError")
        showToast({ title: "Timed out", message: "Try again in a moment.", variant: "error" });
      else
        showToast({
          title: "Something went wrong",
          message: "Is the backend running on port 8000?",
          variant: "error",
        });
    } finally {
      finishFlow();
    }
  })();
}

const tryInject = debounce(() => {
  try {
    injectThreadButton();
    injectComposeFab();
  } catch (e) {
    /* ignore; Gmail DOM in flux */
  }
}, 400);

// Fallback: same combo as the extension command (useful in some focus/iframe cases).
function installDraftShortcut() {
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.isComposing || e.repeat) return;
      if (!e.shiftKey) return;
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key !== "." && e.key !== "．" && e.code !== "Period") return;
      if (!findComposeBox()) return;
      e.preventDefault();
      e.stopPropagation();
      const b = document.querySelector(`#${COMPOSE_FAB_ID} .mm-fab-btn`);
      onDraftClick(b);
    },
    true
  );
}

try {
  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg && msg.type === "mailmind-ai-draft") {
        if (findComposeBox()) {
          const b = document.querySelector(`#${COMPOSE_FAB_ID} .mm-fab-btn`) || null;
          onDraftClick(b);
        } else {
          showToast({
            title: "No compose open",
            message: "Open a reply, then use the shortcut or the ✨ control.",
            variant: "info",
            duration: 5000,
          });
        }
        if (sendResponse) sendResponse({ ok: true });
        return true;
      }
    });
  }
} catch (e) {
  /* */
}

function startObserver() {
  const root = document.body || document.documentElement;
  if (!root) {
    document.addEventListener("DOMContentLoaded", startObserver, { once: true });
    return;
  }
  tryInject();
  const mo = new MutationObserver(tryInject);
  mo.observe(root, { childList: true, subtree: true });
  installDraftShortcut();
}

startObserver();
