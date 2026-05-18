// LeadPing Widget — Vanilla TS, no React, no external deps
// Injected into customer sites via <script data-token="..." src="widget.js">

// ─── Types ────────────────────────────────────────────────────────────────────

interface WidgetConfig {
  primaryColor:   string;
  welcomeMessage: string;
  logoUrl:        string | null;
  tenantName:     string;
  sector:         string;
  isActive:       boolean;
  skills:         string[];
  skillsConfig:   Record<string, unknown>;
}

interface Message {
  role:    "user" | "assistant" | "lead-card";
  content: string;
  leadData?: LeadCardData;
}

interface LeadCardData {
  name:       string;
  email?:     string;
  phone?:     string;
  summary?:   string;
  urgency?:   string;
  score?:     number;
  sectorData?: Record<string, unknown>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const KVKK_PREFIX    = "lp_kvkk_";
const SESSION_KEY    = "lp_session";

// ─── Styles ───────────────────────────────────────────────────────────────────

const STYLES = `
  :host { all: initial; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

  /* ── Trigger button ── */
  .lp-btn {
    position: fixed; bottom: 24px; right: 24px;
    width: 56px; height: 56px; border-radius: 50%;
    border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 16px rgba(0,0,0,.22);
    transition: transform .15s, box-shadow .15s;
    z-index: 2147483647;
  }
  .lp-btn:hover { transform: scale(1.06); box-shadow: 0 6px 22px rgba(0,0,0,.28); }
  .lp-btn svg { width: 26px; height: 26px; pointer-events: none; }

  /* ── Panel ── */
  .lp-panel {
    position: fixed; bottom: 96px; right: 24px;
    width: 300px; height: 440px;
    background: #fff; border-radius: 16px;
    box-shadow: 0 8px 40px rgba(0,0,0,.14);
    display: flex; flex-direction: column;
    overflow: hidden;
    z-index: 2147483647;
    animation: lp-in .18s ease;
  }
  @keyframes lp-in {
    from { opacity: 0; transform: translateY(10px) scale(.97); }
    to   { opacity: 1; transform: translateY(0)    scale(1);   }
  }

  /* ── Header ── */
  .lp-header {
    padding: 13px 14px;
    display: flex; align-items: center; justify-content: space-between;
    flex-shrink: 0;
  }
  .lp-header-title {
    display: flex; align-items: center; gap: 8px;
    color: #fff; font-size: 13px; font-weight: 600; min-width: 0;
  }
  .lp-logo {
    width: 26px; height: 26px; border-radius: 50%;
    object-fit: cover; border: 1px solid rgba(255,255,255,.3); flex-shrink: 0;
  }
  .lp-logo-placeholder {
    width: 26px; height: 26px; border-radius: 50%;
    background: rgba(255,255,255,.25);
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; font-weight: 700; color: #fff; flex-shrink: 0;
  }
  .lp-tenant-name { truncate: ellipsis; overflow: hidden; white-space: nowrap; }
  .lp-close {
    background: none; border: none; color: rgba(255,255,255,.75);
    cursor: pointer; font-size: 22px; line-height: 1;
    padding: 0 2px; flex-shrink: 0;
  }
  .lp-close:hover { color: #fff; }

  /* ── Body ── */
  .lp-body { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }

  /* ── KVKK ── */
  .lp-kvkk {
    flex: 1; display: flex; flex-direction: column;
    justify-content: center; padding: 28px 20px; gap: 14px;
  }
  .lp-kvkk-title  { font-size: 14px; font-weight: 600; color: #18181b; margin: 0; }
  .lp-kvkk-text   { font-size: 12px; color: #71717a; line-height: 1.65; margin: 0; }
  .lp-kvkk-btn {
    padding: 10px 16px; border-radius: 8px; border: none;
    background: #18181b; color: #fff; font-size: 13px; font-weight: 500;
    cursor: pointer; font-family: inherit; margin-top: 4px;
  }
  .lp-kvkk-btn:hover { background: #27272a; }

  /* ── Messages ── */
  .lp-messages {
    flex: 1; overflow-y: auto; padding: 14px 14px 6px;
    display: flex; flex-direction: column; gap: 8px; min-height: 0;
  }
  .lp-messages::-webkit-scrollbar { width: 3px; }
  .lp-messages::-webkit-scrollbar-thumb { background: #e4e4e7; border-radius: 2px; }

  .lp-msg         { display: flex; }
  .lp-msg--user   { justify-content: flex-end; }
  .lp-msg--bot    { justify-content: flex-start; }
  .lp-bubble {
    max-width: 82%; padding: 8px 11px; border-radius: 12px;
    font-size: 13px; line-height: 1.5;
    white-space: pre-wrap; word-break: break-word;
  }
  .lp-msg--user .lp-bubble { background: #18181b; color: #fff; border-bottom-right-radius: 3px; }
  .lp-msg--bot  .lp-bubble { background: #f4f4f5; color: #18181b; border-bottom-left-radius: 3px; }
  .lp-bubble--typing { color: #a1a1aa; letter-spacing: 2px; }

  /* ── Lead card ── */
  .lp-lead-card {
    background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px;
    padding: 10px 12px; font-size: 13px; max-width: 90%;
  }
  .lp-lead-card-title {
    font-weight: 600; color: #15803d; font-size: 12px;
    display: flex; align-items: center; gap: 5px; margin-bottom: 8px;
  }
  .lp-lead-card-row {
    display: flex; justify-content: space-between; gap: 8px;
    color: #374151; font-size: 12px; padding: 2px 0;
  }
  .lp-lead-card-label { color: #6b7280; flex-shrink: 0; }
  .lp-lead-card-value { font-weight: 500; text-align: right; }
  .lp-urgency-LOW  { color: #6b7280; }
  .lp-urgency-MED  { color: #d97706; }
  .lp-urgency-HIGH { color: #dc2626; }

  /* ── Input row ── */
  .lp-input-row {
    display: flex; gap: 7px; padding: 10px 14px;
    border-top: 1px solid #f4f4f5; flex-shrink: 0;
  }
  .lp-input {
    flex: 1; padding: 8px 11px; border-radius: 8px;
    border: 1px solid #e4e4e7; font-size: 13px; outline: none;
    font-family: inherit; background: #fff; color: #18181b;
    min-width: 0;
  }
  .lp-input:focus   { border-color: #a1a1aa; }
  .lp-input:disabled { background: #fafafa; color: #a1a1aa; }
  .lp-send {
    padding: 8px 13px; border-radius: 8px; border: none;
    background: #18181b; color: #fff; font-size: 15px; font-weight: 500;
    cursor: pointer; font-family: inherit; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .lp-send:hover:not(:disabled) { background: #27272a; }
  .lp-send:disabled { background: #d4d4d8; cursor: default; }
`;

// ─── LeadPingWidget ───────────────────────────────────────────────────────────

class LeadPingWidget {
  private readonly token:     string;
  private readonly apiUrl:    string;
  private readonly sessionId: string;

