import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Scale, Shield, Globe, TrendingUp, BookOpen, SearchCode } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-24 pb-32 hero-gradient border-b">
        <div className="container mx-auto px-6 text-center max-w-5xl">
          <Badge className="mb-6 px-4 py-1 bg-accent-foreground/20 text-accent-foreground border-accent-foreground/20 font-sans tracking-widest text-[10px] uppercase">
            The Global Standard for Legal Deliberation
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-[1.1] tracking-tight">
            The World&apos;s Legal Systems <br />
            <span className="text-muted-foreground font-serif italic">at your fingertips.</span>
          </h1>
          <p className="text-xl text-muted-foreground/80 font-sans max-w-2xl mx-auto mb-12 leading-relaxed">
            Deliberate across jurisdictions, analyze constitutional shifts, and query global case law with the industry&apos;s leading AI-driven assembly simulator.
          </p>

          {/* Main Search Entry */}
          <div className="relative max-w-2xl mx-auto group shadow-premium rounded-xl">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
              <SearchCode className="h-5 w-5 text-primary z-10" />
            </div>
            <Input
              type="text"
              placeholder="Search across 1,500+ global documents..."
              className="w-full h-16 pl-14 pr-32 text-lg rounded-xl border-2 border-primary/10 focus-visible:ring-offset-0 focus-visible:ring-accent/30 transition-all focus:border-accent/40 bg-background/50 backdrop-blur-sm"
            />
            <Link href="/rag-search" className="absolute right-2 inset-y-2">
              <Button className="h-full px-8 rounded-lg shadow-sm font-bold uppercase tracking-widest text-xs">
                Search RAG
              </Button>
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground font-medium uppercase tracking-tighter">
            <Link href="/compare" className="flex items-center gap-2 underline underline-offset-4 decoration-accent/30 cursor-pointer hover:text-primary transition-colors">
              <Globe className="h-4 w-4" /> Compare Jurisdictions
            </Link>
            <Link href="/laboratory" className="flex items-center gap-2 underline underline-offset-4 decoration-accent/30 cursor-pointer hover:text-primary transition-colors">
              <Scale className="h-4 w-4" /> Start Deliberation
            </Link>
            <Link href="/archives" className="flex items-center gap-2 underline underline-offset-4 decoration-accent/30 cursor-pointer hover:text-primary transition-colors">
              <BookOpen className="h-4 w-4" /> Browse Database
            </Link>
          </div>
        </div>
      </section>

      {/* Stats/Status Bar */}
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-8 border-y border-border/50">
          <div className="text-center">
            <div className="text-3xl font-serif font-bold">190+</div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">Countries</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-serif font-bold">1.2M+</div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">Legal Precedents</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-serif font-bold">AI Native</div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">Infrastructure</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-serif font-bold">Real-time</div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">Collaboration</div>
          </div>
        </div>
      </div>

      {/* Core Capabilities */}
      <section className="py-24 bg-secondary/30">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8 text-left max-w-5xl mx-auto">
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">Advanced Assembly <br /> Capabilities</h2>
              <p className="text-muted-foreground text-lg">Harness multi-agent deliberation and vector-retrieval to understand the evolving legal landscape.</p>
            </div>
            <Link href="/about">
              <Button variant="outline" className="px-8 border-primary/20 hover:bg-primary/5">Explaining the Tech</Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-5xl mx-auto">
            <div className="group">
              <div className="mb-6 p-3 w-fit rounded-lg bg-background shadow-card border group-hover:border-accent/40 transition-colors">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Sovereign Analysis</h3>
              <p className="text-muted-foreground leading-relaxed">Detailed constitutional frameworks indexed and searchable with cross-jurisdictional mapping.</p>
            </div>
            <div className="group">
              <div className="mb-6 p-3 w-fit rounded-lg bg-background shadow-card border group-hover:border-accent/40 transition-colors">
                <Scale className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">AI Deliberation</h3>
              <p className="text-muted-foreground leading-relaxed">State-of-the-art multi-turn debate engine simulated by specialized judicial LLM agents.</p>
            </div>
            <div className="group">
              <div className="mb-6 p-3 w-fit rounded-lg bg-background shadow-card border group-hover:border-accent/40 transition-colors">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Precedent Tracking</h3>
              <p className="text-muted-foreground leading-relaxed">Monitor changes in legal standards and treaty obligations in real-time as the assembly progresses.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-32 border-t">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-8">Begin your simulation today.</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/archives">
              <Button size="lg" className="px-10 py-7 text-lg shadow-premium">Explore Database</Button>
            </Link>
            <Link href="/signup">
              <Button size="lg" variant="outline" className="px-10 py-7 text-lg">Request Expert Access</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
