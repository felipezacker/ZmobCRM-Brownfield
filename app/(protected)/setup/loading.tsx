export default function SetupLoading() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 p-6 animate-pulse">
      {/* Steps indicator */}
      <div className="flex items-center gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted" />
            {i < 3 && <div className="h-1 w-12 rounded bg-muted/50" />}
          </div>
        ))}
      </div>

      {/* Form area */}
      <div className="w-full max-w-lg space-y-6">
        <div className="h-7 w-56 rounded bg-muted mx-auto" />
        <div className="h-4 w-72 rounded bg-muted/50 mx-auto" />

        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 rounded bg-muted/50" />
              <div className="h-10 w-full rounded-xl bg-muted/30 border border-border" />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <div className="h-10 w-24 rounded-xl bg-muted/50" />
          <div className="h-10 w-24 rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}
