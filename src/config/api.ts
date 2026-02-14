/**
 * API Configuration
 *
 * In development: Uses Vite proxy to forward /api requests to localhost:3001
 * In production: Uses VITE_API_URL environment variable (Railway backend)
 */
export const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Environment check
 */
export const IS_PRODUCTION = import.meta.env.PROD;
export const IS_DEVELOPMENT = import.meta.env.DEV;
