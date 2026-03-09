export default function ReportsLoading() {
  return (
    <div className="flex h-full flex-col gap-4 p-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-36 rounded-xl bg-muted/50" />
        <div className="flex items-center gap-2">
          <div className="h-9 w-32 rounded-xl bg-muted/50" />
          <div className="h-9 w-28 rounded-xl bg-muted/50" />
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-muted/30 p-4 space-y-2">
            <div className="h-4 w-20 rounded bg-muted/50" />
            <div className="h-8 w-24 rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4 flex-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
            <div className="h-5 w-32 rounded bg-muted" />
            <div className="h-40 w-full rounded-xl bg-muted/50" />
          </div>
        ))}
      </div>
    </div>
  );
}
