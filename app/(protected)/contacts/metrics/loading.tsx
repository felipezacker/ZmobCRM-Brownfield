export default function ContactMetricsLoading() {
  return (
    <div className="flex h-full flex-col gap-4 p-4 animate-pulse">
      {/* Header */}
      <div className="h-8 w-44 rounded-xl bg-muted/50" />

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-muted/30 p-4 space-y-2">
            <div className="h-4 w-24 rounded bg-muted/50" />
            <div className="h-8 w-16 rounded bg-muted" />
            <div className="h-3 w-20 rounded bg-muted/50" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4 flex-1">
        <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
          <div className="h-5 w-36 rounded bg-muted" />
          <div className="h-48 w-full rounded-xl bg-muted/50" />
        </div>
        <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
          <div className="h-5 w-32 rounded bg-muted" />
          <div className="h-48 w-full rounded-xl bg-muted/50" />
        </div>
      </div>
    </div>
  );
}
