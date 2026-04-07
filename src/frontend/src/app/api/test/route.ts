import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test backend connection
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    
    try {
      const response = await fetch(`${backendUrl}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      if (!response.ok) {
        const text = await response.text();
        return NextResponse.json({
          success: false,
          error: `Backend responded with status ${response.status}`,
          response: text.substring(0, 500) // Limit response size
        }, { status: 500 });
      }

      const data = await response.json();
      return NextResponse.json({
        success: true,
        backendUrl,
        backendResponse: data
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return NextResponse.json({
            success: false,
            error: 'Backend request timed out',
            backendUrl
          }, { status: 504 });
        } else if (error.message.includes('failed to fetch')) {
          return NextResponse.json({
            success: false,
            error: 'Unable to connect to backend server',
            backendUrl,
            details: 'Please ensure the backend server is running and accessible'
          }, { status: 503 });
        }
      }
      
      return NextResponse.json({
        success: false,
        error: 'Backend connection test failed',
        backendUrl,
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}