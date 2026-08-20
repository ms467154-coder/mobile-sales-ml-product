import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowUpRight, BookOpen, Check, ChevronRight, CircleAlert, Clock3, Database, FileText, Gauge, History, Layers3, LockKeyhole, Menu, Network, PanelLeftClose, ShieldCheck, Sparkles, X } from "lucide-react";
import { useIsMobile } from "@/hooks/useMobile";
import type { PersistedInferenceResult, ModelMetadata } from "@shared/mlContracts";
import { RECOVERED_QUANTITY_SOLD_MAE } from "@shared/mlContracts";

type MetricRow = { label: string; mae: number; rmse: number; r2: number };

const formatNumber = (value: unknown, digits = 4) => typeof value === "number" ? value.toFixed(digits) : "—";
const shortHash = (value?: string) => value ? `${value.slice(0, 12)}…${value.slice(-8)}` : "—";

const comparisons: MetricRow[] = [
  { label: "Median baseline", mae: 15.0858, rmse: 17.3923, r2: -0.0008 },
  { label: "Ridge", mae: 15.0847, rmse: 17.3889, r2: -0.0004 },
  { label: "HistGradientBoosting", mae: 15.088, rmse: 17.389, r2: -0.0004 },
];

const validFeatures = ["Product", "Brand", "Region", "Price", "Inward Date"];
const excludedFeatures = ["Dispatch Date", "Dispatch Duration", "Quantity Sold", "Product Code", "Product Specification", "Customer Name", "Customer Location"];
const limitations = [
  "No fulfillment center information",
  "No inventory availability, supplier, or carrier information",
  "No channel, order priority, backlog, staffing, or stockout context",
  "No promotion or operational-context variables",
];

function MetricCard({ label, value, note, accent = false }: { label: string; value: string; note: string; accent?: boolean }) {
  return <div className={`border border-border/70 bg-card/75 p-5 ${accent ? "border-primary/35 bg-accent/45" : ""}`}>
    <div className="eyebrow">{label}</div>
    <div className="mt-3 font-mono text-3xl font-semibold tracking-tight text-foreground">{value}</div>
    <p className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p>
  </div>;
}

function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="mb-8 max-w-2xl">
    <div className="eyebrow text-primary">{eyebrow}</div>
    <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">{title}</h2>
    <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
  </div>;
}

