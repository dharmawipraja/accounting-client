import { API_CONFIG } from '@/constants'
import { clearAuthData, getStoredToken } from '@/utils/auth'
import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios'

// Create axios instance
const createApiInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: API_CONFIG.TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  })

  // Request interceptor to add auth token and cache busting
  instance.interceptors.request.use(
    (config) => {
      const token = getStoredToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => {
      return Promise.reject(error)
    },
  )

  // Response interceptor for error handling
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      return response
    },
    (error) => {
      // Handle 401 unauthorized errors
      if (error.response?.status === 401) {
        clearAuthData()
        // Redirect to login page
        window.location.href = '/auth/login'
      }

      // Handle network errors
      if (!error.response) {
        error.message = 'Network error. Please check your connection.'
      }

      return Promise.reject(error)
    },
  )

  return instance
}

// Create API instance
export const api = createApiInstance()

// Generic API request wrapper with retry logic
export const makeRequest = async <T>(
  request: () => Promise<AxiosResponse<T>>,
  retries: number = API_CONFIG.RETRY_ATTEMPTS,
): Promise<T> => {
  try {
    const response = await request()
    return response.data
  } catch (error) {
    if (retries > 0 && shouldRetry(error)) {
      await sleep(1000) // Wait 1 second before retry
      return makeRequest(request, retries - 1)
    }
    throw error
  }
}

// Helper function to determine if request should be retried
const shouldRetry = (error: any): boolean => {
  // Retry on network errors or 5xx server errors
  return (
    !error.response ||
    (error.response.status >= 500 && error.response.status < 600)
  )
}

// Sleep utility for retries
const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// API methods
export const apiMethods = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    makeRequest<T>(() => api.get<T>(url, config)),

  post: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
    makeRequest<T>(() => api.post<T>(url, data, config)),

  put: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
    makeRequest<T>(() => api.put<T>(url, data, config)),

  patch: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
    makeRequest<T>(() => api.patch<T>(url, data, config)),

  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    makeRequest<T>(() => api.delete<T>(url, config)),
}

export default api
