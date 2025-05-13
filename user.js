import * as database from "./database.js";
import bcrypt from "bcryptjs";

export async function create_user(username, password) {
    console.log("[user.js] awaiting table check")

    await database.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        );
    `)
    
    const hash = bcrypt.hashSync(password, 10);
    
    console.log("[user.js] sending over to database.js");

    await database.query(`
        INSERT INTO users (username, password)
        VALUES (?, ?)
    `, username, hash);
}