/**
 * API Service Layer connected to Node.js & PostgreSQL / Neon DB Backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'invoice_manager_jwt';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    },
    ...options
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'API request failed' }));
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      localStorage.removeItem(TOKEN_KEY);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { message: error.message } }));
      }
    }
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  return response.json();
}

export const bootstrapApi = {
  get: async () => request('/bootstrap')
};

export const authApi = {
  login: async (credentials) => {
    const result = await request('/auth/login', { method: 'POST', body: credentials });
    if (result.token) localStorage.setItem(TOKEN_KEY, result.token);
    return result;
  },
  logout: async () => {
    try {
      return await request('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem(TOKEN_KEY);
    }
  },
  getCurrentUser: async () => request('/auth/me')
};

export const businessCustomerApi = {
  getBusinesses: async () => request('/businesses'),
  getCustomers: async () => request('/customers'),
  add: async (data) => request('/businesses-and-customers', { method: 'POST', body: data }),
  update: async (data) => request('/businesses-and-customers', { method: 'PUT', body: data }),
  deleteCustomer: async (id) => request(`/customers/${id}`, { method: 'DELETE' })
};

export const invoiceApi = {
  getAll: async () => request('/invoices'),
  create: async (data) => request('/invoices', { method: 'POST', body: data }),
  markPaid: async (id, data) => request(`/invoices/${id}/pay`, { method: 'POST', body: data }),
  partialPayment: async (id, data) => request(`/invoices/${id}/partial-payment`, { method: 'POST', body: data }),
  reversePayment: async (id) => request(`/invoices/${id}/reverse`, { method: 'POST' }),
  delete: async (id) => request(`/invoices/${id}`, { method: 'DELETE' })
};

export const reversalApi = {
  getAll: async () => request('/reversals')
};

export const reportApi = {
  getSummary: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/reports/summary${query ? `?${query}` : ''}`);
  }
};

export const settingsApi = {
  get: async () => request('/settings'),
  update: async (data) => request('/settings', { method: 'PUT', body: data }),
  backup: async () => request('/settings/backup'),
  restore: async (data) => request('/settings/restore', { method: 'POST', body: data }),
  reset: async () => request('/settings/reset', { method: 'POST' })
};

export const whatsappApi = {
  getStatus: async () => request('/whatsapp/status'),
  connect: async (force = false) => request('/whatsapp/connect', { method: 'POST', body: { force } }),
  logout: async () => request('/whatsapp/logout', { method: 'POST' }),
  sendInvoice: async (data) => request('/whatsapp/send-invoice', { method: 'POST', body: data }),
  sendText: async (phone, message) => request('/whatsapp/send-text', { method: 'POST', body: { phone, message } }),
  sendDocument: async (phone, base64Data, fileName, mimeType, caption) =>
    request('/whatsapp/send-document', { method: 'POST', body: { phone, base64Data, fileName, mimeType, caption } })
};

