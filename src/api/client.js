import axios from 'axios';

const api = axios.create({
    // En producción (Railway) usamos rutas relativas (/api) porque React y Express viven en el mismo host.
    // En desarrollo local seguimos usando localhost:3001 por los puertos separados.
    baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Interceptor de peticiones para inyectar el token JWT
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

let isRedirecting = false;

// Interceptor de respuestas para manejar caducidad de token (opcional)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // Lógica para expulsar sesión inválida o caducida
            localStorage.removeItem('token');

            if (!isRedirecting && window.location.pathname !== '/login') {
                isRedirecting = true;
                window.location.href = '/login';
            }

            console.error('Token inválido o no autorizado', error);
        }
        return Promise.reject(error);
    }
);

export default api;
