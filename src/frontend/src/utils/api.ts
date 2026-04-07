import { ApiResponse } from '../types/api';

const API_BASE_URL = 'http://localhost:5000/api';

class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function fetchWithAuth<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body: unknown = null,
  accessToken?: string
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  
  const options: RequestInit = {
    method,
    headers,
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(errorData.error || 'API request failed', response.status);
    }
    
    const data: ApiResponse<T> = await response.json();
    
    if (!data.success) {
      throw new ApiError(data.error || 'Request was not successful', response.status);
    }
    
    if (data.data === undefined) {
      throw new ApiError('No data returned from API', response.status);
    }
    
    return data.data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new ApiError(error.message, 500);
    }
    throw new ApiError('Unknown error occurred', 500);
  }
}

export async function fetchConstitutions(accessToken?: string): Promise<unknown[]> {
  return fetchWithAuth<unknown[]>('/constitutions', 'GET', null, accessToken);
}

export async function ragSearch(
  query: string,
  accessToken?: string
): Promise<unknown> {
  return fetchWithAuth<unknown>('/rag/search', 'POST', { query }, accessToken);
}

export async function ragAnalyze(
  query: string,
  accessToken?: string
): Promise<unknown> {
  return fetchWithAuth<unknown>('/rag/analyze', 'POST', { query }, accessToken);
}

export async function fetchCaseLaw(
  params: {
    jurisdiction?: string;
    legalSystem?: string;
    search?: string;
    limit?: number;
    skip?: number;
  } = {},
  accessToken?: string
): Promise<unknown[]> {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      queryParams.append(key, String(value));
    }
  });
  
  return fetchWithAuth<unknown[]>(`/case-law${queryParams.toString() ? `?${queryParams.toString()}` : ''}`, 'GET', null, accessToken);
}

export async function fetchTreaties(
  params: {
    status?: string;
    topic?: string;
    search?: string;
    limit?: number;
    skip?: number;
  } = {},
  accessToken?: string
): Promise<unknown[]> {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      queryParams.append(key, String(value));
    }
  });
  
  return fetchWithAuth<unknown[]>(`/treaties${queryParams.toString() ? `?${queryParams.toString()}` : ''}`, 'GET', null, accessToken);
}

export { ApiError };