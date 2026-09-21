/**
 * REST API Routes for Satellite Thermal Hotspots & Analysis
 */
const express = require('express');
const router = express.Router();
const hotspotController = require('../controllers/hotspotController');
const { validateHotspotPayload } = require('../middleware/validationMiddleware');

router.get('/geocode', async (req, res, next) => {
    const query = String(req.query.q || '').trim();
    if (!query) return res.status(400).json({ error: 'A location query is required' });
    try {
        const nominatim = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`, { headers: { Accept: 'application/json', 'User-Agent': 'TERRA-dashboard/1.0 (geocoding proxy)' }, signal: AbortSignal.timeout(10000) });
        const body = await nominatim.text();
        if (nominatim.ok) return res.type('application/json').send(body);
        console.error(`Nominatim geocoding failed (${nominatim.status}):`, body.slice(0, 500));
        const photon = await fetch(`https://photon.komoot.io/api/?limit=5&q=${encodeURIComponent(query)}`, { headers: { Accept: 'application/json', 'User-Agent': 'TERRA-dashboard/1.0 (geocoding proxy)' }, signal: AbortSignal.timeout(10000) });
        if (!photon.ok) return res.status(nominatim.status).json({ error: `Geocoding providers returned ${nominatim.status} and ${photon.status}`, details: body.slice(0, 500) });
        const payload = await photon.json();
        const results = payload.features.map((feature) => {
            const properties = feature.properties || {};
            const [longitude, latitude] = feature.geometry?.coordinates || [];
            const display_name = [properties.name, properties.city || properties.town || properties.village, properties.state, properties.country].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join(', ');
            return { display_name: display_name || query, lat: String(latitude), lon: String(longitude) };
        }).filter((result) => Number.isFinite(Number(result.lat)) && Number.isFinite(Number(result.lon)));
        return res.json(results);
    } catch (error) {
        console.error('Geocoding proxy failed:', error);
        return next(error);
    }
});

// Health & System Info
router.get('/health', (req, res) => hotspotController.getHealth(req, res));
router.get('/config', (req, res) => hotspotController.getConfig(req, res));

// Analytics & Historical Aggregations
router.get('/statistics', (req, res, next) => hotspotController.getStatistics(req, res, next));
router.get('/hotspots/history', (req, res, next) => hotspotController.getHistory(req, res, next));
router.get('/hotspots/nearby', (req, res, next) => hotspotController.getNearby(req, res, next));

// Core Hotspot CRUD & Ingestion
router.get('/hotspots', (req, res, next) => hotspotController.getHotspots(req, res, next));
router.get('/hotspots/:id', (req, res, next) => hotspotController.getHotspotById(req, res, next));
router.post('/hotspots', validateHotspotPayload, (req, res, next) => hotspotController.createHotspot(req, res, next));

// Full Pipeline Analysis Endpoint (Section 15)
router.post('/analyze', validateHotspotPayload, (req, res, next) => hotspotController.analyzeHotspot(req, res, next));
router.post('/hotspots/analyze', validateHotspotPayload, (req, res, next) => hotspotController.analyzeHotspot(req, res, next));

module.exports = router;
