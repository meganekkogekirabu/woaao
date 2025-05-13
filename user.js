import database from "database.js";
import bcrypt from "bcrypt";

export async function create_user(username, password) {
    await database.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        );
    `)

    await database.query(`
        INSERT INTO 
    `)
}