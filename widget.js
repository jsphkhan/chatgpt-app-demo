import { readFileSync, existsSync } from "node:fs";
import {
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import {
  DIST_DIR,
  WIDGET_HTML,
  WIDGET_URI,
  getBaseUrl,
  getWidgetCsp,
} from "./config.js";

// Read the built React app and fix asset paths for ChatGPT
export function loadWidgetHtml() {
  if (!existsSync(WIDGET_HTML)) {
    throw new Error('Run "npm run build" first to create dist/index.html');
  }

  const html = readFileSync(WIDGET_HTML, "utf8");
  const baseUrl = getBaseUrl();

  // Rewrite /assets/... → https://your-server/assets/...
  return html.replace(/(src|href)="\/assets\//g, `$1="${baseUrl}/assets/`);
}

// Tell ChatGPT where to find the React UI
export function registerWidget(server) {
  const widgetHtml = loadWidgetHtml();
  const csp = getWidgetCsp();

  registerAppResource(
    server,
    "todo-widget",
    WIDGET_URI,
    { _meta: { ui: { csp } } },
    async () => ({
      contents: [
        {
          uri: WIDGET_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: widgetHtml,
          _meta: { ui: { csp } },
        },
      ],
    })
  );
}

// Serve widget JS/CSS files from dist/
export { DIST_DIR };
