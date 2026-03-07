export default function InstructionsLoading() {
  return (
    <div className="flex h-full flex-col gap-4 p-6 animate-pulse">
      <div className="h-8 w-36 rounded-xl bg-muted/50" />

      <div className="max-w-3xl space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="h-6 w-48 rounded bg-muted" />
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-muted/50" />
              <div className="h-4 w-full rounded bg-muted/50" />
              <div className="h-4 w-3/4 rounded bg-muted/50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
