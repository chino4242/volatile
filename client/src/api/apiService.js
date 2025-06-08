// Determine the API base URL from environment variables
// Fallback to http://localhost:5000 for local development if  REACT_APP_BASE_URL is not set

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

/**
 * This is a helper function to handle responses and errors from fetch
 * @param {Response} response - The response object from fetch
 * @returns {Promise<any>} - A promise that resolves with the JSON or rejects with an error
 */

async function handleResponse(response) {
    if (!response.ok) {
        let errorData;
        try {
            //Try to parse the error response as JSON
            errorData = await response.json();
            
        }
    }
}