const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const outputFilename = "nfl_players_data.json";
const playerApiUrl = "https://api.sleeper.app/v1/players/nfl";

async function fetchAndSavePlayers() {
    console.log('Attempting to fetch NFL players data from ${playerApiUrl}...');
    try {
        const response = await axios.get(playerApiUrl);

        const playersData = response.data;
        if (!playersData){
            console.error("No data received from the API.");
            return
        }

        //Convert the JavaScript object to a pretty-printed JSON string
        const jsonDataString = JSON.stringify(playersData, null, 4);

        //Construct the full path to the output file
        const outputPath = path.join(__dirname, outputFilename);

        //Write the JSON string to the output file
        await fs.writeFile(outputPath, jsonDataString, 'utf8');

        console.log('Successfully fetched and saved NFL players data to ${outputPath}')
    }
    catch (error) {
        if (axios.isAxiosError(error)) {
            //Handle errors from axios (network issues, HTTP errors)
            if (error.response){
                //The request was made and the server responded with something other than 200
                console.error('HTTP error occurred: ${error.response.status} - ${error.response.statusText');
                console.error("Response data:", error.response.data);
                } else if (error.request) {
                    // The request was made but no response was received
                    console.error("Connection error occurred: No response received from server.");
                    console.error("Error request details:", error.request);
                } else {
                    // Something happened in setting up the request that triggered an Error
                    console.error("Error setting up request:", error.message);
                }
                } else if (error.code === 'ENOENT' || error.code === 'EACCES' || error.code === 'EISDIR') {
                // Handle file system errors
                console.error(`File system error occurred: ${error.message}`);
                } else {
                // Handle other types of errors (e.g., JSON.stringify could theoretically fail with circular refs, though not with typical API data)
                console.error(`An unexpected error occurred: ${error.message}`);
                }
                // Optional: log the full error object for more details during development
                // console.error("Full error object:", error);
            }
}

fetchAndSavePlayers();
