export default function AISettingsLoading() {
  return (
    <div className="flex h-full flex-col gap-6 p-6 animate-pulse">
      <div className="h-8 w-44 rounded-xl bg-muted/50" />

      <div className="space-y-6 max-w-2xl">
        {/* Model selector */}
        <div className="space-y-2">
          <div className="h-4 w-28 rounded bg-muted/50" />
          <div className="h-10 w-full rounded-xl bg-muted/30 border border-border" />
        </div>

        {/* Temperature slider */}
        <div className="space-y-2">
          <div className="h-4 w-24 rounded bg-muted/50" />
          <div className="h-6 w-full rounded bg-muted/30" />
        </div>

        {/* Prompt textarea */}
        <div className="space-y-2">
          <div className="h-4 w-36 rounded bg-muted/50" />
          <div className="h-32 w-full rounded-xl bg-muted/30 border border-border" />
        </div>

        {/* Toggle options */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <div className="h-4 w-40 rounded bg-muted/50" />
            <div className="h-6 w-11 rounded-full bg-muted" />
          </div>
        ))}

        <div className="h-10 w-28 rounded-xl bg-muted" />
      </div>
    </div>
  );
}
