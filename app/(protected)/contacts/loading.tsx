export default function ContactsLoading() {
  return (
    <div className="flex h-full flex-col gap-4 p-4 animate-pulse">
      {/* Header: title + search + actions */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 rounded-xl bg-muted/50" />
        <div className="flex items-center gap-3">
          <div className="h-9 w-64 rounded-xl bg-muted/50" />
          <div className="h-9 w-9 rounded-lg bg-muted/50" />
          <div className="h-9 w-28 rounded-xl bg-muted/50" />
        </div>
      </div>

      {/* Table header */}
      <div className="flex items-center gap-4 border-b border-border pb-3">
        {['w-8', 'w-48', 'w-40', 'w-32', 'w-28', 'w-24', 'w-20'].map((w, i) => (
          <div key={i} className={`h-4 ${w} rounded bg-muted`} />
        ))}
      </div>

      {/* Table rows */}
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-border/50 py-3">
          <div className="h-4 w-8 rounded bg-muted/50" />
          <div className="flex items-center gap-2 w-48">
            <div className="h-8 w-8 rounded-full bg-muted" />
            <div className="h-4 w-32 rounded bg-muted/50" />
          </div>
          <div className="h-4 w-40 rounded bg-muted/50" />
          <div className="h-4 w-32 rounded bg-muted/50" />
          <div className="h-4 w-28 rounded bg-muted/50" />
          <div className="h-5 w-16 rounded-full bg-muted" />
          <div className="h-4 w-20 rounded bg-muted/50" />
        </div>
      ))}
    </div>
  );
}
