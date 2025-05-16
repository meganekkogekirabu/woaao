import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as user from "./public/user.js";
import "dotenv/config";
import session from "express-session";

const port = 3000;

const app = express();
const server = createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret            : process.env.SESSION_KEY,
    resave            : false,
    saveUninitialized : false,
    cookie            : { secure: false },
}));

const __dirname = dirname(fileURLToPath(import.meta.url));

app.get("/", (req, res) => {
    res.sendFile(join(__dirname, "public", "index.html"));
});

app.post("/signup", async (req, res) => {
    try {
        const ret = await user.create_user(req.body.username, req.body.password);
        res.json({
            status   : ret.status,
            response : ret.response,
        });
    } catch(e) {
        console.error("[server.js] Failed to create user:", e);
        res.json({
            status : 500,
            error  : "Failed to create user.",
        });
    }
});

app.post("/signin", async (req, res) => {
    try {
        const ret = await user.sign_in(req.body.username, req.body.password);
        res.json({
            status  : ret.status,
            respose : ret.response,
        });
    } catch (e) {
        console.error("[server.js] Failed to authenticate user:", e);
        res.json({
            status : 500,
            error  : "Failed to authenticate user.",
        });
    }
})

app.get("/:filename", (req, res) => {
    res.sendFile(join(__dirname, "public", req.params.filename), (err) => {
        if (err) {
            res.status(404).sendFile(join(__dirname, "public", "not_found.html"));
        }
    });
});

server.listen(port, () => {
    console.log(`[server.js] listening on port ${port}`);
});