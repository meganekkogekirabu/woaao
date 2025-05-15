import * as database from "./database.js";
import bcrypt from "bcryptjs";

export async function create_user(username, password) {
    if (username.length > 20 || password.length > 20) {
        return {
            response: "Username or password is too long.",
            status: 400,
        };
    }

    await database.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        );
    `);
    
    const hash = bcrypt.hashSync(password, 10);

    try { 
        await database.query(`
            INSERT INTO users (username, password)
            VALUES ("${username}", "${password}");
        `);
    } catch (e) {
        return {
            response: "Please pick a different username; the one you have chosen already exists.",
            status: 400,
        }
    }
    
    return {
        response: "Creation succeeded! This tab should now automatically refresh.",
        status: 200,
    };
}