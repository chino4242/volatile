const request = require('supertest');
const app = require('../server');

describe('Server API Health Check', () => {
    it('GET / should return 200 OK', async () => {
        const res = await request(app).get('/');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('status', 'ok');
    });

    it('GET /api/hello should return welcome message', async () => {
        const res = await request(app).get('/api/hello');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toContain('Volatile Creative');
    });

    it('GET /api/nonexistent should return 404', async () => {
        const res = await request(app).get('/api/nonexistent');
        expect(res.statusCode).toEqual(404);
    });
});
