/**
 * Dev-only docs server — not used in production.
 * Run: npm run docs
 */
import express from "express";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.DOCS_PORT ?? 3333);

const app = express();
app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`Docs running at http://localhost:${PORT}`);
});
