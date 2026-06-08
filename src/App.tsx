import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { useState } from "react";

type HoroscopeResult = {
  dob?: string;
  sign?: string;
  symbol?: string;
  mood?: string;
  points?: string[];
  accentColor?: string;
};

function formatDob(dob: string) {
  const date = new Date(`${dob}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function HoroscopeSkeleton() {
  return (
    <main className="card card--horoscope card--loading">
      <header className="header">
        <div className="skeleton skeleton--symbol" />
        <div className="skeleton-group">
          <div className="skeleton skeleton--eyebrow" />
          <div className="skeleton skeleton--title" />
          <div className="skeleton skeleton--dob" />
        </div>
      </header>

      <div className="skeleton skeleton--mood" />

      <ul className="insights insights--skeleton">
        <li><div className="skeleton skeleton--line" /></li>
        <li><div className="skeleton skeleton--line" /></li>
        <li><div className="skeleton skeleton--line skeleton--line-short" /></li>
      </ul>

      <p className="loading-label">Reading the stars…</p>
    </main>
  );
}

export default function App() {
  const [horoscope, setHoroscope] = useState<HoroscopeResult | null>(null);
  const [loading, setLoading] = useState(false);

  const { isConnected, error } = useApp({
    appInfo: { name: "horoscope-widget", version: "0.1.0" },
    capabilities: {},
    onAppCreated: (app) => {
      app.ontoolinput = () => {
        setLoading(true);
        setHoroscope(null);
      };

      app.ontoolresult = (result) => {
        setLoading(false);
        const data = result.structuredContent as HoroscopeResult | undefined;
        if (data?.sign && data.points?.length) {
          setHoroscope(data);
        }
      };

      app.ontoolcancelled = () => {
        setLoading(false);
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
      <main className="card card--empty">
        <p className="muted">Connecting to ChatGPT…</p>
      </main>
    );
  }

  if (loading) {
    return <HoroscopeSkeleton />;
  }

  if (!horoscope) {
    return (
      <main className="card card--empty">
        <div className="empty-icon">✨</div>
        <h1>Your Horoscope</h1>
        <p className="muted">
          Ask ChatGPT to show your horoscope — you&apos;ll be asked for your date
          of birth.
        </p>
      </main>
    );
  }

  const accent = horoscope.accentColor ?? "#7C5CFC";

  return (
    <main
      className="card card--horoscope"
      style={{ "--accent": accent } as React.CSSProperties}
    >
      <header className="header">
        <span className="symbol">{horoscope.symbol}</span>
        <div>
          <p className="eyebrow">Today&apos;s reading</p>
          <h1>{horoscope.sign}</h1>
          {horoscope.dob && (
            <p className="dob">Born {formatDob(horoscope.dob)}</p>
          )}
        </div>
      </header>

      {horoscope.mood && <p className="mood">{horoscope.mood}</p>}

      <ul className="insights">
        {horoscope.points?.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </main>
  );
}
