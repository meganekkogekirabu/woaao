async function getUsers() {
    const response = await fetch("/api/users", {
        method: "POST",
    })
    if (!response.ok) {
        throw new Error("[admin.js] network response was not ok for getUsers()")
    }
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        throw new TypeError(`[admin.js] expected application/json for getUsers() but received ${contentType}`);
    }
    return response.json();
}

async function dbRun(sql, params) {
    const response = await fetch("/api/dbrun", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            sql    : sql,
            params : params,
        }),
    });
    if (!response.ok) {
        throw new Error("[admin.js] network response was not ok for dbRun()")
    }
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        throw new TypeError(`[admin.js] expected application/json for dbRun() but received ${contentType}`);
    }
    return response.json();
}

getUsers().then((response) => {
    response.forEach((user) => {
        const item = document.createElement("div");
        item.classList.add("user");

        const left = document.createElement("div");
        const user_header = document.createElement("div");
        const username = document.createElement("p");

        const username_main = document.createElement("b");
        username_main.textContent = user.username;
        username.appendChild(username_main);

        const user_id = document.createElement("small");
        user_id.textContent = "#" + user.id;
        username.appendChild(user_id);

        user_header.appendChild(username);

        if (user.user_groups) {
            const pill = document.createElement("div");
            pill.classList.add("pill");
            pill.classList.add(user.user_groups);
            pill.textContent = user.user_groups;
            user_header.appendChild(pill);
        }

        left.appendChild(user_header);

        const timestamp = document.createElement("div");
        timestamp.classList.add("timestamp");
        if (!user.created_at) {
            timestamp.textContent = "Creation date unknown.";
        } else {
            timestamp.textContent = `Created at ${new Date(user.created_at).toLocaleString()}`;
        }
        left.appendChild(timestamp);

        item.appendChild(left);

        if (!user.deleted) {
            const checkboxes = document.createElement("div");
            const input = document.createElement("input");
            input.type = "checkbox";
            input.name = "checkbox";
            input.checked = user.user_groups?.includes("admin") ?? false;
    
            input.addEventListener("change", async () => {
                if (input.checked === false) {
                    fetch("/api/auth", {
                        method: "POST",
                    })
                    .then((response) => {
                        if (!response.ok) {
                            throw new Error("[admin.js] network response was not ok for /auth")
                        }
                        const contentType = response.headers.get("content-type");
                        if (!contentType || !contentType.includes("application/json")) {
                            throw new TypeError(`[admin.js] expected application/json for /auth but received ${contentType}`);
                        }
                        return response.json();
                    })
                    .then(async (data) => {
                        const actor = data.username;
                        if (user.username === actor) {
                            if (!confirm("You are about to desysop yourself. Are you sure you want to do this?")) {
                                input.checked = true;
                                return;
                            } else {
                                await dbRun(`
                                    UPDATE users SET user_groups = '' WHERE id = ?;
                                `, [user.id]);
                                fetch("/logout", {
                                    method: "POST",
                                });
                                alert("Successfully removed sysop. You will now be logged out.");
                                window.location.href = "/";
                            }
                        } else {
                            await dbRun(`
                                UPDATE users SET user_groups = '' WHERE id = ?;
                            `, [user.id]);
                            location.reload();
                        }
                    })
                    .catch((e) => {
                        console.error("Error fetching authentication:", e);
                        window.location.href = "/";
                    });
                } else {
                    await dbRun(`
                        UPDATE users SET user_groups = 'admin' WHERE id = ?;
                    `, [user.id]);
                    location.reload();
                }
            });
    
            checkboxes.appendChild(input);
    
            const label = document.createElement("label");
            label.for = "checkbox";
            label.textContent = "admin";
    
            checkboxes.appendChild(label);
            left.appendChild(checkboxes);

            const delete_button = document.createElement("button");
            delete_button.textContent = "Delete user";

            delete_button.addEventListener("click", () => {
                fetch("/api/auth", {
                    method: "POST",
                })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error("[admin.js] network response was not ok for /auth")
                    }
                    const contentType = response.headers.get("content-type");
                    if (!contentType || !contentType.includes("application/json")) {
                        throw new TypeError(`[admin.js] expected application/json for /auth but received ${contentType}`);
                    }
                    return response.json();
                })
                .then(async (data) => {
                    const actor = data.username;
                    if (user.username === actor) {
                        alert("Cannot delete current user.");
                    } else {
                        if (confirm("Are you sure you want to delete this user?")) {
                            await dbRun(`
                                UPDATE users SET deleted = 1 WHERE id = ?;
                            `, [user.id]);
                            location.reload();
                        }
                    }
                })
                .catch((e) => {
                    console.error("Error fetching authentication:", e);
                    window.location.href = "/";
                });
            })
            item.appendChild(delete_button);
        } else {
            item.classList.add("deleted");
            const undelete_button = document.createElement("button");
            undelete_button.textContent = "Undelete user";
            undelete_button.classList.add("undelete");

            undelete_button.addEventListener("click", async () => {
                if (confirm("Are you sure you want to undelete this user?")) {
                    await dbRun(`
                        UPDATE users SET deleted = 0 WHERE id = ?;
                    `, [user.id]);
                    location.reload();
                }
            });
            item.appendChild(undelete_button);
        }

        document.getElementById("users").appendChild(item);
    });
});