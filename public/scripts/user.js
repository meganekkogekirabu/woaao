import * as database from "../../database.js";
import bcrypt from "bcryptjs";

export async function create_user(username, password) {
    if (username.length > 20 || password.length > 20) {
        return {
            response : "Username or password is too long.",
            status   : 400,
        };
    }

    await database.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        );
    `);
    
    const hash = bcrypt.hashSync(password, 10);

    try { 
        await database.run(`
            INSERT INTO users (username, password)
            VALUES (?, ?);
        `, [username, hash]);
    } catch (e) {
        console.error(e);
        return {
            response : "Please pick a different username; the one you have chosen already exists.",
            status   : 400,
        }
    }
    
    return {
        response : "Creation succeeded! This tab should now automatically refresh.",
        status   : 201,
    };
}

export async function sign_in(username, password) {
    const row = await database.get(`
        SELECT * FROM users WHERE username = ?;
    `, [username]);

    if (!row) {
        return {
            response : "Incorrect username or password.",
            status   : 403,
        };
    }

    const hash = row.password;

    if (bcrypt.compare(password, hash)) {
        return {
            response : "Authorisation succeeded! This tab should now automatically refresh.",
            cookie   : username,
            status   : 200,
        };
    } else {
        return {
            response : "Incorrect username or password.",
            status   : 403,
        };
    }
}