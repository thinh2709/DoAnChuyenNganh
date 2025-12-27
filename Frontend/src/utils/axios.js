import axios from 'axios';
import { API_BASE_URL } from '../config/apiConfig';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true
});

// ✅ Request interceptor với debug logging chi tiết
api.interceptors.request.use(
    (config) => {
        try {
            const token = window.localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;

                // ✅ Debug log để kiểm tra
                console.log("🚀 API Request:", {
                    url: config.url,
                    method: config.method,
                    hasToken: true,
                    tokenPreview: `${token.substring(0, 20)}...`,
                });
            } else {
                console.warn("⚠️ No token found in localStorage");
            }
        } catch (error) {
            console.error('❌ Error getting token:', error);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// ✅ Response interceptor với error handling chi tiết
api.interceptors.response.use(
    (response) => {
        console.log("✅ API Response:", {
            url: response.config.url,
            status: response.status,
            success: response.data.success,
        });
        return response;
    },
    (error) => {
        console.error("❌ API Error:", {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            message: error.response?.data?.message || error.message,
        });

        // ✅ Handle 401 - Token hết hạn hoặc không hợp lệ
        if (error.response?.status === 401) {
            window.localStorage.removeItem('token');
            window.localStorage.removeItem('user');

            // Chỉ redirect nếu không phải trang login
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/';
            }
        }

        // ✅ Handle 403 - Forbidden
        if (error.response?.status === 403) {
            console.error("🚫 403 Forbidden - Token có thể không đủ quyền");
        }

        return Promise.reject(error);
    }
);

export default api;