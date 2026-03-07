export default function NotificationsLoading() {
  return (
    <div className="flex h-full flex-col gap-4 p-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 rounded-xl bg-muted/50" />
        <div className="h-9 w-28 rounded-xl bg-muted/50" />
      </div>

      {/* Notification items */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
          <div className="h-9 w-9 shrink-0 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted/50" />
          </div>
          <div className="h-3 w-16 rounded bg-muted/50" />
        </div>
      ))}
    </div>
  );
}
