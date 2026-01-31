// client/src/api/apiService.js

// This line is the key:
// It looks for an environment variable named REACT_APP_API_BASE_URL, which you will set on Render.
// If it can't find it (like when you are running locally), it will fall back to using 'http://localhost:5000'.
const REACT_APP_API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'http://localhost:5000';
const PYTHON_API_BASE_URL = process.env.REACT_APP_PYTHON_API_URL || 'http://localhost:5002';


/**
 * A robust helper function to handle fetch responses and centralize error handling.
 * @param {Response} response - The response object from a fetch call.
 * @returns {Promise<any>} - A promise that resolves with the JSON data or rejects with a structured error.
 */
async function handleResponse(response) {
  // The 'ok' property checks if the status code is in the 200-299 range.
  if (response.ok) {
    // If the response is successful, try to parse it as JSON.
    // Handle cases where a successful response might have no body (e.g., a 204 No Content).
    const text = await response.text();
    return text ? JSON.parse(text) : {}; // Return parsed JSON or an empty object
  }

  // If the response is not successful, create and throw a structured error.
  let errorData;
  try {
    errorData = await response.json();
  } catch (e) {
    // If the error response body is not JSON, use the status text as a fallback.
    errorData = { message: response.statusText };
  }

  const error = new Error(errorData.error || errorData.message || `HTTP error! Status: ${response.status}`);
  error.status = response.status;
  throw error;
}

/**
 * A generic function for making GET requests to your NODE.JS backend.
 * @param {string} endpoint - The API endpoint path (e.g., '/api/league/123').
 * @param {object} [options={}] - Optional additional fetch options.
 * @returns {Promise<any>} - The data from the API.
 */
export async function get(endpoint, options = {}) {
  try {
    // Ensure endpoint starts with '/'
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${REACT_APP_API_URL}${normalizedEndpoint}`;

    console.log('Making API request to:', url); // Debug log

    const response = await fetch(url, {
      method: 'GET',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    return handleResponse(response);
  } catch (error) {
    console.error(`GET request failed:`, error);
    throw error;
  }
}

/**
 * A specific function for making batch POST requests to your PYTHON backend.
 * @param {string} endpoint - The API endpoint path (e.g., '/api/enriched-players/batch').
 * @param {object} body - The request body to be sent as JSON.
 * @returns {Promise<any>} - The data from the API.
 */
export async function postToPythonApi(endpoint, body) {
  try {
    const url = `${PYTHON_API_BASE_URL}${endpoint}`;
    console.log(`[PythonAPI] POST to ${url}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await handleResponse(response);
    console.log(`[PythonAPI] Success. Received ${Array.isArray(data) ? data.length + ' items' : 'object'}`);
    return data;
  } catch (error) {
    console.error(`POST request to ${PYTHON_API_BASE_URL}${endpoint} failed:`, error);
    throw error;
  }
}

// You could also add a generic post function for your Node.js API if needed.
// export async function postToNodeApi(endpoint, body, options = {}) { ... }
