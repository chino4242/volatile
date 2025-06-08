// client/src/api/apiService.js

// This line is the key:
// It looks for an environment variable named REACT_APP_API_BASE_URL, which you will set on Render.
// If it can't find it (like when you are running locally), it will fall back to using 'http://localhost:5000'.
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

/**
 * A helper function to handle fetch responses and centralize error handling.
 * @param {Response} response - The response object from a fetch call.
 * @returns {Promise<any>} - A promise that resolves with the JSON data or rejects with a structured error.
 */
async function handleResponse(response) {
  if (response.ok) {
    // If the response is successful, try to parse it as JSON.
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      return response.json();
    }
    // Return empty success if no JSON body, e.g., for a 204 No Content response.
    return Promise.resolve();
  }

  // If the response is not successful, create and throw a structured error.
  let errorData;
  try {
    errorData = await response.json();
  } catch (e) {
    // If the error response is not JSON, use the status text as a fallback.
    errorData = { message: response.statusText };
  }

  const error = new Error(errorData.error || errorData.message || `HTTP error! Status: ${response.status}`);
  error.status = response.status;
  error.data = errorData; // Attach the full error payload for more context.
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
    // This will catch network errors (like "failed to fetch") or errors thrown from handleResponse.
    console.error(`GET request to ${API_BASE_URL}${endpoint} failed:`, error);
    throw error; // Re-throw the error so the calling component's catch block can handle it.
  }
}

/**
 * A generic function for making POST requests.
 * @param {string} endpoint - The API endpoint path.
 * @param {object} body - The request body to be sent as JSON.
 * @param {object} [options={}] - Optional additional fetch options.
 * @returns {Promise<any>} - The data from the API.
 */
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
