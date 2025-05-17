async function showUserDialog(username, targetElementId) {
    try {
        const response = await fetch(`/api/profile?username=${encodeURIComponent(username)}`);
        
        if (!response.ok) {
            throw new Error("Failed to fetch user dialog");
        }
        
        const dialogHTML = await response.text();
        document.getElementById(targetElementId).innerHTML = dialogHTML;
        
        const img = document.querySelector(`#${targetElementId} #profilePicDisplay`);
        img.onerror = function() {
            this.src = "/assets/profile/default-profile.webp";
        };
    } catch (error) {
        console.error("Error loading user dialog:", error);
        document.getElementById(targetElementId).innerHTML = `
            <div class="error">Error loading user information</div>
        `;
    }
}

document.addEventListener("click", async (event) => {
    if (event.target.classList.contains("show-user-dialog")) {
        event.preventDefault();

        const previousDialog = document.getElementById("userDialogContainer")

        if (event.target.parentElement.parentElement === previousDialog?.parentElement) {
            previousDialog.remove();
            return;
        } else {
            previousDialog?.remove();
        }

        const dialogContainer = document.createElement("div")
        dialogContainer.id = "userDialogContainer"
        event.target.closest(".message-container").appendChild(dialogContainer);

        const username = event.target.dataset.username;
        const target = event.target.dataset.target;
        
        await showUserDialog(username, target);
    }
});