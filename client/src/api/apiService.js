// client/src/api/apiService.js

// Determine the API base URL from environment variables.
// It falls back to http://localhost:5000 for local development if the environment variable is not set.
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

/**
 * A helper function to handle fetch responses and centralize error handling.
 * @param {Response} response - The response object from a fetch call.
 * @returns {Promise<any>} - A promise that resolves with the JSON data or rejects with a structured error.
 */
async function handleResponse(response) {
  if (response.ok) {
    // If the response is successful, try to parse it as JSON.
    // Handle cases where a successful response might not have a body.
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
    // Attempt to parse the error response body as JSON.
    errorData = await response.json();
  } catch (e) {
    // If the error response is not JSON, use the status text as a fallback.
    errorData = { message: response.statusText };
  }

  // Create a new error object with useful information.
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
    console.error(`GET request to ${endpoint} failed:`, error);
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
    console.error(`POST request to ${endpoint} failed:`, error);
    throw error;
  }
}

// You can add more functions for PUT, DELETE, PATCH etc. following the same pattern.
