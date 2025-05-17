let cropper;
let originalImageFile;


fetch("/api/auth", {
    method: "POST",
})
.then((response) => response.json())
.then(async (data) => {
    await showUserDialog(data.username, "userDialogContainer");
    const rename = document.createElement("button");
    rename.style.all = "unset";
    rename.style.cursor = "pointer";
    rename.innerHTML = "&#9998;&nbsp;";
    rename.title = "Rename this user";
    rename.addEventListener("click", () => {
        const dialog = document.getElementById("rename-dialog");
        const oldName = document.getElementById("oldName");
        oldName.textContent = `old username: ${data.username}`;
    
        dialog.show();
    
        const dialogResult = new Promise((resolve, reject) => {
            document.getElementById("close-dialog").addEventListener("click", () => {
                dialog.close();
                reject('dialog closed');
            }, { once: true });
    
            const form = document.getElementById("rename-form");
            form.addEventListener("submit", (event) => {
                event.preventDefault();
                const formData = new FormData(form);
                resolve(formData);
            }, { once: true });
        });
    
        dialogResult
            .then((formData) => {
                return fetch("/api/rename", {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({
                        target: data.username,
                        newName: formData.get("newName"),
                    })
                });
            })
            .then((response) => response.json())
            .then((data) => {
                document.getElementById("rename-status").textContent = data.response;
                window.location.reload();
            })
            .catch((error) => {
                if (error !== 'dialog closed') {
                    console.error("Error:", error);
                }
            });
    });
    document.querySelector(".wrapper > div > div").prepend(rename);
    document.querySelector(".wrapper").classList.remove("wrapper");
})
.catch((e) => {
    console.error("Error fetching authentication:", e);
    window.location.href = "/";
});

document.getElementById('profilePicInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
    }

    originalImageFile = file;
    const preview = document.getElementById('imagePreview');
    const reader = new FileReader();
    
    reader.onload = function(event) {
        preview.src = event.target.result;
        document.getElementById('imagePreviewContainer').style.display = 'block';
        document.getElementById('uploadButton').disabled = false;
    };
    
    reader.readAsDataURL(file);
});


document.getElementById('cropButton').addEventListener('click', () => {
    const modal = document.getElementById('cropModal');
    const croppingImage = document.getElementById('croppingImage');
    const preview = document.getElementById('imagePreview');
    

    croppingImage.src = preview.src;
    croppingImage.onload = () => {
        modal.style.display = 'block';
        
        if (cropper) {
            cropper.destroy();
        }
        
        cropper = new Cropper(croppingImage, {
            aspectRatio: 1,
            viewMode: 1,
            autoCropArea: 0.8,
            responsive: true,
            checkCrossOrigin: false,
            ready: () => {
                this.cropper.setCanvasData({
                    left: 0,
                    top: 0,
                    width: this.cropper.getContainerData().width,
                    height: this.cropper.getContainerData().height
                });
            }
        });
    };
});


document.getElementById('cancelCrop').addEventListener('click', () => {
    document.getElementById('cropModal').style.display = 'none';
    if (cropper) {
        cropper.destroy();
    }
});


document.getElementById('confirmCrop').addEventListener('click', () => {
    if (!cropper) return;
    
    const preview = document.getElementById('imagePreview');
    const canvas = cropper.getCroppedCanvas({
        width: 250,
        height: 250,
        fillColor: '#fff',
        imageSmoothingQuality: 'high',
    });
    
    preview.src = canvas.toDataURL('image/jpeg');
    document.getElementById('cropModal').style.display = 'none';
    cropper.destroy();
});


document.getElementById('profilePicForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const preview = document.getElementById('imagePreview');
    
    const blob = await fetch(preview.src).then(r => r.blob());
    const file = new File([blob], originalImageFile.name, {
        type: 'image/jpeg',
        lastModified: Date.now()
    });
    
    const formData = new FormData();
    formData.append('profile_pic', file);
    
    try {
        const response = await fetch('api/profile/upload', {
            method: 'POST',
            body: formData,
        });
        const result = await response.json();
        window.location.reload();
    } catch (err) {
        console.error('Upload error:', err);
        alert('Upload failed');
    }
});