  private config:    WidgetConfig | null = null;
  private host:      HTMLElement;
  private shadow:    ShadowRoot;
  private isOpen     = false;
  private isLoading  = false;
  private messages:  Message[] = [];

  constructor(token: string, apiUrl: string) {
    this.token     = token;
    this.apiUrl    = apiUrl;
    this.sessionId = this.getOrCreateSession();

    // Shadow DOM
    this.host   = document.createElement("div");
    this.host.setAttribute("data-leadping", "true");
    this.shadow = this.host.attachShadow({ mode: "open" });
    document.body.appendChild(this.host);

    this.fetchConfig();
  }

  // ── Init ────────────────────────────────────────────────────────────────────

  private async fetchConfig(): Promise<void> {
    try {
      const res = await fetch(`${this.apiUrl}/api/widget/config/${this.token}`);
      if (!res.ok) return;
      this.config = await res.json() as WidgetConfig;
      if (!this.config.isActive) return;
      this.renderButton();
    } catch {
      // Silently fail — widget not visible
    }
  }

  private getOrCreateSession(): string {
    try {
      let id = sessionStorage.getItem(SESSION_KEY);
      if (!id) {
        id = Math.random().toString(36).slice(2) + Date.now().toString(36);
        sessionStorage.setItem(SESSION_KEY, id);
      }
      return id;
    } catch {
      return Math.random().toString(36).slice(2);
    }
  }

