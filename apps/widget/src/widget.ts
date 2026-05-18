interface WidgetConfig {
  apiKey: string;
  sector: string;
  position?: "bottom-right" | "bottom-left";
  primaryColor?: string;
}

const STYLES = `
  :host {
    all: initial;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  .lp-container {
    position: fixed;
    bottom: 24px;
    z-index: 2147483647;
  }

  .lp-container--bottom-right { right: 24px; }
  .lp-container--bottom-left  { left: 24px; }

  .lp-trigger {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--lp-primary, #18181b);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .lp-trigger:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 20px rgba(0,0,0,0.2);
  }

  .lp-trigger svg {
    width: 24px;
    height: 24px;
    fill: #fff;
  }

  .lp-panel {
    position: absolute;
    bottom: 68px;
    width: 340px;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.12);
    overflow: hidden;
    display: none;
  }

  .lp-container--bottom-right .lp-panel { right: 0; }
  .lp-container--bottom-left  .lp-panel { left: 0; }

  .lp-panel--open { display: block; }

  .lp-header {
    background: var(--lp-primary, #18181b);
    color: #fff;
    padding: 16px;
    font-size: 14px;
    font-weight: 600;
  }

  .lp-body {
    padding: 16px;
    font-size: 14px;
    color: #3f3f46;
  }
`;

export class LeadPingWidget {
  private readonly config: Required<WidgetConfig>;
  private host: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private isOpen = false;

  constructor(config: WidgetConfig) {
    this.config = {
      position: "bottom-right",
      primaryColor: "#18181b",
      ...config,
    };
  }

  mount(container: HTMLElement = document.body): void {
    if (this.host) return;

    this.host = document.createElement("div");
    this.host.setAttribute("data-leadping", "true");
    this.shadow = this.host.attachShadow({ mode: "open" });

    this.render();
    container.appendChild(this.host);
  }

  unmount(): void {
    this.host?.remove();
    this.host = null;
    this.shadow = null;
  }

  private render(): void {
    if (!this.shadow) return;

    const { position, primaryColor } = this.config;

    this.shadow.innerHTML = `
      <style>${STYLES}</style>
      <div
        class="lp-container lp-container--${position}"
        style="--lp-primary: ${primaryColor}"
      >
        <div class="lp-panel" id="lp-panel">
          <div class="lp-header">LeadPing</div>
          <div class="lp-body">Merhaba! Size nasıl yardımcı olabiliriz?</div>
        </div>
        <button class="lp-trigger" id="lp-trigger" aria-label="LeadPing'i aç">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
          </svg>
        </button>
      </div>
    `;

    this.shadow
      .getElementById("lp-trigger")
      ?.addEventListener("click", () => this.toggle());
  }

  private toggle(): void {
    this.isOpen = !this.isOpen;
    const panel = this.shadow?.getElementById("lp-panel");
    panel?.classList.toggle("lp-panel--open", this.isOpen);
  }
}
