const axios = require('axios');

async function checkApi() {
    const url = 'https://api.fantasycalc.com/values/current?isDynasty=true&numQbs=2&ppr=1&numTeams=12';
    try {
        const response = await axios.get(url);
        if (response.data && response.data.length > 0) {
            console.log("Full keys available:", Object.keys(response.data[0]));
            console.log("Full player object sample:", JSON.stringify(response.data[0], null, 2));
        } else {
            console.log("No data returned");
        }
    } catch (e) {
        console.error(e);
    }
}

checkApi();
