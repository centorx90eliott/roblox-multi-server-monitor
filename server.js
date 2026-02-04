const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// serverId → { lastSeen, cameras: Map, players: Map }
const servers = new Map();

/* ------------------------- PLAYER JOIN ------------------------- */
app.post('/playerJoin', (req, res) => {
    const { serverId, playerId, name, appearance } = req.body;

    if (!serverId || !playerId || !appearance) {
        return res.status(400).json({ error: "Champs manquants" });
    }

    if (!servers.has(serverId)) {
        servers.set(serverId, {
            lastSeen: new Date(),
            cameras: new Map(),
            players: new Map()
        });
    }

    const server = servers.get(serverId);
    server.lastSeen = new Date();

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
        return res.status(400).json({ error: "Champs manquants" });
    }

    const server = servers.get(serverId);
    if (!server) return res.json({ status: "ignored" });

    server.players.delete(playerId);

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
            lastSeen: new Date(),
            cameras: new Map(),
            players: new Map()
        });
    }

    const serverData = servers.get(serverId);
    serverData.lastSeen = new Date();

    serverData.cameras.set(cameraId, {
        cframe,
        fov,
        frames: frames || [],
        timestamp: Date.now()
    });

    res.json({ status: "ok" });
});

/* ------------------------- GET SERVERS ------------------------- */
app.get('/servers', (req, res) => {
    const active = [];
    const now = Date.now();

    for (const [id, data] of servers) {
        if (now - data.lastSeen.getTime() < 90000) {
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
    if (!server) return res.json({ error: "serveur inconnu" });

    const cam = server.cameras.get(cameraId);
    if (!cam) return res.json({ error: "caméra inconnue" });

    // 🔥 Ajouter les apparences des joueurs
    const playersAppearance = {};
    for (const [playerId, info] of server.players) {
        playersAppearance[playerId] = info.appearance;
    }

    res.json({
        ...cam,
        playersAppearance
    });
});

/* ------------------------- START SERVER ------------------------- */
app.listen(port, () => {
    console.log(`Backend démarré sur port ${port}`);
});
