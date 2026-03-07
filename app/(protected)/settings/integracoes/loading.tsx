export default function IntegracoesLoading() {
  return (
    <div className="flex h-full flex-col gap-4 p-6 animate-pulse">
      <div className="h-8 w-40 rounded-xl bg-muted/50" />

      {/* Integration cards */}
      <div className="grid grid-cols-2 gap-4 max-w-3xl">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-muted" />
              <div className="space-y-1">
                <div className="h-4 w-28 rounded bg-muted" />
                <div className="h-3 w-20 rounded bg-muted/50" />
              </div>
            </div>
            <div className="h-3 w-full rounded bg-muted/50" />
            <div className="flex items-center justify-between">
              <div className="h-5 w-16 rounded-full bg-muted/50" />
              <div className="h-8 w-20 rounded-lg bg-muted/50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
