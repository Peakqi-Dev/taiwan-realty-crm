export default function Loading() {
  return (
    <div className="space-y-5">
      <div className="h-8 w-32 rounded bg-slate-200/70 animate-pulse" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-44 rounded-lg bg-white border border-slate-200 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
