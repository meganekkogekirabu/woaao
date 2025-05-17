async function auth() {
    return await fetch("/api/auth", {
        method: "POST",
    })
    .then((data) => {
        return data.json();
    });
}

auth().then((response) => {
    if (response.username) {
        window.location.href = "chat";
    }
})

const signup_form = document.getElementById("signup-form");
const signin_form = document.getElementById("signin-form");

signup_form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const response_status = event.target.nextElementSibling;
    const form_data = new FormData(signup_form);
    const username = form_data.get("username");
    const password = form_data.get("password");

    try {
        const response = await fetch("/api/signup", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({ username, password }),
        });

        const data = await response.json();

        if (data.status === 201) {  
            response_status.textContent = data.response;
            location.reload();
        } else {
            response_status.textContent = `${data.error || data.response}`;
        }
    } catch (e) {
        console.error("Error while sending request:", e);
        response_status.textContent = "An error occurred during the request. Please try again later.";
    }
});

signin_form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const response_status = event.target.nextElementSibling;
    const form_data = new FormData(signin_form);
    const username = form_data.get("username");
    const password = form_data.get("password");

    try {
        const response = await fetch("/api/signin", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({ username, password }),
        });

        const data = await response.json();

        if (data.status === 200) {
            response_status.textContent = data.response;
            location.reload();
        } else {
            response_status.textContent = `${data.error || data.response}`
        }
    } catch (e) {
        console.error("Error while sending request:", e);
        response_status.textContent = "An error occurred during the request. Please try again later.";
    }
})

document.addEventListener("click", (event) => {
    const show_button = event.target.closest("[data-dialog-target]");
    const close_button = event.target.closest(".close-dialog");

    if (show_button) {
        const dialog_id = show_button.dataset.dialogTarget;
        const dialog = document.getElementById(dialog_id);
        if (dialog) {
            dialog.showModal();
        }
    }

    if (close_button) {
        const dialog = close_button.closest("dialog");
        if (dialog) {
            dialog.close();
        }
    }
})