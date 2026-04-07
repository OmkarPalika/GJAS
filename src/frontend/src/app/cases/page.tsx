"use client";

import { useState, useEffect } from 'react';

interface Constitution {
  country: string;
  // Add other properties as needed
}

export default function CasesPage() {
  const [constitutions, setConstitutions] = useState<Constitution[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConstitutions = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/constitutions');
        const data = await response.json();
        setConstitutions(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching constitutions:', error);
        setLoading(false);
      }
    };

    fetchConstitutions();
  }, []);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    try {
      const response = await fetch(`http://localhost:5000/api/constitutions/search/${searchTerm}`);
      const data = await response.json();
      setConstitutions(data);
    } catch (error) {
      console.error('Error searching constitutions:', error);
    }
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left w-full">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Constitutions
          </h1>
          <div className="w-full flex gap-2">
            <input
              type="text"
              placeholder="Search constitutions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 p-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:text-white"
            />
            <button
              onClick={handleSearch}
              className="p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Search
            </button>
          </div>
          {loading ? (
            <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
              Loading constitutions...
            </p>
          ) : (
            <div className="w-full max-h-96 overflow-y-auto">
              <ul className="space-y-2 text-left">
                {constitutions.map((constitution, index) => (
                  <li key={index} className="p-2 border-b border-gray-200 dark:border-gray-700">
                    <a
                      href={`/constitution/${encodeURIComponent(constitution.country)}`}
                      className="text-blue-500 hover:underline"
                    >
                      {constitution.country}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}