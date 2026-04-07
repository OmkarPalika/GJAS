import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-destructive">Something Went Wrong</CardTitle>
              <CardDescription>
                We encountered an error while loading this page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-destructive/15 border border-destructive rounded-md p-3 text-destructive text-sm">
                <p><strong>Error:</strong> {this.state.error?.message || 'Unknown error'}</p>
              </div>
              <Button onClick={this.resetError} className="w-full">
                Try Again
              </Button>
              <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
                Reload Page
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}