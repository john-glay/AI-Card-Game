document.addEventListener('DOMContentLoaded', () => {

    const openModalButtons = document.querySelectorAll('[data-modal-target]');
    const modals = document.querySelectorAll('.modal');

    openModalButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = document.querySelector(button.dataset.modalTarget);
            openModal(modal);
        });
    });

    const allCloseButtons = document.querySelectorAll('.close-btn');
    allCloseButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            closeModal(modal);
        });
    });

    function openModal(modal) {
        if (modal == null) return;
        modal.style.display = 'flex';
    }

    function closeModal(modal) {
        if (modal == null) return;
        modal.style.display = 'none';
    }

    // --- NAME & GAME START LOGIC ---
    const nameInput = document.getElementById('name');
    const startGameBtn = document.getElementById('startGameBtn');

    // Restore name from localStorage on the main menu
    if (nameInput) {
        const savedName = localStorage.getItem('playerName');
        if (savedName) {
            nameInput.value = savedName;
        }

        // Add real-time saving on every input change
        nameInput.addEventListener('input', () => {
            localStorage.setItem('playerName', nameInput.value);
        });
    }

    // Handle start game button click
    if (startGameBtn && nameInput) {
        startGameBtn.addEventListener('click', () => {
            const playerName = nameInput.value.trim();
            if (playerName) {
                // The name is already saved by the input event listener
                window.location.href = 'gameplay.html';
            } else {
                const modal = document.getElementById('promptNameModal');
                openModal(modal);
            }
        });
    }

    // Display player name on gameplay screen
    const playerNameDisplay = document.querySelector('.player-container .name');
    if (playerNameDisplay) {
        const savedName = localStorage.getItem('playerName');
        if (savedName) {
            playerNameDisplay.textContent = savedName;
        }
    }

    window.addEventListener('click', event => {
        modals.forEach(modal => {
            if (event.target == modal) {
                closeModal(modal);
            }
        });
    });

    const confirmExitBtn = document.getElementById("confirmExitBtn");
    if (confirmExitBtn) {
        confirmExitBtn.addEventListener('click', () => {
            window.close();
        });
    }

    const cancelExitBtn = document.getElementById("cancelExitBtn");
    if(cancelExitBtn) {
        cancelExitBtn.addEventListener('click', () => {
            const modal = document.getElementById('exitModal');
            closeModal(modal);
        });
    }

    const resumeBtn = document.querySelector('#pauseModal button[style*="#6DFF74"]');
    if (resumeBtn) {
        resumeBtn.addEventListener('click', () => {
            const modal = document.getElementById('pauseModal');
            closeModal(modal);
        });
    }
}); 