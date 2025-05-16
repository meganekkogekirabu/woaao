const logout = document.getElementById("logout")

logout.addEventListener("click", async () => {
    await fetch("/logout", {
        method: "POST",
    });
    window.location.href = "/";
});

let username;
let is_admin;

fetch("/auth", {
    method: "POST",
})
.then((response) => {
    return response.json();
})
.then((data) => {
    console.log(data);
    username = data.username;
    is_admin = data.is_admin;

    if (is_admin === true) {
        document.getElementById("admin").style.display = "unset";
    }
})
.catch((e) => {
    console.error("Error fetching authentication:", e);
})

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
    return await fetch("/messages", {
        method: "POST",
    })
    .then((data) => {
        return data.json();
    });
}

function appendMessage(msg) {
    const item = document.createElement("li");

    if (msg.username === username) {
        item.classList.add("own-message");
    } else {
        item.classList.add("other-message");
    }

    const header = document.createElement("p");
    header.classList.add("message-header");
    header.textContent = `${msg.username} — ${new Date(msg.timestamp).toLocaleString()}`;
    item.appendChild(header);

    const content = document.createElement("p");
    content.classList.add("message-content");
    content.textContent = msg.content;
    item.appendChild(content);

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