export default function LifecycleSettingsLoading() {
  return (
    <div className="flex h-full flex-col gap-6 animate-pulse">
      <div className="bg-white dark:bg-white/5 border border-border rounded-2xl p-6 space-y-4">
        <div className="h-6 w-36 rounded-xl bg-muted/50" />
        <div className="h-4 w-72 rounded bg-muted/30" />

        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-2 bg-background dark:bg-card/50 rounded-2xl border border-border"
          >
            <div className="w-6 h-6 rounded-full bg-muted/50" />
            <div className="flex-1 h-4 rounded bg-muted/30" />
            <div className="w-8 h-5 rounded-full bg-muted/30" />
            <div className="w-16 h-6 rounded bg-muted/20" />
          </div>
        ))}
      </div>
    </div>
  )
}
