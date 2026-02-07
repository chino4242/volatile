const playerService = require('../services/playerService');
const fleaflickerRoutes = require('../routes/fleaflickerFreeAgentRoutes');

console.log('--- VERIFICATION START ---');

try {
    const players = playerService.getAllPlayers();
    console.log(`Player Service loaded. Player count: ${players.size}`);

    if (players.size > 0) {
        console.log('SUCCESS: enriched_players_master.json loaded correctly via require().');
    } else {
        console.error('FAILURE: Player map is empty.');
        process.exit(1);
    }

} catch (err) {
    console.error('FAILURE: Error verifying playerService:', err);
    process.exit(1);
}

try {
    console.log('SUCCESS: fleaflickerFreeAgentRoutes loaded correctly (syntax check passed).');
} catch (err) {
    console.error('FAILURE: Error loading fleaflickerFreeAgentRoutes:', err);
    process.exit(1);
}

console.log('--- VERIFICATION COMPLETE ---');
