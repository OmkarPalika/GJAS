'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import LegalNetworkGraph from '@/components/visualizations/LegalNetworkGraph';
import LegalSystemBarChart from '@/components/visualizations/LegalSystemBarChart';
import { NetworkData, BarChartData } from '@/types/visualization';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

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
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please login to access visualization features
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push('/auth/login')} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle>Legal Data Visualization</CardTitle>
            <CardDescription>
              Interactive visualizations of legal relationships, case law connections, and treaty networks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => router.push('/')}>Home</Button>
              <Button variant="outline" size="sm" onClick={() => router.push('/datasets')}>Datasets</Button>
              <Button variant="outline" size="sm" onClick={() => router.push('/rag')}>RAG Search</Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <div className="bg-destructive/15 border border-destructive rounded-md p-4">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {/* Main Visualization */}
        <Card>
          <CardHeader>
            <CardTitle>Advanced Legal Data Visualizations</CardTitle>
            <CardDescription>
              Explore complex legal relationships through interactive visualizations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
              <TabsList>
                <TabsTrigger value="network">Legal Network Graph</TabsTrigger>
                <TabsTrigger value="distribution">System Distribution</TabsTrigger>
                <TabsTrigger value="timeline">Timeline Analysis</TabsTrigger>
              </TabsList>

              <TabsContent value="network">
                {loading ? (
                  <div className="space-y-4 mt-4">
                    <Skeleton className="h-[600px] w-full" />
                  </div>
                ) : (
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold mb-4">Legal Relationship Network</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Interactive graph showing connections between constitutions, case law, treaties, and courts
                    </p>
                    <div className="bg-muted rounded-lg p-4">
                      <LegalNetworkGraph 
                        data={sampleNetworkData} 
                        width={800} 
                        height={550}
                      />
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground">
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
              </TabsContent>

              <TabsContent value="distribution">
                {loading ? (
                  <div className="space-y-2 mt-4">
                    <Skeleton className="h-40 w-full" />
                  </div>
                ) : (
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold mb-4">Legal System Distribution</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Bar chart showing the distribution of legal documents by legal system type
                    </p>
                    <div className="bg-muted rounded-lg p-4">
                      <LegalSystemBarChart 
                        data={sampleBarChartData} 
                        width={800} 
                        height={450}
                      />
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground">
                      <p><strong>Analysis:</strong> The chart shows the relative distribution of legal documents across different legal systems in our database.</p>
                      <p>Common law systems have the highest representation, followed by civil law and mixed systems.</p>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="timeline">
                <div className="mt-4 text-center py-12">
                  <h3 className="text-lg font-semibold mb-2">Timeline Visualization</h3>
                  <p className="text-muted-foreground mb-4">Historical timeline of legal developments</p>
                  <Badge variant="secondary" className="mb-4">
                    Coming Soon
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    This feature will show the historical development of legal systems over time
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-blue-600">Interactive Exploration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Drag, zoom, and hover to explore legal relationships in detail
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">Data-Driven Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Visual representations of complex legal connections and patterns
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-purple-600">Cross-Jurisdictional Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Compare legal systems and their interrelationships across countries
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Data Source Info */}
        <Card>
          <CardHeader>
            <CardTitle>About These Visualizations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              These visualizations are based on data from:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside ml-4 space-y-1">
              <li>199 national constitutions from the Constitute Project</li>
              <li>Case law from multiple jurisdictions</li>
              <li>International treaties and conventions</li>
              <li>Court hierarchy and jurisdiction data</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-3">
              Note: Sample data is shown. In production, these visualizations would connect to live data from our expanded datasets.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};