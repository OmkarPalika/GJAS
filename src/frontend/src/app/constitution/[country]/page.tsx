"use client";

import { useState, useEffect } from 'react';

export default function ConstitutionPage({ params }: { params: Promise<{ country: string }> }) {
  const [constitution, setConstitution] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConstitution = async () => {
      try {
        const { country } = await params;
        const response = await fetch(`http://localhost:5000/api/constitutions/${country}`);
        const data = await response.json();
        setConstitution(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching constitution:', error);
        setLoading(false);
      }
    };

    fetchConstitution();
  }, [params]);

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left w-full">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            {loading ? 'Loading...' : constitution?.country}
          </h1>
          {loading ? (
            <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
              Loading constitution...
            </p>
          ) : (
            <div className="w-full max-h-96 overflow-y-auto text-left">
              <pre className="whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">
                {constitution?.text}
              </pre>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}