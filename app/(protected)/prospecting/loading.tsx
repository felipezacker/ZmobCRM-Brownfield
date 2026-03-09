export default function ProspectingLoading() {
  return (
    <div className="flex h-full animate-pulse">
      {/* Sidebar: call queue list */}
      <div className="flex w-80 flex-col border-r border-border">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="h-6 w-28 rounded bg-muted" />
          <div className="h-8 w-8 rounded-lg bg-muted/50" />
        </div>
        <div className="flex items-center gap-2 border-b border-border px-4 py-2">
          <div className="h-8 w-full rounded-xl bg-muted/50" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
            <div className="h-9 w-9 shrink-0 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted/50" />
            </div>
            <div className="h-5 w-12 rounded-full bg-muted/50" />
          </div>
        ))}
      </div>

      {/* Main area: contact detail + script */}
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-muted" />
          <div className="space-y-2">
            <div className="h-6 w-48 rounded bg-muted" />
            <div className="h-4 w-32 rounded bg-muted/50" />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3 flex-1">
          <div className="h-5 w-24 rounded bg-muted" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 w-full rounded bg-muted/50" />
          ))}
        </div>
      </div>
    </div>
  );
}
