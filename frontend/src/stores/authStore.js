import { create } from 'zustand';
import axios from 'axios';
import Cookies from 'js-cookie';


const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  
  if (import.meta.env.DEV) return '/api';
  return 'http://localhost:3000/api';
};

const useAuthStore = create(
    (set, get) => ({
      user: null,
      token: null,
      loading: true,
      isAuthenticated: false,

      
      get API_BASE_URL() { return getApiBaseUrl(); },

      
      setLoading: (loading) => set({ loading }),

      
      login: async (email, password) => {
        try {
          set({ loading: true });
          const baseUrl = get().API_BASE_URL;
          const response = await axios.post(`${baseUrl}/auth/login`, {
            email: (email || '').trim(),
            password: password || ''
          }, {
            timeout: 15000,
            headers: { 'Content-Type': 'application/json' }
          });

          const { token, user } = response.data;
          if (!token || !user) {
            return { success: false, error: 'Invalid response from server' };
          }

          
          Cookies.set('jwt', token, {
            expires: 7, 
            secure: import.meta.env.PROD,
            sameSite: 'strict'
          });

          
          set({
            token,
            user,
            isAuthenticated: true,
            loading: false
          });

          return { success: true };
        } catch (error) {
          set({ loading: false });
          let errorMessage = 'Unable to sign in. Please try again.';
          if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
          } else if (error.code === 'ECONNABORTED') {
            errorMessage = 'Request timed out. Please check your connection.';
          } else if (error.code === 'ERR_NETWORK' || !error.response) {
            errorMessage = 'Cannot reach server. Please ensure the backend is running.';
          }
          return { success: false, error: errorMessage };
        }
      },

      
      signup: async (userData) => {
        try {
          set({ loading: true });
          const response = await axios.post(`${get().API_BASE_URL}/auth/signup`, userData);

          
          Cookies.set('jwt', response.data.token, {
            expires: 7, 
            secure: false, 
            sameSite: 'strict'
          });

          
          set({
            token: response.data.token,
            user: response.data.user,
            isAuthenticated: true,
            loading: false
          });

          return { success: true };
        } catch (error) {
          set({ loading: false });
          const errorMessage = error.response?.data?.message || error.message || 'Signup failed';
          return { success: false, error: errorMessage };
        }
      },

      
      logout: async () => {
        try {
          
          if (get().token) {
            await axios.post(`${get().API_BASE_URL}/auth/logout`, {}, {
              headers: get().getAuthHeaders()
            });
          }
        } catch (error) {
          
          console.log('Logout error:', error);
        } finally {
          
          Cookies.remove('jwt');

          
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            loading: false
          });
        }
      },

      
      checkAuth: async () => {
        const token = Cookies.get('jwt');
        if (!token) {
          set({ loading: false, isAuthenticated: false });
          return;
        }

        try {
          const response = await axios.get(`${get().API_BASE_URL}/auth/profile`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          set({
            token: token,
            user: response.data.user,
            isAuthenticated: true,
            loading: false
          });
        } catch (error) {
          
          Cookies.remove('jwt');
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            loading: false
          });
        }
      },

      
      getAuthHeaders: () => {
        const token = Cookies.get('jwt') || get().token;
        return token ? { 'Authorization': `Bearer ${token}` } : {};
      },

      
      updateProfile: async (profileData) => {
        try {
          const response = await axios.put(`${get().API_BASE_URL}/auth/profile`, profileData, {
            headers: get().getAuthHeaders()
          });

          set({ user: response.data.user });
          return { success: true };
        } catch (error) {
          const errorMessage = error.response?.data?.message || error.message || 'Update failed';
          return { success: false, error: errorMessage };
        }
      }
    })
);

export default useAuthStore;