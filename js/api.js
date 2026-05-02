const API_BASE = 'http://localhost:3000/api';  // Will update after deployment

async function apiFetch(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  return res.json();
}