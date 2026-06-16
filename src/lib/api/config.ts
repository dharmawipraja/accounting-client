// VITE_API_BASE_URL must be set to the versioned API root (e.g. http://localhost:3000/v1).
// The fallback below includes /v1 so development works out of the box without a .env file.
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/v1';
