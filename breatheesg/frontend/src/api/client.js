import axios from 'axios';

const client = axios.create({
  baseURL: 'http://127.0.0.1:8000', // Our local Django server
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: inject Bearer token automatically
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: handle token expiries
client.interceptors.response.use(
  (response) => response,
  (error) => {
    // If unauthorized / token expired, log user out to login screen
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      
      // Trigger a window event so that our AuthContext updates state
      window.dispatchEvent(new Event('auth_logout'));
    }
    return Promise.reject(error);
  }
);

export default client;
