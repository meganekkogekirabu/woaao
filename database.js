import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export async function query(query) {
    const db = await open({
        filename: "chat.db",
        driver: sqlite3.Database,
    });

    await db.exec(query);
};