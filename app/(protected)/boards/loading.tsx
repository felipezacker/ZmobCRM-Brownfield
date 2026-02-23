export default function BoardsLoading() {
  return (
    <div className="flex h-full flex-col gap-4 p-4 animate-pulse">
      {/* Header: board selector + view toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-48 rounded-xl bg-muted/50" />
          <div className="h-9 w-24 rounded-xl bg-muted/50" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-muted/50" />
          <div className="h-9 w-9 rounded-lg bg-muted/50" />
        </div>
      </div>

      {/* Kanban columns */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex w-72 shrink-0 flex-col gap-3 rounded-2xl border border-border bg-muted/30 p-3">
            {/* Column header */}
            <div className="flex items-center justify-between">
              <div className="h-5 w-28 rounded bg-muted" />
              <div className="h-5 w-8 rounded-full bg-muted/50" />
            </div>
            {/* Cards */}
            {Array.from({ length: 3 - Math.floor(i / 2) }).map((_, j) => (
              <div key={j} className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted/50" />
                <div className="flex items-center gap-2 pt-1">
                  <div className="h-6 w-6 rounded-full bg-muted" />
                  <div className="h-3 w-20 rounded bg-muted/50" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
