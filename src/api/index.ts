// API utility for backend communication
const BASE_URL = import.meta.env.VITE_API_URL;

// Helper to create headers with auth token
const createHeaders = (url: string, options: RequestInit = {}): Headers => {
  const headers = new Headers(options.headers);
  const token = localStorage.getItem('token');
  
  console.log('Creating headers for URL:', url);
  console.log('Token exists:', !!token);
  if (token) {
    console.log('Token length:', token.length);
    console.log('Token prefix:', token.substring(0, 5) + '...');
  }
  
  // Set default headers if not provided
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  
  // Add auth token if available and not an auth endpoint
  const isAuthEndpoint = url.includes('/login') || url.includes('/logout');
  console.log('Is auth endpoint:', isAuthEndpoint);
  
  if (token && !isAuthEndpoint) {
    console.log('Adding Authorization header with token');
    headers.set('Authorization', `Bearer ${token}`);
  } else if (!token && !isAuthEndpoint) {
    console.warn('No token available for non-auth endpoint:', url);
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

// Endpoint mapping for consistency
// Using direct string checks instead of a map for better type safety

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any,
    public url?: string
  ) {
    super(message);
    this.name = 'ApiError';
    
    // Maintain proper prototype chain
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  // Ensure URL is properly formatted and remove any double slashes
  let processedUrl = `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`.replace(/([^:]\/)\/+/g, '$1');
  
  // Ensure URL doesn't end with a slash if it's not a base URL
  if (processedUrl.endsWith('/') && url === '') {
    processedUrl = processedUrl.slice(0, -1);
  }
  
  // Handle pluralization for consistency
  if (processedUrl.endsWith('/order')) {
    processedUrl = processedUrl.replace('/order', '/orders');
  } else if (processedUrl.endsWith('/user')) {
    processedUrl = processedUrl.replace('/user', '/users');
  } else if (processedUrl.endsWith('/product')) {
    processedUrl = processedUrl.replace('/product', '/products');
  } else if (processedUrl.endsWith('/customer')) {
    processedUrl = processedUrl.replace('/customer', '/customers');
  } else if (processedUrl.endsWith('/task')) {
    processedUrl = processedUrl.replace('/task', '/tasks');
  }
  
  // Create headers with auth token
  const headers = createHeaders(url, options);
  const token = localStorage.getItem('token');

  try {
    // Create a headers object for logging (redacting sensitive info)
    const logHeaders: Record<string, string> = {};
    headers.forEach((value, key) => {
      logHeaders[key] = key.toLowerCase() === 'authorization' ? 'Bearer [REDACTED]' : value;
    });

    console.log('API Request:', {
      url: processedUrl,
      method: options.method || 'GET',
      headers: logHeaders,
      body: options.body,
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      tokenPrefix: token ? token.substring(0, 10) + '...' : 'none'
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

    const response = await fetch(processedUrl, fetchOptions);
    let responseData;
    
    try {
      responseData = await response.json();
      console.log('Response Data:', responseData);
    } catch (e) {
      responseData = { message: 'Invalid JSON response' };
    }

    // Log the response for debugging
    console.log('API Response:', {
      url: processedUrl,
      status: response.status,
      ok: response.ok,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData,
    });

    if (!response.ok) {
      // Handle 401/403 specifically
      if (response.status === 401 || response.status === 403) {
        console.error('Auth error - Token might be invalid or expired');
        // Only clear token and redirect if this is not an auth endpoint
        if (!url.includes('/login') && !url.includes('/register')) {
          localStorage.removeItem('token');
          // Redirect to login page only if we're not already there
          if (window.location.pathname !== '/login') {
            window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
          }
        }
        throw new ApiError(
          responseData?.message || 'Session expired. Please login again.', 
          response.status, 
          responseData, 
          processedUrl
        );
      }
      throw new ApiError(
        responseData?.message || responseData?.error || 'API request failed', 
        response.status, 
        responseData, 
        processedUrl
      );
    }

    if (responseData.status === 'error') {
      throw new ApiError(responseData.message || 'API request failed', response.status, responseData, processedUrl);
    }

    // For login/register endpoints, return the entire response
    if (url === '/login' || url === '/register') {
      return responseData as T;
    }

    // For other endpoints, return the data property if it exists
    return responseData.data || responseData;
  } catch (err) {
    console.error('API Error:', {
      url: processedUrl,
      error: err instanceof Error ? err.message : 'Unknown error',
      status: (err as any).status,
      data: (err as any).data
    });

    if (err instanceof ApiError) {
      throw err;
    }
    
    throw new ApiError(
      err instanceof Error ? err.message : 'An unknown error occurred',
      (err as any).status || 500,
      (err as any).data,
      processedUrl
    );
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
