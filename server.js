/**
 * Todo ChatGPT App — MCP Server
 *
 * This file does 3 things:
 *   1. Starts an Express web server
 *   2. Serves the React widget (dist/) as static files
 *   3. Exposes an MCP endpoint at /mcp for ChatGPT to connect
 */
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { PORT, MCP_PATH, WIDGET_URI, getBaseUrl, getWidgetCsp } from "./config.js";
import { registerWidget, DIST_DIR } from "./widget.js";
import { registerAddTodoTool } from "./tools/add-todo.tool.js";
import { registerCompleteTodoTool } from "./tools/complete-todo.tool.js";
import { registerIncompleteTodoTool } from "./tools/incomplete-todo.tool.js";

// --- Step 1: Create the MCP server (tools + widget) ---

function createMcpServer() {
  const server = new McpServer({ name: "todo-app", version: "0.1.0" });

  registerWidget(server);
  const toolMeta = { widgetUri: WIDGET_URI, widgetCsp: getWidgetCsp() };
  registerAddTodoTool(server, toolMeta);
  registerCompleteTodoTool(server, toolMeta);
  registerIncompleteTodoTool(server, toolMeta);

  return server;
}

// --- Step 2: Handle incoming MCP requests from ChatGPT ---

async function handleMcp(req, res) {
  console.log(`[mcp] ${req.method} request`);

  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless — no session tracking
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
    console.error("[mcp] error:", error.message);
    if (!res.headersSent) res.status(500).send("Internal server error");
  }
}

// --- Step 3: Start Express ---

const app = express();

// Allow ChatGPT to call this server from a different origin
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
  next();
});

app.options(MCP_PATH, (_req, res) => {
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "content-type, mcp-session-id");
  res.sendStatus(204);
});

app.use(express.json());
app.use(express.static(DIST_DIR));

app.get("/", (_req, res) => {
  res.send("Todo MCP server");
});

app.post(MCP_PATH, handleMcp);
app.get(MCP_PATH, handleMcp);
app.delete(MCP_PATH, handleMcp);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}${MCP_PATH}`);
  console.log(`Base URL: ${getBaseUrl()}`);
});
