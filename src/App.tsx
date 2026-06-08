import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { useState } from "react";

type HelloResult = {
  greeting?: string;
  name?: string;
};

export default function App() {
  const [hello, setHello] = useState<HelloResult | null>(null);

  const { isConnected, error } = useApp({
    appInfo: { name: "hello-widget", version: "0.1.0" },
    capabilities: {},
    onAppCreated: (app) => {
      app.ontoolresult = (result) => {
        const data = result.structuredContent as HelloResult | undefined;
        if (data?.greeting) {
          setHello(data);
        }
      };
    },
  });

  if (error) {
    return (
      <main className="card">
        <p className="error">Could not connect: {error.message}</p>
      </main>
    );
  }

  if (!isConnected) {
    return (
      <main className="card">
        <p className="muted">Connecting to ChatGPT…</p>
      </main>
    );
  }

  return (
    <main className="card">
      <h1>Hello World</h1>
      {hello ? (
        <p className="greeting">{hello.greeting}</p>
      ) : (
        <p className="muted">
          Tell ChatGPT your name — for example: &quot;My name is Alex&quot;
        </p>
      )}
    </main>
  );
}
