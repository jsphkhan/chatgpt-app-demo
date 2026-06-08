import express from "express";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerShowHoroscopeTool } from "./src/tools/show-horoscope.tool.js";

const DIST_DIR = resolve("dist");
const WIDGET_HTML_PATH = resolve(DIST_DIR, "index.html");
const WIDGET_URI = "ui://widget/horoscope.html";
const MCP_PATH = "/mcp";
const port = Number(process.env.PORT ?? 3000);
const NGROK_PUBLIC_URL = "https://chatgpt-hello-demo.ngrok.dev";

function getBaseUrl() {
  return (process.env.BASE_URL ?? `http://localhost:${port}`).replace(/\/$/, "");
}

function getWidgetCsp() {
  const origins = new Set([NGROK_PUBLIC_URL]);
  const baseUrl = process.env.BASE_URL?.replace(/\/$/, "");
  if (baseUrl) origins.add(baseUrl);

  const domains = [...origins];
  return {
    connectDomains: domains,
    resourceDomains: domains,
  };
}

function loadWidgetHtml() {
  if (!existsSync(WIDGET_HTML_PATH)) {
    console.error("[widget] dist/index.html not found — run npm run build");
    throw new Error(
      'Widget not built. Run "npm run build" first to create dist/index.html.'
    );
  }

  const html = readFileSync(WIDGET_HTML_PATH, "utf8");
  const baseUrl = getBaseUrl();
  // console.log(`[widget] loaded HTML (${html.length} bytes), base URL: ${baseUrl}`);

  return html.replace(/(src|href)="\/assets\//g, `$1="${baseUrl}/assets/`);
}

function createHoroscopeServer() {
  // console.log("[mcp] creating server instance");
  const widgetHtml = loadWidgetHtml();
  const widgetCsp = getWidgetCsp();
  const server = new McpServer({ name: "horoscope-app", version: "0.1.0" });

  registerAppResource(
    server,
    "horoscope-widget",
    WIDGET_URI,
    {
      _meta: {
        ui: { csp: widgetCsp },
      },
    },
    async () => ({
      contents: [
        {
          uri: WIDGET_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: widgetHtml,
          _meta: {
            ui: { csp: widgetCsp },
          },
        },
      ],
    })
  );

  registerShowHoroscopeTool(server, {
    widgetUri: WIDGET_URI,
    widgetCsp,
  });

  // console.log("[mcp] registered resource and show_horoscope tool");
  return server;
}

async function handleMcpRequest(req, res) {
  console.log(`[mcp] ${req.method} ${req.path}`);
  const server = createHoroscopeServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  res.on("close", () => {
    // console.log(`[mcp] connection closed (${req.method} ${req.path})`);
    transport.close();
    server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    // console.log(`[mcp] request handled (${req.method} ${req.path})`);
  } catch (error) {
    console.error(`[mcp] request failed (${req.method} ${req.path}):`, error);
    if (!res.headersSent) {
      res.status(500).send("Internal server error");
    }
  }
}

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
  next();
});

app.options(MCP_PATH, (_req, res) => {
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "content-type, mcp-session-id"
  );
  res.sendStatus(204);
});

app.use(express.json());

app.use((req, res, next) => {
  if (req.path !== MCP_PATH) {
    console.log(`[http] ${req.method} ${req.path}`);
  }
  next();
});

app.use(express.static(DIST_DIR));

app.get("/", (_req, res) => {
  res.type("text").send("Horoscope MCP server");
});

app.post(MCP_PATH, handleMcpRequest);
app.get(MCP_PATH, handleMcpRequest);
app.delete(MCP_PATH, handleMcpRequest);

app.listen(port, () => {
  console.log("[server] horoscope-app started");
  console.log(`[server] local:  http://localhost:${port}${MCP_PATH}`);
  console.log(`[server] base URL: ${getBaseUrl()}`);
  console.log(`[server] CSP origins: ${getWidgetCsp().resourceDomains.join(", ")}`);
});
