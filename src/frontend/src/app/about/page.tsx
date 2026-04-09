export default function AboutPage() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-background font-sans">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-card text-card-foreground sm:items-start border shadow-sm">
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-foreground">
            About GJAS
          </h1>
          <p className="max-w-md text-lg leading-8 text-muted-foreground">
            The Global Judicial Assembly Simulator (GJAS) is a platform for AI-driven cross-jurisdictional legal deliberation.
          </p>
        </div>
      </main>
    </div>
  );
}