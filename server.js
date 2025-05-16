import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as user from "./public/scripts/user.js";
import "dotenv/config";
import session from "express-session";
import { v4 as uuidv4 } from "uuid";
import { Server } from "socket.io";
import * as database from "./database.js";

const port = 3000;

const app = express();
const server = createServer(app);

const io = new Server(server);

io.on("connection", (socket) => {
    socket.on("message", async (msg) => {
        io.emit("message", msg);

        await database.run(`
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                username TEXT NOT NULL,
                timestamp DATETIME
            );
        `);

        await database.run(`
            INSERT INTO messages (content, username, timestamp)
            VALUES (?, ?, ?)
        `, [msg.content, msg.username, msg.timestamp]);
    });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret            : process.env.SESSION_KEY,
    resave            : false,
    saveUninitialized : false,
    cookie            : { secure: false },
    genid             : () => {
        return uuidv4();
    },
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

        if (ret.username) {
            req.session.username = ret.username;
            req.session.is_admin = ret.is_admin;
        }

        res.json({
            status   : ret.status,
            response : ret.response,
            username : req.session.username,
            is_admin : req.session.is_admin,
        });
    } catch (e) {
        console.error("[server.js] Failed to authenticate user:", e);
        res.json({
            status : 500,
            error  : "Failed to authenticate user.",
        });
    }
});

app.post("/auth", (req, res) => {
    res.json({
        username : req.session.username,
        is_admin : req.session.is_admin,
    });
});

app.post("/logout", (req, res) => {
    req.session.username = null;
    res.sendStatus(200);
})

app.post("/messages", async (req, res) => {
    if (!req.session.username) {
        res.status(403).send("Not authorised.");
    } else {
        res.json(await database.all(`
            SELECT * FROM messages;
        `));
    }
})

app.get(["/chat.html", "/chat"], (req, res) => {
    if (!req.session.username) {
        res.status(403);
        res.redirect("/");
    } else {
        res.sendFile(join(__dirname, "public", "chat.html"))
    }
});

app.get(["/admin.html", "/admin"], (req, res) => {
    if (!req.session.is_admin) {
        res.status(403);
        res.redirect("/");
    } else {
        res.sendFile(join(__dirnasme, "public", "admin.html"));
    }
});

app.get("/:filename", (req, res) => {
    res.sendFile(join(__dirname, "public", req.params.filename), (err) => {
        if (err) {
            res.status(404).sendFile(join(__dirname, "public", "not_found.html"));
        }
    });
});

app.get("/:dir/:filename", (req, res) => {
    res.sendFile(join(__dirname, "public", req.params.dir, req.params.filename), (err) => {
        if (err) {
            res.status(404).sendFile(join(__dirname, "public", "not_found.html"));
        }
    })
})

server.listen(port, () => {
    console.log(`[server.js] listening on port ${port}`);
});