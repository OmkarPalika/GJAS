'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestPage() {
  const [testResult, setTestResult] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const runBackendTest = async () => {
    setLoading(true);
    setError('');
    setTestResult(null);

    try {
      const response = await fetch('/api/test');
      const data = await response.json();
      setTestResult(data);
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to run backend test');
      console.error('Backend test error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runBackendTest();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Backend Connection Test</CardTitle>
          <CardDescription>
            Test the connection to the backend server
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={runBackendTest} disabled={loading}>
            {loading ? 'Testing...' : 'Test Backend Connection'}
          </Button>

          {error && (
            <div className="bg-destructive/15 border border-destructive rounded-md p-3 text-destructive">
              <strong>Error:</strong> {error}
            </div>
          )}

          {testResult !== null && (
            <div className="bg-muted rounded-md p-4">
              <pre className="text-sm overflow-x-auto">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}

          {!testResult && !error && (
            <div className="text-muted-foreground">
              Click the button to test backend connection...
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Troubleshooting Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-2">
            <li>Ensure the backend server is running</li>
            <li>Check that the backend URL is correctly configured in environment variables</li>
            <li>Verify the backend authentication endpoints are working</li>
            <li>Check network connectivity between frontend and backend</li>
            <li>Review backend server logs for errors</li>
          </ol>

          <div className="mt-4">
            <h4 className="font-medium mb-2">Common Issues:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Backend server not running</li>
              <li>CORS configuration issues</li>
              <li>Incorrect backend URL in environment variables</li>
              <li>Network/firewall blocking requests</li>
              <li>Authentication endpoint not responding with JSON</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}