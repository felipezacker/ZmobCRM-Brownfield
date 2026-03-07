export default function ProtectedLoading() {
  return (
    <div className="flex h-full items-center justify-center animate-pulse">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-muted" />
        <div className="h-4 w-32 rounded bg-muted/50" />
      </div>
    </div>
  );
}
