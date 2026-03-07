export default function DecisionsLoading() {
  return (
    <div className="flex h-full flex-col gap-4 p-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 rounded-xl bg-muted/50" />
        <div className="h-9 w-28 rounded-xl bg-muted/50" />
      </div>

      {/* Decision cards */}
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-5 w-40 rounded bg-muted" />
              <div className="h-5 w-16 rounded-full bg-muted/50" />
            </div>
            <div className="h-4 w-full rounded bg-muted/50" />
            <div className="h-4 w-2/3 rounded bg-muted/50" />
            <div className="flex items-center gap-2 pt-1">
              <div className="h-6 w-6 rounded-full bg-muted" />
              <div className="h-3 w-20 rounded bg-muted/50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
