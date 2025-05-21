const logout = document.getElementById("logout")

logout.addEventListener("click", async () => {
    await fetch("/api/logout", {
        method: "POST",
    });
    window.location.href = "/";
});

var username;
fetch("/api/auth", {
    method: "POST",
})
.then((response) => {
    if (!response.ok) {
        throw new Error("network response was not ok for /api/auth")
    }
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        throw new TypeError(`expected application/json for /api/auth but received ${contentType}`);
    }
    return response.json();
})
.then(async (data) => {
    username = data.username;
    
    await fetch("/api/isdeleted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: data.username }),
    })
    .then((response) => {
        return response.json();
    })
    .then(async (data) => {
        if (data.deleted == 1) {
            await fetch("/api/logout", {
                method: "POST",
            });
            window.location.href = "/";
        }
    });

    if (data.is_admin) {
        document.getElementById("admin").style.display = "unset";
    }
})
.catch((e) => {
    console.error("Error fetching authentication:", e);
    window.location.href = "/";
});

const socket = io();

const form = document.getElementById("message-form");
const input = document.getElementById("message-input");
const messages = document.getElementById("messages");

form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (input.value) {
        socket.emit("message", {
            content   : input.value,
            username  : username,
            timestamp : Date.now(),
        });
        input.value = "";
    }
});

async function getMessages() {
    const response = await fetch("/api/messages", { method: "POST" });
    if (!response.ok) throw new Error("Network error");

    let messages = await response.json();

    await Promise.all(messages.map(async (msg, i) => {
        const res = await fetch("/api/isdeleted", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: msg.username }),
        });
        const data = await res.json();
        if (data.deleted === 1) messages[i].username = "Deleted user";
    }));

    return messages;
}

function appendMessage(msg) {
    const item = document.createElement("li");
    item.classList.add("message-container");

    const messageWrapper = document.createElement("div");
    messageWrapper.classList.add("message-wrapper");

    const profilePicWrapper = document.createElement("button");
    profilePicWrapper.classList.add("show-user-dialog");
    profilePicWrapper.dataset.username = msg.username;
    profilePicWrapper.dataset.target = "userDialogContainer";
    
    const profilePic = document.createElement("img");
    profilePic.classList.add("profile-pic");
    profilePic.src = `assets/profile/${msg.username}.webp`;
    profilePic.alt = `${msg.username}'s profile picture`;
    profilePic.onerror = function() {
        this.src = 'assets/profile/default-profile.webp';
    };

    profilePicWrapper.appendChild(profilePic);

    const messageContent = document.createElement("div");
    messageContent.classList.add("message-content-container");

    const header = document.createElement("p");
    header.classList.add("message-header");

    if (msg.username === "Deleted user") {
        header.innerHTML = `<span style="color: red;">${msg.username}</span> — ${new Date(msg.timestamp).toLocaleString()}`;
    } else {
        header.textContent = `${msg.username} — ${new Date(msg.timestamp).toLocaleString()}`;
    }

    const content = document.createElement("p");
    content.classList.add("message-text");
    content.textContent = msg.content;

    messageContent.appendChild(header);
    messageContent.appendChild(content);

    if (msg.username === username) {
        item.classList.add("own-message");
        messageWrapper.appendChild(profilePicWrapper);
        messageWrapper.appendChild(messageContent);
    } else {
        item.classList.add("other-message");
        messageWrapper.appendChild(profilePicWrapper);
        messageWrapper.appendChild(messageContent);
    }

    item.appendChild(messageWrapper);
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
}

getMessages().then((response) => {
    response.forEach((msg) => {
        appendMessage(msg);
    });
});

socket.on("message", (msg) => {
    appendMessage(msg);
});

const admin = document.getElementById("admin");

admin.addEventListener("click", () => {
    window.location.href = "/admin";
});

const prefs = document.getElementById("prefs");

prefs.addEventListener("click", () => {
    window.location.href = "/preferences";
});
