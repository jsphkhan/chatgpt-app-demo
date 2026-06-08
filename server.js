import express from "express";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const DIST_DIR = resolve("dist");
const WIDGET_HTML_PATH = resolve(DIST_DIR, "index.html");
const WIDGET_URI = "ui://widget/hello.html";
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
    throw new Error(
      'Widget not built. Run "npm run build" first to create dist/index.html.'
    );
  }

  const html = readFileSync(WIDGET_HTML_PATH, "utf8");
  const baseUrl = getBaseUrl();

  // ChatGPT loads widget HTML from MCP, not from this server — asset URLs must be absolute.
  return html.replace(/(src|href)="\/assets\//g, `$1="${baseUrl}/assets/`);
}

const sayHelloInputSchema = {
  name: z.string().min(1).describe("The user's name"),
};

const sayHelloOutputSchema = {
  greeting: z.string(),
  name: z.string(),
};

function createHelloServer() {
  const widgetHtml = loadWidgetHtml();
  const widgetCsp = getWidgetCsp();
  const server = new McpServer({ name: "hello-app", version: "0.1.0" });

  registerAppResource(
    server,
    "hello-widget",
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

  registerAppTool(
    server,
    "say_hello",
    {
      title: "Say hello",
      description:
        "Greets the user by name. Call this when the user shares their name or asks for a hello greeting.",
      inputSchema: sayHelloInputSchema,
      outputSchema: sayHelloOutputSchema,
      _meta: {
        ui: {
          resourceUri: WIDGET_URI,
          csp: widgetCsp,
        },
      },
    },
    async (args) => {
      const name = args?.name?.trim?.() ?? "";
      if (!name) {
        return {
          content: [
            {
              type: "text",
              text: "Please tell me your name so I can greet you.",
            },
          ],
        };
      }

      const greeting = `Hello ${name}!`;

      return {
        content: [{ type: "text", text: greeting }],
        structuredContent: { greeting, name },
      };
    }
  );

  return server;
}

async function handleMcpRequest(req, res) {
  const server = createHelloServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  res.on("close", () => {
    transport.close();
    server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("Error handling MCP request:", error);
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
app.use(express.static(DIST_DIR));

app.get("/", (_req, res) => {
  res.type("text").send("Hello World MCP server");
});

app.post(MCP_PATH, handleMcpRequest);
app.get(MCP_PATH, handleMcpRequest);
app.delete(MCP_PATH, handleMcpRequest);

app.listen(port, () => {
  console.log(
    `Hello World MCP server listening on http://localhost:${port}${MCP_PATH}`
  );
});
