import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import {
  incompleteTodo,
  replyWithTodos,
  todoOutputSchema,
} from "./todo-store.js";

export const incompleteTodoInputSchema = {
  id: z
    .string()
    .min(1)
    .describe('Todo id from structuredContent.tasks, e.g. "todo-1" or "todo-2"'),
};

const INCOMPLETE_TODO_DESCRIPTION = `Mark an existing todo item as incomplete and update the widget.

WHEN TO CALL
- The user says they want to undo, reopen, or uncheck a completed task.
- The user asks to mark a specific todo as not done by id or by matching its title.

EXAMPLES (user message → tool call)
- "Mark todo-1 as incomplete" → { "id": "todo-1" }
- "Uncheck reading my book" → find the task titled "Read my book" in the current list, then { "id": "todo-2" }
- "Reopen the groceries task" → match title "Buy groceries", then { "id": "todo-3" }
- "I didn't finish calling Mom" → match title "Call Mom", then { "id": "todo-1" }

MATCHING BY TITLE
If the user names a task instead of an id, look up ids from the latest structuredContent.tasks (or prior tool results in the conversation). Pick the best matching completed task.

DO NOT CALL
- To add a new task → use add_todo instead.
- To mark a task done → use complete_todo instead.
- If no matching completed task exists → tell the user; do not guess an id.

INPUT
- id (required): exact task id such as "todo-1".`;

export function registerIncompleteTodoTool(server, { widgetUri, widgetCsp }) {
  registerAppTool(
    server,
    "incomplete_todo",
    {
      title: "Incomplete todo",
      description: INCOMPLETE_TODO_DESCRIPTION,
      inputSchema: incompleteTodoInputSchema,
      outputSchema: todoOutputSchema,
      _meta: {
        ui: {
          resourceUri: widgetUri,
          csp: widgetCsp,
        },
      },
    },
    async (args) => {
      const id = args?.id;
      if (!id) return replyWithTodos("Missing todo id.");

      console.log("## incompleteTodo", id);

      const todo = incompleteTodo(id);
      if (!todo) return replyWithTodos(`Todo "${id}" not found.`);

      return replyWithTodos(`Marked "${todo.title}" as incomplete.`);
    }
  );
}
