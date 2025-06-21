// API utility for backend communication
const BASE_URL = 'https://tubular-lollipop-52dd52.netlify.app';

// Helper to create headers with auth token
const createHeaders = (options: RequestInit = {}): Headers => {
  const headers = new Headers(options.headers);
  const token = localStorage.getItem('token');
  
  // Set default headers if not provided
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  
  // Add auth token if available and not an auth endpoint
  const isAuthEndpoint = options.url?.includes('/login') || options.url?.includes('/logout');
  if (token && !isAuthEndpoint) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  return headers;
};

// API Response Types
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'manager' | 'user';
}

export interface LoginResponse {
  token: string;
  user: User;
}

// Map of singular to plural endpoints
const ENDPOINT_MAP = {
  '/api/order': '/api/orders',
  '/api/user': '/api/users',
  '/api/product': '/api/products',
  '/api/customer': '/api/customers',
  '/api/task': '/api/tasks'
};

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  // Create headers with auth token
  const headers = createHeaders(options);
  
  // Ensure URL is properly formatted and remove any double slashes
  const fullUrl = `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`.replace(/([^:]\/)\/+/g, '$1');
  
  // Ensure URL doesn't end with a slash if it's not a base URL
  if (fullUrl.endsWith('/') && url === '') {
    fullUrl = fullUrl.slice(0, -1);
  }
  
  // Replace any singular endpoints with their plural forms
  Object.entries(ENDPOINT_MAP).forEach(([singular, plural]) => {
    if (fullUrl === `${BASE_URL}${singular}` || fullUrl.startsWith(`${BASE_URL}${singular}/`)) {
      fullUrl = fullUrl.replace(singular, plural);
    }
  });

  try {
    // Create a headers object for logging (redacting sensitive info)
    const logHeaders: Record<string, string> = {};
    headers.forEach((value, key) => {
      logHeaders[key] = key.toLowerCase() === 'authorization' ? 'Bearer [REDACTED]' : value;
    });

    console.log('API Request:', {
      url: fullUrl,
      method: options.method || 'GET',
      headers: logHeaders,
      body: options.body,
    });

    const fetchOptions: RequestInit = {
      ...options,
      method: options.method || 'GET',
      headers: Object.fromEntries(headers.entries()),
      credentials: 'include',
      mode: 'cors',
      cache: 'no-cache',
      redirect: 'follow',
      referrerPolicy: 'no-referrer-when-downgrade'
    };
    
    console.log('Fetch Options:', {
      method: fetchOptions.method || 'GET',
      credentials: fetchOptions.credentials,
      mode: fetchOptions.mode
    });

    const res = await fetch(fullUrl, fetchOptions);

    const data = await res.json();

    console.log('API Response:', {
      url: fullUrl,
      status: res.status,
      ok: res.ok,
      data,
    });

    if (!res.ok) {
      // Handle authentication errors
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token');
        if (url === '/login') {
          // Show backend error message for login
          throw new ApiError(res.status, data?.message || 'Invalid email or password', data);
        } else {
          window.location.href = '/login';
          throw new ApiError(res.status, 'Session expired. Please login again.', data);
        }
      }
      throw new ApiError(res.status, data?.message || data?.error || 'API request failed', data);
    }

    if (data.status === 'error') {
      throw new ApiError(res.status, data.message || 'API request failed', data);
    }

    // For login endpoint, return the entire response
    if (url === '/login') {
      return data as T;
    }

    // For other endpoints, return the data property if it exists
    return data.data || data;
  } catch (error) {
    console.error('API Error:', {
      url: fullUrl,
      error: error instanceof Error ? error.message : 'Unknown error',
      status: error instanceof ApiError ? error.status : undefined,
      data: error instanceof ApiError ? error.data : undefined
    });
    throw error;
  }
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  console.log('Login attempt:', { email });

  const result = await apiRequest<ApiResponse<{ token: string; user: User }>>('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  if (result.status === 'success' && result.data?.token && result.data?.user) {
    localStorage.setItem('token', result.data.token);
    localStorage.setItem('role', result.data.user.role); // Store user role for filtering
    console.log('Login successful:', { 
      email,
      role: result.data.user.role
    });
    return {
      token: result.data.token,
      user: result.data.user
    };
  } else {
    throw new Error(result.message || 'Login failed');
  }
}

export async function logout(): Promise<void> {
  try {
    await apiRequest('/logout', { method: 'POST' });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    localStorage.removeItem('token');
  }
}

// Store user info in localStorage for logging
export function setUserForLogging(user: User) {
  localStorage.setItem('user', JSON.stringify(user));
}

// Generic CRUD operations
export async function getItems<T>(endpoint: string): Promise<T[]> {
  return apiRequest<T[]>(endpoint);
}

export async function getItem<T>(endpoint: string, id: string): Promise<T> {
  return apiRequest<T>(`${endpoint}/${id}`);
}

export async function createItem<T>(endpoint: string, data: Partial<T>): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateItem<T>(endpoint: string, id: string, data: Partial<T>): Promise<T> {
  return apiRequest<T>(`${endpoint}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function deleteItem(endpoint: string, id: string): Promise<void> {
  await apiRequest(`${endpoint}/${id}`, {
    method: 'DELETE'
  });
}

// Add more API helpers as needed (users, products, customers, etc.)
