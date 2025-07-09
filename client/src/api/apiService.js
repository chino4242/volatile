// client/src/api/apiService.js

const REACT_APP_API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'http://localhost:5000';

/**
 * A robust helper function to handle fetch responses and centralize error handling.
 * @param {Response} response - The response object from a fetch call.
 * @returns {Promise<any>} - A promise that resolves with the JSON data or rejects with a structured error.
 */
async function handleResponse(response) {
    // --- Start of High-Detail handleResponse Logging ---
    console.log(`--- API_SERVICE LOG: handleResponse received a response with status: ${response.status}`);

    if (response.ok) {
        console.log(`--- API_SERVICE LOG: Response was OK (status ${response.status}). Parsing body...`);
        const text = await response.text();
        
        if (text) {
            console.log(`--- API_SERVICE LOG: Response has text body. Parsing as JSON.`);
            return JSON.parse(text);
        } else {
            console.warn(`--- API_SERVICE LOG: Response was OK but had no body. Returning empty object {}.`);
            return {};
        }
    }

    // If the response is not successful, this block will run.
    console.error(`--- API_SERVICE LOG: Response was NOT OK (status ${response.status}). Creating and throwing error.`);
    let errorData;
    try {
        errorData = await response.json();
    } catch (e) {
        errorData = { message: `Server returned status ${response.status} but response body was not valid JSON.` };
    }

    const error = new Error(errorData.error || errorData.message);
    error.status = response.status;
    
    // This throw is what should cause Promise.all to fail.
    throw error;
}

/**
 * A generic function for making GET requests to your NODE.JS backend.
 * @param {string} endpoint - The API endpoint path (e.g., '/api/league/123').
 * @returns {Promise<any>} - The data from the API.
 */
export async function get(endpoint, options = {}) {
    try {
        const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `${REACT_APP_API_URL}${normalizedEndpoint}`;
        
        console.log('Making API request to:', url);
        
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
        // This will catch network-level errors (e.g., server unreachable)
        // AND errors thrown from handleResponse.
        console.error(`--- API_SERVICE LOG: Error in get() function's catch block:`, error);
        throw error;
    }
}