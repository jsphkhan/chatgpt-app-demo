import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import {
  completeTodo,
  getTodos,
  replyWithTodos,
  todoOutputSchema,
} from "./todo-store.js";

export const completeTodoInputSchema = {
  id: z
    .string()
    .min(1)
    .describe('Todo id from structuredContent.tasks, e.g. "todo-1" or "todo-2"'),
};

const COMPLETE_TODO_DESCRIPTION = `Mark an existing todo item as completed and update the widget.

WHEN TO CALL
- The user says they finished, completed, or checked off a task.
- The user asks to mark a specific todo done by id or by matching its title.

EXAMPLES (user message → tool call)
- "Mark todo-1 as done" → { "id": "todo-1" }
- "I finished reading my book" → find the task titled "Read my book" in the current list, then { "id": "todo-2" }
- "Complete the groceries task" → match title "Buy groceries", then { "id": "todo-3" }
- "Check off call Mom" → match title "Call Mom", then { "id": "todo-1" }

MATCHING BY TITLE
If the user names a task instead of an id, look up ids from the latest structuredContent.tasks (or prior tool results in the conversation). Pick the best matching incomplete task.

DO NOT CALL
- To add a new task → use add_todo instead.
- If no matching incomplete task exists → tell the user; do not guess an id.

INPUT
- id (required): exact task id such as "todo-1".`;

export function registerCompleteTodoTool(server, { widgetUri, widgetCsp }) {
  registerAppTool(
    server,
    "complete_todo",
    {
      title: "Complete todo",
      description: COMPLETE_TODO_DESCRIPTION,
      inputSchema: completeTodoInputSchema,
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

      console.log('## completeTodo', id);

      const todo = completeTodo(id);
      return replyWithTodos(`Completed "${todo.title}".`);
    }
  );
}
