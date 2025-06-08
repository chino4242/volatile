// client/src/api/apiService.js

// --- Hardcoded Production URL for Debugging ---
const PRODUCTION_API_URL = 'https://volatile-backend.onrender.com';

// Logic: Create React App sets process.env.NODE_ENV to 'production' automatically during the 'npm run build' command.
// We will use this to determine which URL to use.
// If the environment is 'production' (like on Render), use the hardcoded URL.
// Otherwise (for local development), use localhost.
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? PRODUCTION_API_URL
  : 'http://localhost:5000';

// This console.log will appear in the Render build logs and browser console
// It will tell us exactly which URL was chosen.
console.log(`[apiService] Build environment is: ${process.env.NODE_ENV}. API_BASE_URL has been set to: ${API_BASE_URL}`);


/**
 * A helper function to handle fetch responses and centralize error handling.
 * @param {Response} response - The response object from a fetch call.
 * @returns {Promise<any>} - A promise that resolves with the JSON data or rejects with a structured error.
 */
async function handleResponse(response) {
  if (response.ok) {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      return response.json();
    }
    return Promise.resolve(); 
  }

  let errorData;
  try {
    errorData = await response.json();
  } catch (e) {
    errorData = { message: response.statusText };
  }

  const error = new Error(errorData.error || errorData.message || `HTTP error! Status: ${response.status}`);
  error.status = response.status;
  error.data = errorData;
  throw error;
}

/**
 * A generic function for making GET requests.
 * @param {string} endpoint - The API endpoint path (e.g., '/api/league/123').
 * @param {object} [options={}] - Optional additional fetch options.
 * @returns {Promise<any>} - The data from the API.
 */
export async function get(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    return handleResponse(response);
  } catch (error) {
    console.error(`GET request to ${API_BASE_URL}${endpoint} failed:`, error);
    throw error;
  }
}

// ... (post function remains the same) ...
export async function post(endpoint, body, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  } catch (error) {
    console.error(`POST request to ${API_BASE_URL}${endpoint} failed:`, error);
    throw error;
  }
}
