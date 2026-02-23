export default function CockpitLoading() {
  return (
    <div className="flex h-full flex-col gap-4 p-4 animate-pulse">
      {/* Pipeline bar */}
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/3 px-4 py-3">
        <div className="h-9 w-48 rounded-xl bg-white/5" />
        <div className="flex flex-1 items-center gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 flex-1 rounded-lg bg-white/5" />
          ))}
        </div>
      </div>

      {/* 3-column layout */}
      <div className="grid flex-1 grid-cols-[280px_1fr_360px] gap-4 min-h-0">
        {/* Left rail */}
        <div className="flex flex-col gap-4 overflow-hidden">
          {/* Health */}
          <div className="rounded-2xl border border-white/10 bg-white/3 p-4 space-y-3">
            <div className="h-5 w-24 rounded bg-white/8" />
            <div className="h-16 w-16 mx-auto rounded-full bg-white/5" />
            <div className="h-4 w-20 mx-auto rounded bg-white/5" />
          </div>
          {/* Next action */}
          <div className="rounded-2xl border border-white/10 bg-white/3 p-4 space-y-3">
            <div className="h-5 w-28 rounded bg-white/8" />
            <div className="h-4 w-full rounded bg-white/5" />
            <div className="h-10 w-full rounded-xl bg-white/8" />
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-white/5" />
              ))}
            </div>
          </div>
          {/* Data */}
          <div className="rounded-2xl border border-white/10 bg-white/3 p-4 space-y-2">
            <div className="h-5 w-20 rounded bg-white/8" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between py-1">
                <div className="h-3 w-20 rounded bg-white/5" />
                <div className="h-3 w-28 rounded bg-white/5" />
              </div>
            ))}
          </div>
        </div>

        {/* Center: timeline */}
        <div className="rounded-2xl border border-white/10 bg-white/3 p-4 space-y-3 overflow-hidden">
          <div className="h-5 w-24 rounded bg-white/8" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-7 w-16 rounded-full bg-white/5" />
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 py-2">
              <div className="h-8 w-8 shrink-0 rounded-full bg-white/8" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-3/4 rounded bg-white/5" />
                <div className="h-3 w-1/2 rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>

        {/* Right rail */}
        <div className="rounded-2xl border border-white/10 bg-white/3 p-4 space-y-3 overflow-hidden">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-white/8" />
            <div className="space-y-1">
              <div className="h-4 w-28 rounded bg-white/8" />
              <div className="h-3 w-20 rounded bg-white/5" />
            </div>
          </div>
          <div className="flex gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-5 w-14 rounded bg-white/5" />
            ))}
          </div>
          <div className="flex-1 rounded-xl border border-white/10 bg-white/2 h-64" />
        </div>
      </div>
    </div>
  );
}
