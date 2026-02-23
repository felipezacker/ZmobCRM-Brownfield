export default function InboxLoading() {
  return (
    <div className="flex h-full animate-pulse">
      {/* Left: activity list */}
      <div className="flex w-96 flex-col border-r border-white/10">
        {/* Tabs */}
        <div className="flex items-center gap-4 border-b border-white/10 px-4 py-3">
          <div className="h-5 w-20 rounded bg-white/8" />
          <div className="h-5 w-20 rounded bg-white/5" />
          <div className="h-5 w-20 rounded bg-white/5" />
        </div>
        {/* Activity items */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 border-b border-white/5 px-4 py-3">
            <div className="h-9 w-9 shrink-0 rounded-full bg-white/8" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-white/8" />
              <div className="h-3 w-1/2 rounded bg-white/5" />
              <div className="h-3 w-1/3 rounded bg-white/5" />
            </div>
          </div>
        ))}
      </div>

      {/* Right: detail panel */}
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="h-8 w-64 rounded-xl bg-white/5" />
        <div className="h-4 w-48 rounded bg-white/5" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 w-full rounded bg-white/5" />
          ))}
        </div>
      </div>
    </div>
  );
}
