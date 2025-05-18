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
import sharp from "sharp";
import multer from "multer";
import sanitizeFilename from "sanitize-filename";
import fs from "fs/promises";
import favicon from "serve-favicon";

const port = 3000;
const hostname = process.argv[2] ?? "192.168.10.101"; // pass the hostname as an argument to node

const app = express();
const server = createServer(app);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
      files: 1
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed!"), false);
        }
    }
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const profilePicsDir = join(__dirname, "public", "assets", "profile")

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

app.use(favicon(join(__dirname, "public", "assets", "favicon.ico")));

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

app.get("/", (_, res) => {
    res.sendFile(join(__dirname, "public", "index.html"));
});

app.post("/api/signup", async (req, res) => {
    try {
        const ret = await user.create_user(req.body.username, req.body.password);
        res.json({
            status   : ret.status,
            response : ret.response,
        });
    } catch(e) {
        console.error("Failed to create user:", e);
        res.json({
            status : 500,
            error  : "Failed to create user.",
        });
    }
});

app.post("/api/signin", async (req, res) => {
    try {
        const ret = await user.sign_in(req.body.username, req.body.password);

        if (ret.username) {
            req.session.username = ret.username;
            req.session.is_admin = ret.is_admin;
            req.session.user_id = ret.user_id;
        }

        res.json({
            status   : ret.status,
            response : ret.response,
        });
    } catch (e) {
        console.error("Failed to authenticate user:", e);
        res.json({
            status : 500,
            error  : "Failed to authenticate user.",
        });
    }
});

app.post("/api/auth", (req, res) => {
    res.json({
        status   : 200,
        username : req.session.username,
        is_admin : req.session.is_admin,
        user_id  : req.session.user_id,
    });
});

app.post("/api/logout", (req, res) => {
    req.session.destroy();
    res.sendStatus(200);
})

app.post("/api/messages", async (req, res) => {
    if (!req.session.username) {
        res.status(403).send("Not authorised.");
    } else {
        res.json(await database.all(`
            SELECT * FROM messages;
        `));
    }
})

app.post("/api/users", async (req, res) => {
    if (!req.session.is_admin) {
        res.status(403).send("Not authorised.");
    } else {
        res.json(await database.all(`
            SELECT * FROM users;
        `));
    }
});


// endpoint to run db queries for admin.js
app.post("/api/dbrun", async (req, res) => {
    if (!req.session.is_admin) {
        res.status(403);
        res.redirect("/");
    } else {
        res.send(
            await database.run(
                req.body.sql,
                req.body.params,
            )
        );
    }
});

// endpoint to check if a user is deleted for chat.js
app.post("/api/isdeleted", async (req, res) => {
    if (!req.session.username) {
        res.status(403);
        res.redirect("/")
    } else {
        res.send(
            await database.get(`
                SELECT deleted FROM users WHERE username = ?
            `, [req.body.username])
        );
    }
});

app.get('/api/profile', async (req, res) => {
    const { username } = req.query;
    
    if (!username) {
        return res.json({
            status   : 400,
            response : "Username is required.",
        });
    }

    function escapeHTML(str) {
        return str.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    try {
        const user = await database.get(
            "SELECT id FROM users WHERE username = ?", 
            [username]
        );

        if (!user) {
            return res.json({
                status   : 404,
                response : `User ${username} not found.`,
            })
        }

        res.send(`
            <div style="display: flex; flex-direction: column; gap: 10px; width: fit-content;" class="wrapper">
                <h4 style="margin: 0;">Profile</h4>
                <div style="display: flex; align-items: center;">
                    <img id="profilePicDisplay" alt="Profile picture" 
                         src="/assets/profile/${encodeURIComponent(username)}.webp" 
                         style="width: 50px; height: 50px; object-fit: cover;"
                         onerror="this.src='/assets/profile/default-profile.webp'">
                    <div style="margin-left: 20px; font-size: 17px;">
                        <b id="usernameHeader">${escapeHTML(username)}</b>
                        <small id="userIdHeader">#${escapeHTML(user.id.toString())}</small>
                    </div>
                </div>
            </div>
        `);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).send('Error fetching user information');
    }
});

app.post("/api/profile/upload", upload.single("profile_pic"), async (req, res) => {
    if (!req.session.username) {
        return res.json({
            status : 403,
            error  : "Not authorised",
        });
    }

    if (!req.file) {
        return res.json({
            status : 400,
            error  : "No file uploaded",
        });
    }

    try {
        const sanitizedFilename = sanitizeFilename(`${req.session.username}.webp`);
        const outputPath = join(profilePicsDir, sanitizedFilename);

        await sharp(req.file.buffer)
            .resize(250, 250, {
                fit: "cover",
                position: "center",
            })
            .webp({ quality: 80 })
            .toFile(outputPath);

        res.json({
            status   : 200,
            response : "Profile picture uploaded successfully",
        });
    } catch (err) {
        res.json({
            status : 500,
            error  : "Error processing image:" + err,
        });
    }
});

app.post("/api/rename", async (req, res) => {
    const target = req.body.target;
    const newName = req.body.newName;

    try {
        if (target !== req.session.username && !req.session.is_admin) {
            return res.json({
                status   : 403,
                response : "Not authorised",
            });
        }

        await database.run(`
            UPDATE users SET username = ? WHERE username = ?;
        `, [newName, target]);

        await database.run(`
            UPDATE messages SET username = ? WHERE username = ?;
        `, [newName, target]);

        res.json({
            status   : 200,
            response : `Successfully renamed user ${target} to ${newName}`,
        });
    } catch (err) {
        res.json({
            status : 500,
            error  : "Error renaming user:" + err,
        });
    }
})

app.get(["/chat.html", "/chat"], (req, res) => {
    if (!req.session.username) {
        res.status(403);
        res.redirect("/");
    } else {
        res.sendFile(join(__dirname, "public", "chat.html"));
    }
});

app.get(["/admin.html", "/admin"], (req, res) => {
    if (!req.session.is_admin) {
        res.status(403);
        res.redirect("/");
    } else {
        res.sendFile(join(__dirname, "public", "admin.html"));
    }
});

app.get("/profile/:username", async (req, res) => {
    try {
        const sanitizedUsername = sanitizeFilename(req.params.username);
        const imagePath = join(profilePicsDir, `${sanitizedUsername}.webp`);

        try {
            await fs.access(imagePath);
        } catch {
            const defaultImagePath = join(__dirname, "public", "assets", "profile", "default-profile.webp");
            return res.sendFile(defaultImagePath);
        }

        res.sendFile(imagePath);
    } catch (err) {
        console.error("Error serving profile picture:", err);
        res.status(500).send("Error retrieving profile picture");
    }
});

app.get(["/preferences.html", "/preferences"], (req, res) => {
    if (!req.session.username) {
        res.status(403);
        res.redirect("/");
    } else {
        res.sendFile(join(__dirname, "public", "preferences.html"));
    }
});

app.get(/^\/([^\.]+)(\..+)?/, (req, res) => {
    const fullPath = join(__dirname, "public", req.params[0] + (req.params[1] || ".html"));
    res.sendFile(fullPath, (err) => {
        if (err) {
            res.status(404).sendFile(join(__dirname, "public", "not_found.html"));
        }
    });
});

server.listen(port, hostname, () => {
    console.log(`listening at http://${hostname}:${port}`);
});