  // ── Render: Button ──────────────────────────────────────────────────────────

  private renderButton(): void {
    if (!this.config) return;
    const { primaryColor } = this.config;

    this.shadow.innerHTML = `
      <style>${STYLES}</style>
      <button class="lp-btn" id="lp-btn"
        style="background:${esc(primaryColor)}"
        aria-label="Yardım al">
        <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>
      </button>
    `;

    this.shadow.getElementById("lp-btn")
      ?.addEventListener("click", () => this.openChat());
  }

  // ── Open / Close ────────────────────────────────────────────────────────────

  openChat(): void {
    if (this.isOpen || !this.config) return;
    this.isOpen = true;
    this.renderPanel();
  }

  private closeChat(): void {
    this.isOpen = false;
    this.renderButton();
  }

  // ── Render: Panel ───────────────────────────────────────────────────────────

  private renderPanel(): void {
    if (!this.config) return;
    const { primaryColor, tenantName, logoUrl } = this.config;
    const kvkkAccepted = this.isKvkkAccepted();

    const logoHtml = logoUrl
      ? `<img class="lp-logo" src="${esc(logoUrl)}" alt="" />`
      : `<div class="lp-logo-placeholder">${esc(tenantName.slice(0, 2).toUpperCase())}</div>`;

    this.shadow.innerHTML = `
      <style>${STYLES}</style>

      <button class="lp-btn" id="lp-btn"
        style="background:${esc(primaryColor)}"
        aria-label="Kapat">
        <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>

      <div class="lp-panel">
        <div class="lp-header" style="background:${esc(primaryColor)}">
          <div class="lp-header-title">
            ${logoHtml}
            <span class="lp-tenant-name">${esc(tenantName)}</span>
          </div>
          <button class="lp-close" id="lp-close" aria-label="Kapat">×</button>
        </div>
        <div class="lp-body" id="lp-body">
          ${kvkkAccepted ? this.chatHTML() : this.kvkkHTML()}
        </div>
      </div>
    `;

    this.shadow.getElementById("lp-btn")
      ?.addEventListener("click", () => this.closeChat());
    this.shadow.getElementById("lp-close")
      ?.addEventListener("click", () => this.closeChat());

    if (kvkkAccepted) {
      this.bindChatEvents();
      this.scrollToBottom();
    } else {
      this.bindKvkkEvents();
    }
  }

  // ── KVKK ────────────────────────────────────────────────────────────────────

  private isKvkkAccepted(): boolean {
    try { return !!localStorage.getItem(KVKK_PREFIX + this.token); }
    catch { return false; }
  }

  private acceptKvkk(): void {
    try { localStorage.setItem(KVKK_PREFIX + this.token, "1"); } catch {}
  }

  private kvkkHTML(): string {
    return `
      <div class="lp-kvkk">
        <p class="lp-kvkk-title">Gizlilik Bildirimi</p>
        <p class="lp-kvkk-text">
          Bu görüşme, size daha iyi hizmet sunabilmek amacıyla kaydedilecektir.
          Devam ederek kişisel verilerinizin işlenmesine onay vermiş olursunuz.
        </p>
        <button class="lp-kvkk-btn" id="lp-kvkk-accept">Anladım, devam et →</button>
      </div>
    `;
  }

  private bindKvkkEvents(): void {
    this.shadow.getElementById("lp-kvkk-accept")
      ?.addEventListener("click", () => {
        this.acceptKvkk();
        const body = this.shadow.getElementById("lp-body");
        if (body) {
          body.innerHTML = this.chatHTML();
          this.bindChatEvents();
          this.scrollToBottom();
        }
      });
  }

  // ── Chat UI ─────────────────────────────────────────────────────────────────

