import { useState } from 'react';

interface AdminIslandProps {
  title?: string;
  initialCount?: number;
}

// Interactive admin widget — placeholder. Individual admin pages import this
// island and hydrate it client-side via `client:load` / `client:idle`.
export default function AdminIsland({ title = 'Activity', initialCount = 0 }: AdminIslandProps) {
  const [count, setCount] = useState(initialCount);
  const [filter, setFilter] = useState('');

  return (
    <div className="rounded-card border border-ink-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
        <span className="text-sm text-ink-500">items: {count}</span>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <input
          type="text"
          value={filter}
          placeholder="Filter…"
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 rounded-button border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="button"
          onClick={() => setCount((n) => n + 1)}
          className="rounded-button bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Refresh
        </button>
      </div>
      {filter && (
        <p className="mt-3 text-sm text-ink-500">
          Showing items matching "<span className="font-medium text-ink-900">{filter}</span>"
        </p>
      )}
    </div>
  );
}
