const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.100:5000';

function getRuntimeApiUrl() {
  if (typeof window === 'undefined') {
    return API_URL;
  }

  const host = window.location.hostname || '192.168.1.100';
  const protocol = window.location.protocol || 'http:';

  if (host === 'localhost' || host === '127.0.0.1') {
    return `${protocol}//${host}:5000`;
  }

  return `${protocol}//${host}:5000`;
}

export function getApiUrl() {
  return getRuntimeApiUrl();
}

export function buildApiUrl(path = '') {
  const baseUrl = getRuntimeApiUrl();
  if (!path) return baseUrl;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function buildAssetUrl(path = '') {
  return buildApiUrl(path);
}

function requestWithXhr(path, { method, headers, body, onUploadProgress }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, buildApiUrl(path), true);

    Object.entries(headers || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        xhr.setRequestHeader(key, value);
      }
    });

    if (typeof onUploadProgress === 'function' && xhr.upload) {
      xhr.upload.onprogress = (event) => {
        const total = event.total || 0;
        const percent = event.lengthComputable && total
          ? Math.round((event.loaded / total) * 100)
          : 0;

        onUploadProgress({
          loaded: event.loaded,
          total,
          percent
        });
      };
    }

    xhr.onerror = () => reject(new Error('Erreur réseau'));

    xhr.onload = () => {
      const raw = xhr.responseText || '';
      let data = {};

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = {};
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
        return;
      }

      reject(new Error(data.message || 'Erreur API'));
    };

    xhr.send(body ?? null);
  });
}

export async function apiRequest(path, options = {}) {
  const {
    method = 'GET',
    token,
    body,
    isFormData = false,
    onUploadProgress
  } = options;

  const headers = {};

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const requestBody = isFormData ? body : body ? JSON.stringify(body) : undefined;

  if (typeof onUploadProgress === 'function') {
    return requestWithXhr(path, {
      method,
      headers,
      body: requestBody,
      onUploadProgress
    });
  }

  const response = await fetch(buildApiUrl(path), {
    method,
    headers,
    body: requestBody
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Erreur API');
  }

  return data;
}

export async function downloadFile(path, options = {}) {
  const { token, filename = 'download.bin' } = options;
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildApiUrl(path), { headers });
  const contentType = response.headers.get('content-type') || '';

  if (!response.ok) {
    if (contentType.includes('application/json')) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Téléchargement impossible.');
    }
    throw new Error('Téléchargement impossible.');
  }

  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}