  private chatHTML(): string {
    const { welcomeMessage } = this.config!;

    const msgsHtml = this.messages.length === 0
      ? `<div class="lp-msg lp-msg--bot">
           <div class="lp-bubble">${esc(welcomeMessage)}</div>
         </div>`
      : this.messages
          .map((m, i) => {
            if (m.role === "lead-card" && m.leadData) {
              return `<div class="lp-msg lp-msg--bot">${this.renderLeadCard(m.leadData)}</div>`;
            }
            const isUser  = m.role === "user";
            const isEmpty = m.content === "" && !isUser && this.isLoading && i === this.messages.length - 1;
            const cls     = isEmpty ? "lp-bubble lp-bubble--typing" : "lp-bubble";
            const text    = isEmpty ? "●  ●  ●" : esc(m.content);
            return `
              <div class="lp-msg lp-msg--${isUser ? "user" : "bot"}">
                <div class="${cls}" data-idx="${i}">${text}</div>
              </div>`;
          })
          .join("");

    return `
      <div class="lp-messages" id="lp-messages">${msgsHtml}</div>
      <div class="lp-input-row">
        <input class="lp-input" id="lp-input"
          placeholder="Mesajınızı yazın…"
          ${this.isLoading ? "disabled" : ""} />
        <button class="lp-send" id="lp-send" ${this.isLoading ? "disabled" : ""}>→</button>
      </div>
    `;
  }

  private bindChatEvents(): void {
    const input = this.shadow.getElementById("lp-input") as HTMLInputElement | null;
    const send  = this.shadow.getElementById("lp-send");

    const submit = () => {
      const text = input?.value.trim();
      if (!text || this.isLoading) return;
      if (input) input.value = "";
      void this.sendMessage(text);
    };

    send?.addEventListener("click", submit);
    input?.addEventListener("keydown", (e: Event) => {
      if ((e as KeyboardEvent).key === "Enter") submit();
    });

    setTimeout(() => input?.focus(), 50);
  }

  // ── Message Send + Streaming ─────────────────────────────────────────────────

  private async sendMessage(text: string): Promise<void> {
    if (this.isLoading || !this.config) return;

    this.messages.push({ role: "user", content: text });
    this.isLoading = true;

    // Placeholder for streaming response
    this.messages.push({ role: "assistant", content: "" });
    const botIdx = this.messages.length - 1;

    // Re-render with typing indicator
    this.refreshBody();

    try {
      const res = await fetch(`${this.apiUrl}/api/widget/chat`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token:     this.token,
          sessionId: this.sessionId,
          messages:  this.messages
            .slice(0, -1) // exclude placeholder
            .filter((m) => m.role === "user" || m.role === "assistant"),
        }),
      });

