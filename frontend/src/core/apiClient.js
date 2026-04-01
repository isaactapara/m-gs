export const resolveApiBaseUrl = (baseUrl) => {
  if (!baseUrl || typeof baseUrl !== 'string' || baseUrl.trim() === '') {
    return '/api';
  }

  const trimmedBase = baseUrl.trim();

  if (trimmedBase.startsWith('http://') || trimmedBase.startsWith('https://')) {
    try {
      const url = new URL(trimmedBase);
      let path = url.pathname.replace(/\/+$/, '');
      
      if (!path.includes('/api')) {
        path += '/api';
      }
      
      url.pathname = path;
      return url.toString().replace(/\/+$/, '');
    } catch (error) {
      return '/api'; 
    }
  }

  let relativePath = trimmedBase.replace(/\/+$/, '');
  if (!relativePath.includes('/api')) {
    relativePath += '/api';
  }
  
  return relativePath;
};

const isFormData = (value) => typeof FormData !== 'undefined' && value instanceof FormData;

export class ApiClient {
  constructor(rootStore) {
    this.rootStore = rootStore;
    this.baseUrl = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
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
