const resolveApiBaseUrl = () => {
  let baseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();

  if (!baseUrl) {
    // Determine fallback based on environment
    const isDev = import.meta.env.DEV;
    baseUrl = isDev ? '/api' : '/api'; // Relative works best in both for consistency with proxy/nginx
  }

  // Ensure trailing slash is removed
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }

  // FAIL-SAFE: If it's a production URL (starts with http) and MISSING the /api suffix, append it.
  // This ensures that even if VITE_API_BASE_URL is set to "https://api.mandgs.online", 
  // it correctly becomes "https://api.mandgs.online/api".
  if (baseUrl.startsWith('http') && !baseUrl.endsWith('/api')) {
    baseUrl = `${baseUrl}/api`;
  }

  return baseUrl;
};

const isFormData = (value) => typeof FormData !== 'undefined' && value instanceof FormData;

export class ApiClient {
  constructor(rootStore) {
    this.rootStore = rootStore;
    this.baseUrl = resolveApiBaseUrl();
  }

  buildUrl(path) {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${normalizedPath}`;
  }

  buildHeaders({ headers = {}, body } = {}) {
    const mergedHeaders = { ...headers };
    const token = this.rootStore.authStore.currentUser?.token;

    if (token) {
      mergedHeaders.Authorization = `Bearer ${token}`;
    }

    if (!isFormData(body) && body != null && !mergedHeaders['Content-Type']) {
      mergedHeaders['Content-Type'] = 'application/json';
    }

    return mergedHeaders;
  }

  async parseResponse(response) {
    const contentType = response.headers.get('content-type') || '';

    if (response.status === 204) {
      return null;
    }

    if (contentType.includes('application/json')) {
      return response.json();
    }

    const text = await response.text();
    return text || null;
  }

  async request(path, options = {}) {
    const { body, suppressUnauthorizedHandler = false, ...rest } = options;
    const requestBody = body != null && typeof body === 'object' && !isFormData(body)
      ? JSON.stringify(body)
      : body;

    try {
      const response = await fetch(this.buildUrl(path), {
        ...rest,
        body: requestBody,
        headers: this.buildHeaders({
          headers: rest.headers,
          body,
        }),
      });

      const data = await this.parseResponse(response);

      if (!response.ok) {
        const wrappedError = new Error(
          data?.error?.message
          || data?.message
          || 'Request failed'
        );

        wrappedError.response = {
          status: response.status,
          data,
        };

        if (response.status === 401 && !suppressUnauthorizedHandler) {
          this.rootStore.authStore.handleUnauthorized();
        }

        throw wrappedError;
      }

      return data;
    } catch (error) {
      if (
        error?.name !== 'AbortError'
        && error?.response?.status === 401
        && !suppressUnauthorizedHandler
      ) {
        this.rootStore.authStore.handleUnauthorized();
      }

      throw error;
    }
  }

  get(path, options = {}) {
    return this.request(path, { ...options, method: 'GET' });
  }

  post(path, body, options = {}) {
    return this.request(path, {
      ...options,
      method: 'POST',
      body,
    });
  }

  patch(path, body, options = {}) {
    return this.request(path, {
      ...options,
      method: 'PATCH',
      body,
    });
  }

  put(path, body, options = {}) {
    return this.request(path, {
      ...options,
      method: 'PUT',
      body,
    });
  }

  delete(path, options = {}) {
    return this.request(path, {
      ...options,
      method: 'DELETE',
    });
  }
}
