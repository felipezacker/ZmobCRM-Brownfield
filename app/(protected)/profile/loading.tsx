export default function ProfileLoading() {
  return (
    <div className="flex h-full flex-col gap-6 p-6 animate-pulse">
      <div className="h-8 w-28 rounded-xl bg-muted/50" />

      <div className="max-w-2xl space-y-6">
        {/* Avatar + name */}
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full bg-muted" />
          <div className="space-y-2">
            <div className="h-6 w-40 rounded bg-muted" />
            <div className="h-4 w-28 rounded bg-muted/50" />
          </div>
        </div>

        {/* Form fields */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-24 rounded bg-muted/50" />
            <div className="h-10 w-full rounded-xl bg-muted/30 border border-border" />
          </div>
        ))}

        <div className="h-10 w-28 rounded-xl bg-muted" />
      </div>
    </div>
  );
}
