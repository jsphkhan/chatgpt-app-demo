import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { addTodo, replyWithTodos, todoOutputSchema } from "./todo-store.js";

export const addTodoInputSchema = {
  title: z
    .string()
    .min(1)
    .describe('Task text, e.g. "Read chapter 3" or "Buy groceries"'),
};

const ADD_TODO_DESCRIPTION = `Add a new task to the user's todo list and update the widget.

WHEN TO CALL
- The user wants to remember something, set a reminder, or add an item to their list.
- The user describes a new task in natural language.

EXAMPLES (user message → tool call)
- "Add a task to read my book" → { "title": "Read my book" }
- "Remind me to call Mom" → { "title": "Call Mom" }
- "Put finish the report on my todo list" → { "title": "Finish the report" }
- "I need to buy groceries tomorrow" → { "title": "Buy groceries tomorrow" }

DO NOT CALL
- To mark a task done → use complete_todo instead.
- To mark a task incomplete → use incomplete_todo instead.
- When the user only asks to see their list → the widget already shows tasks; reply from context.

INPUT
- title (required): concise task text. Trim filler words; keep the user's intent.`;

export function registerAddTodoTool(server, { widgetUri, widgetCsp }) {
  registerAppTool(
    server,
    "add_todo",
    {
      title: "Add todo",
      description: ADD_TODO_DESCRIPTION,
      inputSchema: addTodoInputSchema,
      outputSchema: todoOutputSchema,
      _meta: {
        ui: {
          resourceUri: widgetUri,
          csp: widgetCsp,
        },
      },
    },
    async (args) => {
      const title = args?.title?.trim?.() ?? "";
      console.log('## addTodo', title);
      if (!title) return replyWithTodos("Missing title.");
      const todo = addTodo(title);
      return replyWithTodos(`Added "${todo.title}".`);
    }
  );
}
