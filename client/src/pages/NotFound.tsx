import { ArrowLeft, FileWarning } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();
  return <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
    <div className="w-full max-w-xl border border-border bg-card p-8 md:p-12">
      <div className="flex items-center justify-between"><div className="eyebrow text-primary">Audit record / unavailable</div><FileWarning size={20} className="text-primary" /></div>
      <div className="mt-12 font-mono text-7xl font-semibold tracking-[-0.08em] text-foreground">404</div>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">This record is not in the audit trail.</h1>
      <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">The requested route does not resolve to a published report, prediction workspace, or model record.</p>
      <button onClick={() => setLocation("/")} className="mt-8 inline-flex items-center gap-2 border border-primary bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[.98]"><ArrowLeft size={15} /> Return to the audit</button>
    </div>
  </main>;
}
