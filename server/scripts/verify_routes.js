console.log('--- VERIFYING MODULE LOADING ---');

try {
    console.log('Loading playerService...');
    const playerService = require('../services/playerService');
    console.log('SUCCESS: playerService loaded.');
} catch (e) {
    console.error('FAILURE: playerService crashed:', e);
    process.exit(1);
}

try {
    console.log('Loading fleaflickerService...');
    const fleaflickerService = require('../services/fleaflickerService');
    console.log('SUCCESS: fleaflickerService loaded.');
} catch (e) {
    console.error('FAILURE: fleaflickerService crashed:', e);
    process.exit(1);
}

try {
    console.log('Loading fleaflickerRosterRoutes...');
    const fleaflickerRoutes = require('../routes/fleaflickerRosterRoutes');
    console.log('SUCCESS: fleaflickerRosterRoutes loaded.');
} catch (e) {
    console.error('FAILURE: fleaflickerRosterRoutes crashed:', e);
    process.exit(1);
}

console.log('--- ALL MODULES LOADED SUCCESSFULLY ---');
