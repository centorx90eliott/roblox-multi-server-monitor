const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const servers = new Map(); // serverId → { lastSeen: Date, cameras: Map, players: Map }

app.post('/report', (req, res) => {
    const { serverId, cameraId, cframe, fov, frames, joins, leaves } = req.body;

    if (!serverId) return res.status(400).json({ error: "serverId obligatoire" });

    if (!servers.has(serverId)) {
        servers.set(serverId, { lastSeen: new Date(), cameras: new Map(), players: new Map() });
    }

    const serverData = servers.get(serverId);
    serverData.lastSeen = new Date();

    // Mise à jour de la caméra
    if (cameraId) {
        serverData.cameras.set(cameraId, {
            cframe,
            fov,
            frames: frames || [],
            timestamp: Date.now()
        });
    }

    // Gestion des entrées (Skins)
    if (joins) {
        joins.forEach(p => serverData.players.set(p.userId, p));
    }

    // Gestion des sorties
    if (leaves) {
        leaves.forEach(userId => serverData.players.delete(userId));
    }

    res.json({ status: "ok" });
});

app.get('/servers', (req, res) => {
    const active = [];
    const now = Date.now();
    for (const [id, data] of servers) {
        if (now - data.lastSeen.getTime() < 60000) {
            active.push(id);
        } else {
            servers.delete(id);
        }
    }
    res.json(active);
});

app.get('/camera', (req, res) => {
    const { serverId, cameraId } = req.query;
    const server = servers.get(serverId);
    if (!server) return res.json({ error: "serveur inconnu" });

    const cam = server.cameras.get(cameraId);
    if (!cam) return res.json({ error: "caméra inconnue" });

    // On renvoie la caméra + la liste des skins connus du serveur
    res.json({
        ...cam,
        skinCache: Array.from(server.players.values())
    });
});

app.listen(port, () => console.log(`Backend sur port ${port}`));
