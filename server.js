const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const servers = new Map(); // serverId → { lastSeen: Date, cameras: Map<cameraId, data> }

app.post('/report', (req, res) => {
    const { serverId, cameraId, cframe, fov, visiblePlayers } = req.body;

    if (!serverId || !cameraId) {
        return res.status(400).json({ error: "serverId et cameraId obligatoires" });
    }

    if (!servers.has(serverId)) {
        servers.set(serverId, { lastSeen: new Date(), cameras: new Map() });
    }

    const serverData = servers.get(serverId);
    serverData.lastSeen = new Date();
    serverData.cameras.set(cameraId, {
        cframe: cframe, // {x,y,z, lookAtX,lookAtY,lookAtZ} ou string JSON
        fov: fov || 70,
        visiblePlayers: visiblePlayers || [],
        timestamp: Date.now()
    });

    res.json({ status: "ok" });
});

app.get('/servers', (req, res) => {
    const active = [];
    const now = Date.now();
    for (const [id, data] of servers) {
        if (now - data.lastSeen.getTime() < 90000) { // 90 secondes
            active.push(id);
        } else {
            servers.delete(id); // cleanup
        }
    }
    res.json(active);
});

app.get('/camera', (req, res) => {
    const { serverId, cameraId } = req.query;
    if (!serverId || !cameraId) {
        return res.status(400).json({ error: "serverId et cameraId requis" });
    }

    const server = servers.get(serverId);
    if (!server) return res.json({ error: "serveur inconnu" });

    const cam = server.cameras.get(cameraId);
    if (!cam) return res.json({ error: "caméra inconnue" });

    res.json(cam);
});

app.listen(port, () => {
    console.log(`Backend démarré sur port ${port}`);
});
