import axios, { AxiosInstance, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://localhost:3000/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle errors
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid, clear storage and redirect to login
          await AsyncStorage.multiRemove(['authToken', 'user']);
          // You might want to emit an event here to trigger logout in the app
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(email: string, password: string): Promise<AxiosResponse> {
    return this.api.post('/auth/login', { email, password });
  }

  async register(name: string, email: string, password: string): Promise<AxiosResponse> {
    return this.api.post('/auth/register', { name, email, password });
  }

  async verifyToken(): Promise<AxiosResponse> {
    return this.api.get('/auth/verify');
  }

  async refreshToken(): Promise<AxiosResponse> {
    return this.api.post('/auth/refresh');
  }

  // Scan endpoints
  async uploadAndAnalyze(formData: FormData): Promise<AxiosResponse> {
    return this.api.post('/scan/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  async getScanHistory(page = 1, limit = 10, filters?: any): Promise<AxiosResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters,
    });
    return this.api.get(`/scan/history?${params}`);
  }

  async getScanById(scanId: string): Promise<AxiosResponse> {
    return this.api.get(`/scan/${scanId}`);
  }

  async deleteScan(scanId: string): Promise<AxiosResponse> {
    return this.api.delete(`/scan/${scanId}`);
  }

  // User endpoints
  async getUserProfile(): Promise<AxiosResponse> {
    return this.api.get('/user/profile');
  }

  async updateUserProfile(name: string): Promise<AxiosResponse> {
    return this.api.put('/user/profile', { name });
  }

  async getUserStats(): Promise<AxiosResponse> {
    return this.api.get('/user/stats');
  }

  async deleteUserAccount(password: string): Promise<AxiosResponse> {
    return this.api.delete('/user/account', { data: { password } });
  }

  // Health check
  async healthCheck(): Promise<AxiosResponse> {
    return this.api.get('/health');
  }
}

export default new ApiService();
