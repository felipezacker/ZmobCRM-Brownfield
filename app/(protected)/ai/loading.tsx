export default function AILoading() {
  return (
    <div className="flex h-full flex-col animate-pulse">
      {/* Messages area */}
      <div className="flex-1 space-y-4 overflow-hidden p-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`flex gap-3 ${i % 2 === 0 ? '' : 'justify-end'}`}>
            {i % 2 === 0 && <div className="h-8 w-8 shrink-0 rounded-full bg-muted" />}
            <div className={`space-y-2 ${i % 2 === 0 ? 'max-w-md' : 'max-w-sm'}`}>
              <div className="h-4 w-full rounded bg-muted/50" />
              <div className="h-4 w-3/4 rounded bg-muted/50" />
              {i % 2 === 0 && <div className="h-4 w-1/2 rounded bg-muted/50" />}
            </div>
            {i % 2 !== 0 && <div className="h-8 w-8 shrink-0 rounded-full bg-muted" />}
          </div>
        ))}
      </div>

      {/* Input area */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <div className="h-11 flex-1 rounded-xl bg-muted/50" />
          <div className="h-11 w-11 rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}
