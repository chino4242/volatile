console.log('--- VERIFYING SLEEPER ROSTER ROUTE ---');

try {
    const { loadAllPlayersData, createManagerRosterList } = require('../services/playerService');
    console.log('SUCCESS: playerService functions imported.');

    console.log('Testing loadAllPlayersData execution...');
    // Simulate how the route calls it (with await, even though it is sync)
    (async () => {
        try {
            const allPlayersData = await loadAllPlayersData();
            console.log(`SUCCESS: loadAllPlayersData returned data. Type: ${typeof allPlayersData}, Size: ${allPlayersData instanceof Map ? allPlayersData.size : 'N/A'}`);

            if (!(allPlayersData instanceof Map)) {
                console.error('FAILURE: loadAllPlayersData did not return a Map!');
                process.exit(1);
            }

            console.log('Testing createManagerRosterList...');
            // Test with a dummy player ID that might exist or not
            const roster = createManagerRosterList(['1234', '999999'], allPlayersData);
            console.log('SUCCESS: createManagerRosterList executed.', roster);

        } catch (innerError) {
            console.error('FAILURE: Async debugging failed:', innerError);
            process.exit(1);
        }
    })();

} catch (e) {
    console.error('FAILURE: Module import failed:', e);
    process.exit(1);
}
