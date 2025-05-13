import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import user from "user.js";

const port = 3000;

const app = express();
const server = createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const __dirname = dirname(fileURLToPath(import.meta.url));

app.get("/", (req, res) => {
    res.sendFile(join(__dirname, "index.html"));
});

app.post("/", (req, res) => {
    console.log("[server.js] request body: " + JSON.stringify(req.body));
    console.log("[server.js] sending over to user.js")
    const response = user.create_user(req.body.username, req.body.password)
    res.send();
})

server.listen(port, () => {
    console.log(`[server.js] listening on port ${port}`);
});