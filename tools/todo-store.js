import { z } from "zod";

export const todoOutputSchema = {
  tasks: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      completed: z.boolean(),
    })
  ),
};

let todos = [];
let nextId = 1;

export function getTodos() {
  return todos;
}

export function addTodo(title) {
  const todo = { id: `todo-${nextId++}`, title, completed: false };
  todos = [...todos, todo];
  return todo;
}

export function completeTodo(id) {
  const todo = todos.find((task) => task.id === id);
  if (!todo) return null;

  todos = todos.map((task) =>
    task.id === id ? { ...task, completed: true } : task
  );

  return todo;
}

export function incompleteTodo(id) {
  const todo = todos.find((task) => task.id === id);
  if (!todo) return null;

  todos = todos.map((task) =>
    task.id === id ? { ...task, completed: false } : task
  );

  return todo;
}

export function replyWithTodos(message) {
  return {
    content: message ? [{ type: "text", text: message }] : [],
    structuredContent: { tasks: todos },
  };
}
