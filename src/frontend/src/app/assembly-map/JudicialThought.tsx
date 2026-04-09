"use client";

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface JudicialThoughtProps {
  thinkingLog: string;
  status: 'pending' | 'deliberating' | 'complete' | 'edge_case' | 'failed' | 'dormant';
  startedAt?: string | Date;
  completedAt?: string | Date;
}

export function JudicialThought({ thinkingLog, status, startedAt, completedAt }: JudicialThoughtProps) {
  const [isOpen, setIsOpen] = useState(status === 'deliberating');
  const [elapsed, setElapsed] = useState<string>('0s');

  useEffect(() => {
    if (status === 'deliberating' && startedAt) {
      setIsOpen(true);
      const start = new Date(startedAt).getTime();
      const interval = setInterval(() => {
        const now = Date.now();
        setElapsed(((now - start) / 1000).toFixed(0) + 's');
      }, 1000);
      return () => clearInterval(interval);
    } else if (status === 'complete' && startedAt && completedAt) {
      const start = new Date(startedAt).getTime();
      const end = new Date(completedAt).getTime();
      setElapsed(((end - start) / 1000).toFixed(0) + 's');
    }
  }, [status, startedAt, completedAt]);

  const headerText = status === 'deliberating' 
    ? `thinking for ${elapsed}` 
    : `thought for ${elapsed}`;

  if (!thinkingLog && status !== 'deliberating') return null;

  return (
    <div className="mt-4 flex flex-col gap-2 w-full select-none" onClick={e => e.stopPropagation()}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-muted-foreground/60 hover:text-muted-foreground transition-colors group w-fit"
      >
        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <span className="text-[10px] lowercase font-medium tracking-tight flex items-center gap-1.5 transition-all">
          {headerText}
        </span>
      </button>

      {isOpen && (
        <div className="bg-[#05070a]/80 backdrop-blur-md border border-border/20 rounded-xl p-5 font-mono text-[11px] text-muted-foreground/90 leading-relaxed shadow-2xl max-h-[400px] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="prose prose-invert prose-xs max-w-none prose-p:leading-relaxed prose-headings:mb-2 prose-headings:mt-4 first:prose-headings:mt-0 prose-strong:text-foreground prose-em:text-foreground/80">
            {thinkingLog ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {thinkingLog}
              </ReactMarkdown>
            ) : (
              <p className="opacity-40 italic">Initializing neural pathways...</p>
            )}
            {status === 'deliberating' && (
              <span className="inline-block w-1.5 h-3 bg-blue-500 ml-1 animate-pulse align-middle" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
