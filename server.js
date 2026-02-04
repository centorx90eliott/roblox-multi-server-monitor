const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// serverId → { lastSeen, cameras: Map<cameraId, data>, players: Map<playerId, data> }
const servers = new Map();

// Temps max avant de considérer un serveur inactif (90 secondes)
const SERVER_TIMEOUT = 90 * 1000;
// Temps max pour garder une caméra (60 secondes)
const CAMERA_TIMEOUT = 60 * 1000;

/* ------------------------- PLAYER JOIN ------------------------- */
app.post('/playerJoin', (req, res) => {
    const { serverId, playerId, name, appearance } = req.body;
    if (!serverId || !playerId || !appearance) {
        return res.status(400).json({ error: "serverId, playerId et appearance obligatoires" });
    }

    if (!servers.has(serverId)) {
        servers.set(serverId, {
            lastSeen: Date.now(),
            cameras: new Map(),
            players: new Map()
        });
    }

    const server = servers.get(serverId);
    server.lastSeen = Date.now();
    server.players.set(playerId, {
        name,
        appearance,
        lastSeen: Date.now()
    });

    res.json({ status: "ok" });
});

/* ------------------------- PLAYER LEAVE ------------------------- */
app.post('/playerLeave', (req, res) => {
    const { serverId, playerId } = req.body;
    if (!serverId || !playerId) {
        return res.status(400).json({ error: "serverId et playerId obligatoires" });
    }

    const server = servers.get(serverId);
    if (server) {
        server.players.delete(playerId);
    }

    res.json({ status: "ok" });
});

/* ------------------------- REPORT CAMERA ------------------------- */
app.post('/report', (req, res) => {
    const { serverId, cameraId, cframe, fov, frames } = req.body;
    if (!serverId || !cameraId) {
        return res.status(400).json({ error: "serverId et cameraId obligatoires" });
    }

    if (!servers.has(serverId)) {
        servers.set(serverId, {
            lastSeen: Date.now(),
            cameras: new Map(),
            players: new Map()
        });
    }

    const server = servers.get(serverId);
    server.lastSeen = Date.now();

    server.cameras.set(cameraId, {
        cframe,
        fov,
        frames: frames || [],
        timestamp: Date.now()
    });

    res.json({ status: "ok" });
});

/* ------------------------- GET ACTIVE SERVERS ------------------------- */
app.get('/servers', (req, res) => {
    const now = Date.now();
    const active = [];

    for (const [id, data] of servers.entries()) {
        if (now - data.lastSeen < SERVER_TIMEOUT) {
            active.push(id);
        } else {
            servers.delete(id);
        }
    }

    res.json(active);
});

/* ------------------------- GET CAMERA DATA ------------------------- */
app.get('/camera', (req, res) => {
    const { serverId, cameraId } = req.query;
    if (!serverId || !cameraId) {
        return res.status(400).json({ error: "serverId et cameraId requis" });
    }

    const server = servers.get(serverId);
    if (!server) {
        return res.status(404).json({ error: "serveur inconnu ou inactif" });
    }

    const cam = server.cameras.get(cameraId);
    if (!cam) {
        return res.status(404).json({ error: "caméra inconnue" });
    }

    // Cleanup des vieilles caméras
    const now = Date.now();
    for (const [cid, cdata] of server.cameras.entries()) {
        if (now - cdata.timestamp > CAMERA_TIMEOUT) {
            server.cameras.delete(cid);
        }
    }

    // Apparences des joueurs présents
    const playersAppearance = {};
    for (const [pid, info] of server.players.entries()) {
        playersAppearance[pid] = info.appearance;
    }

    res.json({
        cframe: cam.cframe,
        fov: cam.fov,
        frames: cam.frames,
        playersAppearance
    });
});

// Démarrage
app.listen(port, () => {
    console.log(`Backend démarré sur port ${port}`);
});
