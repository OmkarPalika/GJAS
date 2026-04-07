'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { CaseLaw, Treaty } from '@/types/api';

export default function DatasetsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'case-law' | 'treaties'>('case-law');
  const [caseLawData, setCaseLawData] = useState<CaseLaw[]>([]);
  const [treatiesData, setTreatiesData] = useState<Treaty[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filters, setFilters] = useState({
    jurisdiction: '',
    legalSystem: '',
    status: '',
    topic: ''
  });

  const fetchCaseLaw = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const url = 'http://localhost:5000/api/case-law?';

      // Add filters
      const params = new URLSearchParams();
      if (filters.jurisdiction) params.append('jurisdiction', filters.jurisdiction);
      if (filters.legalSystem) params.append('legalSystem', filters.legalSystem);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(url + params.toString());
      const data = await response.json();

      if (data.success) {
        setCaseLawData(data.data);
      } else {
        setError(data.error || 'Failed to fetch case law');
      }
    } catch (err) {
      console.error('Error fetching case law:', err);
      setError('Failed to fetch case law');
    } finally {
      setLoading(false);
    }
  }, [filters, searchQuery]);

  const fetchTreaties = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const url = 'http://localhost:5000/api/treaties?';

      // Add filters
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.topic) params.append('topic', filters.topic);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(url + params.toString());
      const data = await response.json();

      if (data.success) {
        setTreatiesData(data.data);
      } else {
        setError(data.error || 'Failed to fetch treaties');
      }
    } catch (err) {
      console.error('Error fetching treaties:', err);
      setError('Failed to fetch treaties');
    } finally {
      setLoading(false);
    }
  }, [filters, searchQuery]);

  // Fetch data based on active tab
  useEffect(() => {
    if (activeTab === 'case-law') {
      fetchCaseLaw();
    } else {
      fetchTreaties();
    }
  }, [activeTab, filters, fetchCaseLaw, fetchTreaties]);

  const handleFilterChange = (filterName: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const renderCaseLawTable = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border">
        <thead>
          <tr className="bg-gray-100">
            <th className="py-2 px-4 border-b text-left">Title</th>
            <th className="py-2 px-4 border-b text-left">Court</th>
            <th className="py-2 px-4 border-b text-left">Jurisdiction</th>
            <th className="py-2 px-4 border-b text-left">Date</th>
            <th className="py-2 px-4 border-b text-left">Legal System</th>
            <th className="py-2 px-4 border-b text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {caseLawData.length > 0 ? caseLawData.map((item) => (
            <tr key={item.caseId} className="hover:bg-gray-50">
              <td className="py-2 px-4 border-b">{item.title}</td>
              <td className="py-2 px-4 border-b">{item.court}</td>
              <td className="py-2 px-4 border-b">{item.jurisdiction}</td>
              <td className="py-2 px-4 border-b">{formatDate(item.decisionDate)}</td>
              <td className="py-2 px-4 border-b">{item.legalSystem.replace('_', ' ')}</td>
              <td className="py-2 px-4 border-b">
                <button
                  onClick={() => router.push(`/case-law/${item.caseId}`)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  View
                </button>
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan={6} className="py-4 text-center text-gray-500">
                {loading ? 'Loading...' : 'No case law found'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const renderTreatiesTable = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border">
        <thead>
          <tr className="bg-gray-100">
            <th className="py-2 px-4 border-b text-left">Title</th>
            <th className="py-2 px-4 border-b text-left">Status</th>
            <th className="py-2 px-4 border-b text-left">Adoption Date</th>
            <th className="py-2 px-4 border-b text-left">Parties</th>
            <th className="py-2 px-4 border-b text-left">Topics</th>
            <th className="py-2 px-4 border-b text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {treatiesData.length > 0 ? treatiesData.map((item) => (
            <tr key={item.treatyId} className="hover:bg-gray-50">
              <td className="py-2 px-4 border-b">{item.title}</td>
              <td className="py-2 px-4 border-b">{item.status.replace('_', ' ')}</td>
              <td className="py-2 px-4 border-b">{formatDate(item.adoptionDate || '')}</td>
              <td className="py-2 px-4 border-b">{item.parties?.length || 0}</td>
              <td className="py-2 px-4 border-b">{item.topics?.join(', ') || 'N/A'}</td>
              <td className="py-2 px-4 border-b">
                <button
                  onClick={() => router.push(`/treaties/${item.treatyId}`)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  View
                </button>
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan={6} className="py-4 text-center text-gray-500">
                {loading ? 'Loading...' : 'No treaties found'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please login to access datasets</p>
          <button
            onClick={() => router.push('/auth/login')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Expanded Legal Datasets</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/')}
                className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
              >
                Home
              </button>
              <button
                onClick={() => router.push('/rag')}
                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
              >
                RAG Search
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('case-law')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'case-law'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Case Law
              </button>
              <button
                onClick={() => setActiveTab('treaties')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'treaties'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Treaties
              </button>
            </nav>
          </div>

          {/* Search and Filters */}
          <div className="mb-6">
            <div className="flex gap-4 mb-4">
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => {
                  if (activeTab === 'case-law') fetchCaseLaw();
                  else fetchTreaties();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Search
              </button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 flex-wrap">
              {activeTab === 'case-law' ? (
                <>
                  <select
                    value={filters.jurisdiction}
                    onChange={(e) => handleFilterChange('jurisdiction', e.target.value)}
                    className="p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">All Jurisdictions</option>
                    <option value="US">United States</option>
                    <option value="UK">United Kingdom</option>
                    <option value="EU">European Union</option>
                    <option value="India">India</option>
                    <option value="Canada">Canada</option>
                  </select>
                  <select
                    value={filters.legalSystem}
                    onChange={(e) => handleFilterChange('legalSystem', e.target.value)}
                    className="p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">All Legal Systems</option>
                    <option value="common_law">Common Law</option>
                    <option value="civil_law">Civil Law</option>
                    <option value="islamic_law">Islamic Law</option>
                    <option value="mixed">Mixed</option>
                    <option value="international">International</option>
                  </select>
                </>
              ) : (
                <>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">All Statuses</option>
                    <option value="in_force">In Force</option>
                    <option value="signed">Signed</option>
                    <option value="ratified">Ratified</option>
                    <option value="terminated">Terminated</option>
                  </select>
                  <select
                    value={filters.topic}
                    onChange={(e) => handleFilterChange('topic', e.target.value)}
                    className="p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">All Topics</option>
                    <option value="human rights">Human Rights</option>
                    <option value="trade">Trade</option>
                    <option value="environment">Environment</option>
                    <option value="armed conflict">Armed Conflict</option>
                    <option value="maritime">Maritime</option>
                  </select>
                </>
              )}
              <button
                onClick={() => {
                  setFilters({
                    jurisdiction: '',
                    legalSystem: '',
                    status: '',
                    topic: ''
                  });
                  setSearchQuery('');
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Data Table */}
          <div className="overflow-hidden">
            {activeTab === 'case-law' ? renderCaseLawTable() : renderTreatiesTable()}
          </div>

          {/* Stats */}
          <div className="mt-6 pt-4 border-t">
            <h3 className="font-semibold mb-2">Dataset Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-3 rounded">
                <dt className="text-sm text-gray-500">Total Records</dt>
                <dd className="text-2xl font-bold">
                  {activeTab === 'case-law'
                    ? caseLawData.length
                    : treatiesData.length}
                </dd>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <dt className="text-sm text-gray-500">Data Type</dt>
                <dd className="text-xl font-semibold capitalize">
                  {activeTab.replace('-', ' ')}
                </dd>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <dt className="text-sm text-gray-500">Coverage</dt>
                <dd className="text-xl font-semibold">Global</dd>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <dt className="text-sm text-gray-500">Access</dt>
                <dd className="text-xl font-semibold">Public</dd>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} Global Judicial Assembly Simulator. All datasets are for educational and research purposes.
        </div>
      </footer>
    </div>
  );
}