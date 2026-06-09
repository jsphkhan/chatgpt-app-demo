import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { useCallback, useState } from "react";

type TodoTask = {
  id: string;
  title: string;
  completed: boolean;
};

type TodoResult = {
  tasks?: TodoTask[];
};

function updateTasksFromResult(
  result: { structuredContent?: TodoResult } | undefined,
  setTasks: (tasks: TodoTask[]) => void
) {
  if (result?.structuredContent?.tasks) {
    setTasks(result.structuredContent.tasks);
  }
}

export default function App() {
  const [tasks, setTasks] = useState<TodoTask[]>([]);
  const [title, setTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(() => new Set());

  const { app, isConnected, error } = useApp({
    appInfo: { name: "todo-widget", version: "0.1.0" },
    capabilities: {},
    onAppCreated: (appInstance) => {
      appInstance.ontoolresult = (result) => {
        console.log('## ontoolresult', result);
        updateTasksFromResult(result, setTasks);
      };
    },
  });

  const callTodoTool = useCallback(
    async (
      name: "add_todo" | "complete_todo" | "incomplete_todo",
      args: Record<string, string>
    ) => {
      if (!app) return;
      const result = await app.callServerTool({ name, arguments: args });
      updateTasksFromResult(result, setTasks);
    },
    [app]
  );

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || isAdding || !app) return;

    setIsAdding(true);
    try {
      await callTodoTool("add_todo", { title: trimmed });
      setTitle("");
    } catch (err) {
      console.error("Failed to add todo:", err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleComplete = async (id: string, completed: boolean) => {
    if (!app || busyIds.has(id)) return;

    setBusyIds((prev) => new Set(prev).add(id));
    try {
      await callTodoTool(completed ? "incomplete_todo" : "complete_todo", { id });
    } catch (err) {
      console.error("Failed to update todo:", err);
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  if (error) {
    return (
      <main className="card">
        <p className="error">Could not connect: {error.message}</p>
      </main>
    );
  }

  if (!isConnected) {
    return (
      <main className="card card--empty">
        <p className="muted">Connecting to ChatGPT…</p>
      </main>
    );
  }

  return (
    <main className="card card--todo">
      <div className="card--body">
        <h1>Todo list</h1>

        <form className="todo-form" onSubmit={handleAdd} autoComplete="off">
          <input
            className="todo-input"
            name="title"
            placeholder="Add a task"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <button className="todo-add" type="submit" disabled={isAdding}>
            {isAdding ? "Adding…" : "Add"}
          </button>
        </form>

        <ul className="todo-list">
          {tasks.map((task) => {
            const busy = busyIds.has(task.id);
            return (
              <li
                key={task.id}
                className="todo-item"
                data-completed={String(task.completed)}
                data-busy={String(busy)}
              >
                <label className="todo-label">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    disabled={busy}
                    onChange={() => handleToggleComplete(task.id, task.completed)}
                  />
                  <span>{task.title}</span>
                </label>
              </li>
            );
          })}
        </ul>

        {tasks.length === 0 && (
          <p className="muted todo-empty">
            Ask ChatGPT to add a task, or type one above.
          </p>
        )}
      </div>
    </main>
  );
}
