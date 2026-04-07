"use client";

import { useState } from 'react';

export default function RAGPage() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [generatedResponse, setGeneratedResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/rag/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/rag/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      setGeneratedResponse(data.response);
    } catch (error) {
      console.error('Error generating response:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left w-full">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            RAG Search & Generate
          </h1>
          <div className="w-full flex gap-2">
            <input
              type="text"
              placeholder="Enter your query..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 p-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:text-white"
            />
            <button
              onClick={handleSearch}
              className="p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              disabled={loading}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
            <button
              onClick={handleGenerate}
              className="p-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate'}
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="w-full max-h-96 overflow-y-auto text-left mt-4">
              <h2 className="text-xl font-semibold text-black dark:text-zinc-50">Search Results:</h2>
              {searchResults.map((result, index) => (
                <div key={index} className="p-4 mb-4 border border-gray-200 rounded-md dark:border-gray-700">
                  <h3 className="font-medium text-black dark:text-zinc-50">
                    {result.metadata.country} ({result.metadata.fileName})
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400 mt-2">
                    {result.text.substring(0, 200)}...
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-2">
                    Similarity: {result.similarity ? result.similarity.toFixed(4) : 'N/A'}
                  </p>
                </div>
              ))}
            </div>
          )}
          {generatedResponse && (
            <div className="w-full text-left mt-4">
              <h2 className="text-xl font-semibold text-black dark:text-zinc-50">Generated Response:</h2>
              <pre className="whitespace-pre-wrap p-4 border border-gray-200 rounded-md dark:border-gray-700 text-zinc-600 dark:text-zinc-400">
                {generatedResponse}
              </pre>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}