      if (!res.ok || !res.body) {
        this.messages[botIdx] = { role: "assistant", content: "Bir hata oluştu. Lütfen tekrar deneyin." };
      } else {
        let fullText = "";

        await this.readDataStream(
          res.body,
          (chunk) => {
            fullText += chunk;
            this.messages[botIdx] = { role: "assistant", content: fullText };
            this.updateStreamingBubble(botIdx, fullText);
          },
          (annotation) => {
            if (annotation["type"] === "leadCollected") {
              const leadData = annotation["data"] as LeadCardData;
              this.messages.push({ role: "lead-card", content: "", leadData });
            }
          }
        );

        if (!fullText) {
          this.messages[botIdx] = { role: "assistant", content: "Yanıt alınamadı." };
        }
      }
    } catch {
      this.messages[botIdx] = { role: "assistant", content: "Bağlantı hatası oluştu." };
    }

    this.isLoading = false;
    this.refreshBody();
  }

  // Parse Vercel AI SDK data stream format: each line is `PREFIX:JSON_VALUE`
  private async readDataStream(
    body: ReadableStream<Uint8Array>,
    onChunk: (text: string) => void,
    onAnnotation: (annotation: Record<string, unknown>) => void
  ): Promise<void> {
    const reader  = body.getReader();
    const decoder = new TextDecoder();
    let buffer    = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("0:")) {
            try {
              const chunk = JSON.parse(line.slice(2)) as string;
              if (chunk) onChunk(chunk);
            } catch { /* ignore */ }
          } else if (line.startsWith("8:")) {
            // Message annotations: 8:[{...}, ...]
            try {
              const annotations = JSON.parse(line.slice(2)) as Record<string, unknown>[];
              for (const ann of annotations) onAnnotation(ann);
            } catch { /* ignore */ }
          }
          // "d:" / "e:" finish events — ignore
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private renderLeadCard(data: LeadCardData): string {
    const sector = this.config?.sector ?? "";
    const urgencyLabel: Record<string, string> = { LOW: "Düşük", MED: "Orta", HIGH: "Yüksek" };

    let rows = `
      <div class="lp-lead-card-row">
        <span class="lp-lead-card-label">Ad Soyad</span>
        <span class="lp-lead-card-value">${esc(data.name)}</span>
      </div>`;

    if (data.phone) rows += `
      <div class="lp-lead-card-row">
        <span class="lp-lead-card-label">Telefon</span>
        <span class="lp-lead-card-value">${esc(data.phone)}</span>
      </div>`;

    if (data.email) rows += `
      <div class="lp-lead-card-row">
        <span class="lp-lead-card-label">E-posta</span>
        <span class="lp-lead-card-value">${esc(data.email)}</span>
      </div>`;

    const sd = data.sectorData ?? {};
    if (sector === "HUKUK" && sd["davaType"]) {
      rows += `<div class="lp-lead-card-row"><span class="lp-lead-card-label">Dava Türü</span><span class="lp-lead-card-value">${esc(String(sd["davaType"]))}</span></div>`;
    } else if (sector === "EMLAK") {
      if (sd["budget"])   rows += `<div class="lp-lead-card-row"><span class="lp-lead-card-label">Bütçe</span><span class="lp-lead-card-value">${esc(String(sd["budget"]))}</span></div>`;
      if (sd["location"]) rows += `<div class="lp-lead-card-row"><span class="lp-lead-card-label">Konum</span><span class="lp-lead-card-value">${esc(String(sd["location"]))}</span></div>`;
    } else if (sector === "SIGORTA" && sd["policyType"]) {
      rows += `<div class="lp-lead-card-row"><span class="lp-lead-card-label">Poliçe</span><span class="lp-lead-card-value">${esc(String(sd["policyType"]))}</span></div>`;
    } else if (sector === "SAGLIK" && sd["complaintType"]) {
      rows += `<div class="lp-lead-card-row"><span class="lp-lead-card-label">Şikayet</span><span class="lp-lead-card-value">${esc(String(sd["complaintType"]))}</span></div>`;
    }

    if (data.urgency) rows += `
      <div class="lp-lead-card-row">
        <span class="lp-lead-card-label">Aciliyet</span>
        <span class="lp-lead-card-value lp-urgency-${data.urgency}">${urgencyLabel[data.urgency] ?? data.urgency}</span>
      </div>`;

    if (data.score) rows += `
      <div class="lp-lead-card-row">
        <span class="lp-lead-card-label">Skor</span>
        <span class="lp-lead-card-value">${data.score} / 10</span>
      </div>`;

    return `
      <div class="lp-lead-card">
        <div class="lp-lead-card-title">✓ Bilgileriniz alındı</div>
        ${rows}
      </div>`;
  }

  // Incrementally update the streaming bot bubble without full re-render
  private updateStreamingBubble(botIdx: number, text: string): void {
    const bubble = this.shadow.querySelector<HTMLElement>(
      `[data-idx="${botIdx}"]`
    );
    if (bubble) {
      bubble.classList.remove("lp-bubble--typing");
      bubble.textContent = text;
    }
    this.scrollToBottom();
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private refreshBody(): void {
    const body = this.shadow.getElementById("lp-body");
    if (!body) return;
    body.innerHTML = this.chatHTML();
    this.bindChatEvents();
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    const msgs = this.shadow.getElementById("lp-messages");
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }

  // ── Public: Destroy ──────────────────────────────────────────────────────────

  destroy(): void {
    this.host.remove();
  }
}

// ─── HTML escape helper ───────────────────────────────────────────────────────

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\n/g, "<br>");
}

// ─── Auto-init ────────────────────────────────────────────────────────────────

(function autoInit(): void {
  const scriptEl = (document.currentScript ??                                   
  document.querySelector('script[data-token]')) as HTMLScriptElement | null;
  const token    = scriptEl?.getAttribute("data-token") ?? "";
  const apiUrl   = scriptEl?.getAttribute("data-api-url")
    ?? (scriptEl?.src ? new URL(scriptEl.src).origin : "");

  if (!token) {
    console.warn("[LeadPing] data-token eksik.");
    return;
  }

  const init = () => new LeadPingWidget(token, apiUrl);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

export { LeadPingWidget };
