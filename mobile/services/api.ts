import axios from 'axios';
import { getItem } from './storage';

/**
 * Set BASE_URL to your backend address:
 *   iOS Simulator  → http://localhost:3000
 *   Android Emulator → http://10.0.2.2:3000
 *   Physical device  → http://<your-machine-LAN-ip>:3000
 */
export const BASE_URL = 'http://localhost:3000';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);
