import { resolve } from "node:path";

// Server
export const PORT = Number(process.env.PORT ?? 3000);
export const MCP_PATH = "/mcp";

// Widget (built by Vite into dist/)
export const DIST_DIR = resolve("dist");
export const WIDGET_HTML = resolve(DIST_DIR, "index.html");
export const WIDGET_URI = "ui://widget/horoscope.html";

// Public URL for ngrok — widget JS/CSS must be allowed in CSP
export const NGROK_URL = "https://chatgpt-hello-demo.ngrok.dev";

export function getBaseUrl() {
  const url = process.env.BASE_URL ?? `http://localhost:${PORT}`;
  return url.replace(/\/$/, "");
}

export function getWidgetCsp() {
  const domains = [NGROK_URL];
  const baseUrl = process.env.BASE_URL?.replace(/\/$/, "");
  if (baseUrl) domains.push(baseUrl);

  return {
    connectDomains: domains,
    resourceDomains: domains,
  };
}
