export default function SettingsLoading() {
  return (
    <div className="flex h-full animate-pulse">
      {/* Sidebar navigation */}
      <div className="flex w-56 flex-col gap-1 border-r border-border p-4">
        <div className="h-6 w-32 rounded bg-muted mb-4" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-9 w-full rounded-lg bg-muted/50" />
        ))}
      </div>

      {/* Form area */}
      <div className="flex-1 p-6 space-y-6">
        <div className="h-8 w-48 rounded-xl bg-muted/50" />
        <div className="space-y-4 max-w-2xl">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 rounded bg-muted/50" />
              <div className="h-10 w-full rounded-xl bg-muted/30 border border-border" />
            </div>
          ))}
          <div className="h-10 w-28 rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}
