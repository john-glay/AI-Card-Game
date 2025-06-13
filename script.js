document.addEventListener('DOMContentLoaded', () => {

    const openModalButtons = document.querySelectorAll('[data-modal-target]');
    const closeModalButtons = document.querySelectorAll('.close-btn');
    const modals = document.querySelectorAll('.modal');

    openModalButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = document.querySelector(button.dataset.modalTarget);
            openModal(modal);
        });
    });

    modals.forEach(modal => {
        const closeButton = modal.querySelector('.close-btn');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                closeModal(modal);
            });
        }
    });

    function openModal(modal) {
        if (modal == null) return;
        modal.style.display = 'flex';
    }

    function closeModal(modal) {
        if (modal == null) return;
        modal.style.display = 'none';
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