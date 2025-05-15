import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as user from "./user.js";

const port = 3000;

const app = express();
const server = createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const __dirname = dirname(fileURLToPath(import.meta.url));

app.get("/", (req, res) => {
    res.sendFile(join(__dirname, "index.html"));
});

app.post("/", async (req, res) => {
    try {
        const ret = await user.create_user(req.body.username, req.body.password);
        res.status(200).json({
            status: ret.status,
            response: ret.response,
        });
    } catch(e) {
        console.error("[server.js] Failed to create user:", e);
        res.status(500).json({
            error: "Failed to create user.",
        });
    }
});

app.get("/:filename", (req, res) => {
    const filename = req.params.filename;

    res.sendFile(join(__dirname, filename), (err) => {
        if (err) {
            res.status(404).sendFile(join(__dirname, "not_found.html"));
        }
    })
})

server.listen(port, () => {
    console.log(`[server.js] listening on port ${port}`);
});