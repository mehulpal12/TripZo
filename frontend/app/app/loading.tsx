export default function GlobalLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="flex flex-col items-center gap-6 p-8">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <div className="space-y-2 text-center">
          <h2 className="text-xl font-black text-foreground tracking-tight">Loading TRIPZO...</h2>
          <p className="text-sm text-muted-foreground">Preparing your premium mobility experience.</p>
        </div>
      </div>
    </div>
  );
}