export default function Home() {
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState("overview");
  const [navOpen, setNavOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<{ filename: string; title: string } | null>(null);
  const [form, setForm] = useState({ Product: "", Brand: "", Region: "", Price: "", "Inward Date": "" });
  const [result, setResult] = useState<PersistedInferenceResult | null>(null);
  const [error, setError] = useState("");
  const metadataQuery = trpc.ml.metadata.useQuery();
  const reportsQuery = trpc.ml.reports.useQuery();
  const historyInput = useMemo(() => ({ limit: 30 }), []);
  const historyQuery = trpc.ml.history.useQuery(historyInput);
  const reportInput = useMemo(() => ({ filename: selectedReport?.filename ?? "phase_0_reconnaissance.md" }), [selectedReport]);
  const reportQuery = trpc.ml.report.useQuery(reportInput, { enabled: Boolean(selectedReport) });
  const predictMutation = trpc.ml.predict.useMutation({
    onSuccess: (data) => { setResult(data); setError(""); historyQuery.refetch(); },
    onError: (err) => setError(err.message || "Prediction could not be generated."),
  });

  const metadata = metadataQuery.data?.metadata as ModelMetadata | undefined;
  const metrics = metadata?.metrics.test ?? { mae: 0, rmse: 0, r2: 0, p90_absolute_error: 0 };
  const training = metadata?.training_period;

  const scrollTo = (id: string) => {
    setActiveSection(id);
    setNavOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const submitPrediction = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.Product || !form.Brand || !form.Region || !form.Price || !form["Inward Date"]) {
      setError("Complete all five prediction inputs before generating an estimate.");
      return;
    }
    predictMutation.mutate({ ...form, Price: Number(form.Price) });
  };

  const metricMax = Math.max(...comparisons.map(item => item.mae));

  return <div className="min-h-screen bg-background text-foreground">
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <button className="flex items-center gap-3 text-left" onClick={() => scrollTo("overview")} aria-label="Go to overview">
          <span className="flex h-9 w-9 items-center justify-center bg-primary text-primary-foreground"><Network size={17} /></span>
          <span><span className="block text-sm font-semibold tracking-tight">Mobile Sales ML</span><span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Audit / Inference</span></span>
        </button>
        <nav className={`${isMobile ? (navOpen ? "absolute left-0 right-0 top-16 border-b border-border bg-background p-4" : "hidden") : "flex"} items-center gap-1`}>
          {[['overview', 'Overview'], ['predict', 'Predict'], ['performance', 'Performance'], ['reports', 'Reports'], ['history', 'History']].map(([id, label]) => <button key={id} onClick={() => scrollTo(id)} className={`px-3 py-2 text-xs font-semibold transition-colors hover:text-primary ${activeSection === id ? "text-primary" : "text-muted-foreground"}`}>{label}</button>)}
        </nav>
        <div className="flex items-center gap-3"><Badge variant="outline" className="hidden border-primary/30 bg-accent/35 text-primary sm:inline-flex"><span className="mr-2 h-1.5 w-1.5 rounded-full bg-primary" />Frozen artifact</Badge><button className="p-2 text-muted-foreground md:hidden" onClick={() => setNavOpen(!navOpen)} aria-label="Toggle navigation">{navOpen ? <X size={18} /> : <Menu size={18} />}</button></div>
      </div>
    </header>

    <main>
      <section id="overview" className="container scroll-mt-24 py-16 md:py-24">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
          <div>
            <div className="eyebrow flex items-center gap-2 text-primary"><Sparkles size={13} /> Transparent ML system</div>
            <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-[1.03] tracking-[-0.05em] md:text-7xl">Dispatch duration, <span className="text-primary">without the black box.</span></h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground">A transparent audit and inference interface for a frozen machine-learning benchmark. Every prediction is grounded in the raw information available at inward receipt.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Button onClick={() => scrollTo("predict")} className="rounded-none bg-primary px-5 text-primary-foreground hover:bg-primary/90">Generate prediction <ArrowUpRight size={16} /></Button><Button variant="outline" onClick={() => scrollTo("reports")} className="rounded-none border-border bg-transparent">Read audit trail <BookOpen size={16} /></Button></div>
          </div>
          <div className="relative border border-border bg-card/65 p-6 md:p-8">
            <div className="absolute right-5 top-5 font-mono text-[10px] text-muted-foreground">SYSTEM / 13 PHASES</div>
            <div className="eyebrow">Current model status</div>
            <div className="mt-5 flex items-center gap-3"><div className="h-3 w-3 bg-primary" /><span className="font-mono text-sm">Operational benchmark</span></div>
            <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-5 border-t border-border pt-5 text-sm"><div><div className="text-xs text-muted-foreground">Target</div><div className="mt-1 font-medium">Dispatch Duration</div></div><div><div className="text-xs text-muted-foreground">Prediction point</div><div className="mt-1 font-medium">At inward receipt</div></div><div><div className="text-xs text-muted-foreground">Training rows</div><div className="mt-1 font-mono">{training?.rows?.toLocaleString() ?? "39,957"}</div></div><div><div className="text-xs text-muted-foreground">Frozen estimate</div><div className="mt-1 font-mono">31 days</div></div></div>
            <div className="mt-8 border-l-2 border-primary pl-4 text-sm leading-6 text-muted-foreground">No meaningful signal was found beyond the historical median. This product makes that limitation visible.</div>
          </div>
        </div>
        <div className="mt-16 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4"><MetricCard label="MAE" value={`${formatNumber(metrics.mae, 4)} d`} note="Mean absolute error on the untouched test period." accent /><MetricCard label="RMSE" value={`${formatNumber(metrics.rmse, 4)} d`} note="Penalizes larger mistakes more heavily." /><MetricCard label="R²" value={formatNumber(metrics.r2, 4)} note="Near zero means no useful variance explained." /><MetricCard label="P90 absolute error" value={`${formatNumber(metrics.p90_absolute_error, 4)} d`} note="90% of absolute errors are below this value." /></div>
      </section>

      <section id="predict" className="scroll-mt-24 border-y border-border bg-secondary/40 py-16 md:py-24">
        <div className="container grid gap-12 lg:grid-cols-[.75fr_1.25fr]">
          <SectionHeader eyebrow="01 / Inference" title="Generate a model estimate." description="Submit only information available at inward receipt. The backend validates the raw schema and invokes the frozen Python artifact; no preprocessing is duplicated in this interface." />
          <div className="grid gap-6 md:grid-cols-[1fr_.72fr]">
            <form onSubmit={submitPrediction} className="border border-border bg-card p-6 md:p-8">
              <div className="grid gap-5 sm:grid-cols-2">
                {([['Product', 'Product name'], ['Brand', 'Brand'], ['Region', 'Region'], ['Price', 'Price in transaction currency']] as const).map(([key, label]) => <div key={key} className="space-y-2"><Label htmlFor={key} className="text-xs font-semibold">{label}</Label><Input id={key} value={form[key as keyof typeof form]} onChange={e => setForm({ ...form, [key]: e.target.value })} type={key === 'Price' ? 'number' : 'text'} min={key === 'Price' ? '0' : undefined} step={key === 'Price' ? '0.01' : undefined} placeholder={key === 'Price' ? 'e.g. 24999' : `Enter ${label.toLowerCase()}`} className="h-11 rounded-none bg-background" /></div>)}
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="inward-date" className="text-xs font-semibold">Inward Date</Label><Input id="inward-date" value={form["Inward Date"]} onChange={e => setForm({ ...form, "Inward Date": e.target.value })} type="date" className="h-11 rounded-none bg-background" /><p className="text-xs text-muted-foreground">The date inventory is received, before any dispatch outcome exists.</p></div>
              </div>
              {error && <div className="mt-5 flex items-start gap-2 border border-primary/30 bg-accent/40 p-3 text-sm text-primary"><CircleAlert size={16} className="mt-0.5 shrink-0" />{error}</div>}
              <Button type="submit" disabled={predictMutation.isPending} className="mt-7 h-11 w-full rounded-none bg-primary text-primary-foreground hover:bg-primary/90">{predictMutation.isPending ? "Running frozen pipeline…" : "Generate Prediction"}<ArrowUpRight size={16} /></Button>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole size={13} /> Dispatch Date and post-outcome fields are rejected.</div>
            </form>
            <div className="flex min-h-[300px] flex-col justify-between border border-border bg-foreground p-6 text-background md:p-8">
              <div><div className="eyebrow text-background/55">Prediction result</div>{result ? <><div className="mt-7 font-mono text-6xl font-semibold tracking-[-0.06em] text-primary-foreground">{result.predictionDays.toFixed(0)}<span className="ml-2 text-xl tracking-normal text-background/65">days</span></div><p className="mt-4 max-w-xs text-sm leading-6 text-background/65">Model estimate for expected dispatch duration. This is not a guarantee, commitment, or exact dispatch date.</p></> : <><div className="mt-7 text-2xl font-semibold tracking-tight">Ready when you are.</div><p className="mt-3 text-sm leading-6 text-background/65">Your result will appear here with the submitted context and the model’s honest estimate.</p></>}</div>
              {result && <div className="mt-10 border-t border-background/15 pt-4 text-xs text-background/55">Recorded to inference history · {new Date(result.createdAt ?? Date.now()).toLocaleString()}</div>}
            </div>
          </div>
        </div>
      </section>

      <section id="performance" className="container scroll-mt-24 py-16 md:py-24">
        <SectionHeader eyebrow="02 / Performance" title="The benchmark is the message." description="Metrics are loaded from the backend metadata and shown without visual smoothing. The learned candidates are included to make the model-selection decision inspectable." />
        <div className="grid gap-10 lg:grid-cols-[1.05fr_.95fr]">
          <div className="border border-border bg-card p-6 md:p-8"><div className="flex items-center justify-between"><div><div className="eyebrow">Dispatch Duration / test period</div><h3 className="mt-2 text-xl font-semibold">Candidate comparison</h3></div><Gauge className="text-primary" size={22} /></div><div className="mt-8 space-y-6">{comparisons.map(item => <div key={item.label}><div className="flex items-center justify-between text-sm"><span className="font-medium">{item.label}</span><span className="font-mono text-muted-foreground">MAE {item.mae.toFixed(4)} d</span></div><div className="mt-2 h-2 bg-secondary"><div className={`h-full ${item.label === "Median baseline" ? "bg-primary" : "bg-foreground/35"}`} style={{ width: `${(item.mae / metricMax) * 100}%` }} /></div><div className="mt-2 flex gap-4 font-mono text-[11px] text-muted-foreground"><span>RMSE {item.rmse.toFixed(4)}</span><span>R² {item.r2.toFixed(4)}</span></div></div>)}</div></div>
          <div className="border border-border bg-accent/35 p-6 md:p-8"><div className="eyebrow text-primary">Recovered historical model</div><h3 className="mt-2 text-xl font-semibold">Quantity Sold</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">A valid earlier implementation was recovered and reproduced. It solves a different target, so its metrics are shown for transparency—not as a direct apples-to-apples comparison.</p><div className="mt-8 grid grid-cols-3 gap-3"><div><div className="text-xs text-muted-foreground">MAE</div><div className="mt-1 font-mono text-xl">{RECOVERED_QUANTITY_SOLD_MAE.toFixed(4)}</div></div><div><div className="text-xs text-muted-foreground">RMSE</div><div className="mt-1 font-mono text-xl">2.8732</div></div><div><div className="text-xs text-muted-foreground">R²</div><div className="mt-1 font-mono text-xl">−0.0008</div></div></div><div className="mt-8 border-t border-primary/15 pt-5 text-sm leading-6 text-muted-foreground">The target changed. The 2.4957 MAE is a valid Quantity Sold result, not evidence of performance for Dispatch Duration.</div></div>
        </div>
        <div className="mt-10 grid gap-6 border-t border-border pt-10 md:grid-cols-3"><div><div className="eyebrow">MAE</div><p className="mt-2 text-sm leading-6 text-muted-foreground">Average absolute distance between the estimate and the observed dispatch duration.</p></div><div><div className="eyebrow">RMSE</div><p className="mt-2 text-sm leading-6 text-muted-foreground">A squared-error measure that makes large misses more visible.</p></div><div><div className="eyebrow">R²</div><p className="mt-2 text-sm leading-6 text-muted-foreground">The near-zero result indicates the features do not explain useful target variance.</p></div></div>
      </section>

      <section id="trust" className="scroll-mt-24 border-y border-border bg-secondary/40 py-16 md:py-24">
        <div className="container grid gap-12 lg:grid-cols-[.7fr_1.3fr]"><SectionHeader eyebrow="03 / Trust" title="What the model knows—and what it does not." description="The product treats model limitations as first-class information. No confidence interval or certainty language is invented where the artifact does not provide it." /><div className="grid gap-6 md:grid-cols-2"><div className="border border-primary/25 bg-accent/50 p-6 md:p-8"><ShieldCheck className="text-primary" size={24} /><h3 className="mt-5 text-xl font-semibold">No meaningful signal</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">Across multiple chronological windows, feature ablations, and model families, no learned model delivered meaningful improvement over simply predicting the historical median.</p><div className="mt-6 border-t border-primary/15 pt-5 text-xs leading-5 text-muted-foreground">The model should not be used for individual customer promises, automated commitments, staffing decisions, escalation decisions, or operational guarantees.</div></div><div className="border border-border bg-card p-6 md:p-8"><div className="eyebrow">Missing operational context</div><div className="mt-5 space-y-3">{limitations.map(item => <div key={item} className="flex gap-3 text-sm leading-6"><span className="mt-2 h-1.5 w-1.5 shrink-0 bg-primary" />{item}</div>)}</div></div></div></div>
      </section>

      <section id="contract" className="container scroll-mt-24 py-16 md:py-24"><SectionHeader eyebrow="04 / Contract" title="A small, explicit input surface." description="The backend owns the frozen transformation contract. The frontend only submits the five approved raw inputs." /><div className="grid gap-px border border-border bg-border md:grid-cols-2"><div className="bg-card p-6 md:p-8"><div className="flex items-center gap-2"><Check size={16} className="text-primary" /><h3 className="font-semibold">Valid at prediction time</h3></div><div className="mt-6 flex flex-wrap gap-2">{validFeatures.map(feature => <Badge key={feature} variant="outline" className="rounded-none border-primary/25 bg-accent/30 px-3 py-1 font-mono text-xs">{feature}</Badge>)}</div></div><div className="bg-card p-6 md:p-8"><div className="flex items-center gap-2"><X size={16} className="text-primary" /><h3 className="font-semibold">Excluded / leakage-sensitive</h3></div><div className="mt-6 flex flex-wrap gap-2">{excludedFeatures.map(feature => <Badge key={feature} variant="outline" className="rounded-none border-border px-3 py-1 font-mono text-xs text-muted-foreground">{feature}</Badge>)}</div></div></div></section>

      <section id="reports" className="scroll-mt-24 border-y border-border bg-secondary/40 py-16 md:py-24"><div className="container"><SectionHeader eyebrow="05 / Audit trail" title="Fourteen phases. One readable trail." description="Read-only reports preserve the decisions, checks, and evidence behind the current artifact. Nothing in this viewer can edit or overwrite the source documents." /><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{(reportsQuery.data ?? []).map((report, index) => <button key={report.filename} onClick={() => setSelectedReport(report)} className="group border border-border bg-card p-5 text-left transition-colors hover:border-primary/45 hover:bg-accent/35"><div className="flex items-center justify-between"><span className="font-mono text-xs text-primary">PHASE {String(index).padStart(2, "0")}</span><ChevronRight size={16} className="text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" /></div><div className="mt-4 text-sm font-semibold capitalize">{report.title}</div><div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><FileText size={13} /> Read-only markdown report</div></button>)}</div>{reportsQuery.data?.length === 0 && <div className="border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Audit reports are loading.</div>}</div></section>

      <section id="history" className="container scroll-mt-24 py-16 md:py-24"><SectionHeader eyebrow="06 / History" title="Every estimate, recorded." description="Prediction requests are persisted to the database with their raw inputs, result, and timestamp so the audit trail survives a browser refresh." /><div className="overflow-hidden border border-border bg-card"><div className="grid grid-cols-[1.2fr_1fr_1fr_.75fr] gap-4 border-b border-border bg-secondary/45 px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"><span>Product / brand</span><span>Region / price</span><span>Inward date</span><span className="text-right">Estimate</span></div>{(historyQuery.data ?? []).map(row => <div key={row.id} className="grid grid-cols-[1.2fr_1fr_1fr_.75fr] gap-4 border-b border-border/70 px-5 py-4 text-sm last:border-b-0"><span className="min-w-0 truncate"><span className="block truncate font-medium">{row.product}</span><span className="block truncate text-xs text-muted-foreground">{row.brand}</span></span><span><span className="block truncate">{row.region}</span><span className="block font-mono text-xs text-muted-foreground">{row.price}</span></span><span className="font-mono text-xs text-muted-foreground">{row.inwardDate}</span><span className="text-right font-mono font-semibold text-primary">{Number(row.predictionDays).toFixed(0)} d</span></div>)}{historyQuery.data?.length === 0 && <div className="p-10 text-center text-sm text-muted-foreground">No predictions recorded yet. Generate the first estimate above.</div>}</div></section>

      <section id="system" className="border-t border-border bg-foreground py-14 text-background"><div className="container grid gap-10 md:grid-cols-[1fr_1fr]"><div><div className="eyebrow text-background/50">System information</div><h2 className="mt-3 text-2xl font-semibold">Frozen, inspectable, and deliberately modest.</h2><p className="mt-4 max-w-lg text-sm leading-6 text-background/60">The serialized artifact, exact dataset hash, training period, validation methodology, and feature contract remain the source of truth behind this interface.</p></div><div className="grid gap-3 text-sm"><div className="flex items-center justify-between border-b border-background/15 pb-3"><span className="text-background/55">Model type</span><span className="font-mono">{metadata?.model_class?.split(".").pop() ?? "DummyRegressor"}</span></div><div className="flex items-center justify-between border-b border-background/15 pb-3"><span className="text-background/55">Training period</span><span className="font-mono">{training?.start ?? "2023-03-21"} → {training?.end ?? "2024-10-24"}</span></div><div className="flex items-center justify-between border-b border-background/15 pb-3"><span className="text-background/55">Dataset SHA-256</span><span className="font-mono text-xs">{shortHash(metadata?.dataset_sha256)}</span></div><div className="flex items-center justify-between"><span className="text-background/55">Artifact role</span><span className="font-mono">{metadata?.artifact_role ?? "baseline"}</span></div></div></div></section>
    </main>

    {selectedReport && <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/45 p-4" role="dialog" aria-modal="true" aria-label="Read-only phase report"><div className="flex max-h-[88vh] w-full max-w-4xl flex-col border border-border bg-card shadow-2xl"><div className="flex items-center justify-between border-b border-border px-5 py-4"><div><div className="eyebrow text-primary">Read-only report</div><div className="mt-1 text-sm font-semibold capitalize">{selectedReport.title}</div></div><button onClick={() => setSelectedReport(null)} className="p-2 text-muted-foreground hover:text-primary" aria-label="Close report"><X size={18} /></button></div><pre className="overflow-auto whitespace-pre-wrap p-6 text-xs leading-6 text-foreground/80 md:p-8">{reportQuery.data ?? "Loading report…"}</pre></div></div>}

    <footer className="border-t border-border bg-background py-6"><div className="container flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span>Mobile Sales ML · transparent audit interface</span><span className="flex items-center gap-2"><Database size={13} /> Persistent history · <Clock3 size={13} /> Frozen artifact</span></div></footer>
  </div>;
}
