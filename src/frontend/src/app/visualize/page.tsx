'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import LegalNetworkGraph from '@/components/visualizations/LegalNetworkGraph';
import LegalSystemBarChart from '@/components/visualizations/LegalSystemBarChart';
import { NetworkData, BarChartData } from '@/types/visualization';

const sampleNetworkData: NetworkData = {
  nodes: [
    { id: 'US Constitution', type: 'constitution', description: 'United States Constitution' },
    { id: 'Marbury v Madison', type: 'case_law', description: 'Landmark US Supreme Court case' },
    { id: 'Universal Declaration', type: 'treaty', description: 'UN Human Rights Declaration' },
    { id: 'US Supreme Court', type: 'court', description: 'Highest court in the United States' },
    { id: 'ICJ', type: 'court', description: 'International Court of Justice' },
    { id: 'Geneva Convention', type: 'treaty', description: 'International humanitarian law' }
  ],
  links: [
    { source: 'US Constitution', target: 'Marbury v Madison', value: 3 },
    { source: 'US Constitution', target: 'US Supreme Court', value: 5 },
    { source: 'Universal Declaration', target: 'ICJ', value: 2 },
    { source: 'Universal Declaration', target: 'Geneva Convention', value: 1 },
    { source: 'Marbury v Madison', target: 'US Supreme Court', value: 4 }
  ]
};

const sampleBarChartData: BarChartData[] = [
  { legalSystem: 'common_law', count: 45 },
  { legalSystem: 'civil_law', count: 32 },
  { legalSystem: 'islamic_law', count: 18 },
  { legalSystem: 'mixed', count: 25 },
  { legalSystem: 'international', count: 12 }
];

export default function VisualizePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('network');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // In a real implementation, you would fetch data from the backend
  const fetchVisualizationData = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      // In production, you would fetch from your API
      // const response = await fetch('/api/visualization/data');
      // const data = await response.json();
    } catch (err) {
      console.error('Error fetching visualization data:', err);
      return 'Failed to load visualization data';
    }
    return null;
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');
      const error = await fetchVisualizationData();
      if (error) {
        setError(error);
      }
      setLoading(false);
    };
    
    loadData();
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please login to access visualization features</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Legal Data Visualization</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/')}
                className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
              >
                Home
              </button>
              <button
                onClick={() => router.push('/datasets')}
                className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
              >
                Datasets
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
          {/* Page Header */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Advanced Legal Data Visualizations
            </h2>
            <p className="text-gray-600">
              Interactive visualizations of legal relationships, case law connections, and treaty networks
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('network')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'network' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Legal Network Graph
              </button>
              <button
                onClick={() => setActiveTab('distribution')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'distribution' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                System Distribution
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'timeline' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Timeline Analysis
              </button>
            </nav>
          </div>

          {/* Visualization Container */}
          <div className="bg-gray-50 rounded-lg p-6 min-h-[500px]">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <>
                {activeTab === 'network' && (
                  <div className="h-[600px]">
                    <h3 className="text-lg font-semibold mb-4">Legal Relationship Network</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Interactive graph showing connections between constitutions, case law, treaties, and courts
                    </p>
                    <LegalNetworkGraph 
                      data={sampleNetworkData} 
                      width={800} 
                      height={550}
                    />
                    <div className="mt-4 text-sm text-gray-600">
                      <p><strong>Legend:</strong></p>
                      <ul className="list-disc list-inside ml-4">
                        <li><span className="text-blue-600">●</span> Constitutions</li>
                        <li><span className="text-green-600">●</span> Case Law</li>
                        <li><span className="text-yellow-600">●</span> Treaties</li>
                        <li><span className="text-red-600">●</span> Courts</li>
                      </ul>
                      <p className="mt-2">Hover over nodes to see details. Drag nodes to rearrange the graph.</p>
                    </div>
                  </div>
                )}

                {activeTab === 'distribution' && (
                  <div className="h-[500px]">
                    <h3 className="text-lg font-semibold mb-4">Legal System Distribution</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Bar chart showing the distribution of legal documents by legal system type
                    </p>
                    <LegalSystemBarChart 
                      data={sampleBarChartData} 
                      width={800} 
                      height={450}
                    />
                    <div className="mt-4 text-sm text-gray-600">
                      <p><strong>Analysis:</strong> The chart shows the relative distribution of legal documents across different legal systems in our database.</p>
                      <p>Common law systems have the highest representation, followed by civil law and mixed systems.</p>
                    </div>
                  </div>
                )}

                {activeTab === 'timeline' && (
                  <div className="h-[500px] flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <h3 className="text-lg font-semibold mb-2">Timeline Visualization</h3>
                      <p className="mb-4">Historical timeline of legal developments</p>
                      <div className="bg-blue-100 border border-blue-200 text-blue-700 px-4 py-2 rounded">
                        Timeline visualization coming soon
                      </div>
                      <p className="text-sm mt-4">
                        This feature will show the historical development of legal systems over time
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Features Section */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Interactive Exploration</h4>
              <p className="text-sm text-blue-700">
                Drag, zoom, and hover to explore legal relationships in detail
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">Data-Driven Insights</h4>
              <p className="text-sm text-green-700">
                Visual representations of complex legal connections and patterns
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-semibold text-purple-800 mb-2">Cross-Jurisdictional Analysis</h4>
              <p className="text-sm text-purple-700">
                Compare legal systems and their interrelationships across countries
              </p>
            </div>
          </div>

          {/* Data Source Info */}
          <div className="mt-6 pt-4 border-t">
            <h4 className="font-semibold mb-2">About These Visualizations</h4>
            <p className="text-sm text-gray-600 mb-2">
              These visualizations are based on data from:
            </p>
            <ul className="text-sm text-gray-600 list-disc list-inside ml-4">
              <li>199 national constitutions from the Constitute Project</li>
              <li>Case law from multiple jurisdictions</li>
              <li>International treaties and conventions</li>
              <li>Court hierarchy and jurisdiction data</li>
            </ul>
            <p className="text-xs text-gray-500 mt-3">
              Note: Sample data is shown. In production, these visualizations would connect to live data from our expanded datasets.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} Global Judicial Assembly Simulator. Visualizations for educational and research purposes.
        </div>
      </footer>
    </div>
  );
};