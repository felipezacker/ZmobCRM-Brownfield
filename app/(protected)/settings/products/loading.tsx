export default function ProductsLoading() {
  return (
    <div className="flex h-full flex-col gap-4 p-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 rounded-xl bg-muted/50" />
        <div className="h-9 w-32 rounded-xl bg-muted/50" />
      </div>

      {/* Table header */}
      <div className="flex items-center gap-4 border-b border-border pb-3">
        {['w-40', 'w-32', 'w-24', 'w-20', 'w-16'].map((w, i) => (
          <div key={i} className={`h-4 ${w} rounded bg-muted`} />
        ))}
      </div>

      {/* Table rows */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-border/50 py-3">
          <div className="h-4 w-40 rounded bg-muted/50" />
          <div className="h-4 w-32 rounded bg-muted/50" />
          <div className="h-4 w-24 rounded bg-muted/50" />
          <div className="h-5 w-16 rounded-full bg-muted" />
          <div className="h-8 w-16 rounded-lg bg-muted/50" />
        </div>
      ))}
    </div>
  );
}
