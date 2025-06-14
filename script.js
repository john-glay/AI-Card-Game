document.addEventListener('DOMContentLoaded', () => {

    // --- SETTINGS & AUDIO ---
    const settings = {
        volume: 0.5, // Default volume
        darkMode: false,
    };

    const audio = {
        bgm: new Audio('https://patrickdearteaga.com/audio/Child\'s%20Nightmare.ogg'),
    };
    audio.bgm.loop = true;
    
    const volumeSlider = document.getElementById('bgm-volume');
    const darkModeToggle = document.getElementById('dark-mode-toggle');

    function saveSettings() {
        localStorage.setItem('gameSettings', JSON.stringify(settings));
    }

    function loadSettings() {
        const savedSettings = localStorage.getItem('gameSettings');
        if (savedSettings) {
            Object.assign(settings, JSON.parse(savedSettings));
        }

        // Apply settings to UI
        if (volumeSlider) {
            volumeSlider.value = settings.volume * 100;
        }
        audio.bgm.volume = settings.volume;
        if (darkModeToggle) {
            darkModeToggle.checked = settings.darkMode;
        }

        // Apply dark mode
        if (settings.darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        
        // Handle BGM
        if (settings.volume > 0 && audio.bgm.paused) {
            audio.bgm.play().catch(() => {});
        } else if (settings.volume === 0) {
            audio.bgm.pause();
        }
    }

    if(volumeSlider) {
        volumeSlider.addEventListener('input', () => {
            settings.volume = volumeSlider.value / 100;
            audio.bgm.volume = settings.volume;
            
            if (settings.volume > 0 && audio.bgm.paused) {
                audio.bgm.play().catch(()=>{});
            } else if (settings.volume === 0) {
                audio.bgm.pause();
            }
            saveSettings();
        });
    }

    if(darkModeToggle) {
        darkModeToggle.addEventListener('change', () => {
            settings.darkMode = darkModeToggle.checked;
            document.body.classList.toggle('dark-mode');
            saveSettings();
        });
    }

    // --- GAME INITIALIZATION & UI RENDERING ---
    // Only run game logic on the gameplay page
    if (document.querySelector('.game-container')) {
        const savedStateJSON = localStorage.getItem('gameState');
        const playerName = localStorage.getItem('playerName') || 'Player';
        let game;

        if (savedStateJSON) {
            const savedState = JSON.parse(savedStateJSON);
            game = new Game(playerName, savedState);
            // Once loaded, the saved game should be cleared to prevent accidental reloading
            localStorage.removeItem('gameState'); 
        } else {
            game = new Game(playerName);
        }

        // --- STATE ---
        let selectedCards = { base: null, power: null };
        let isMoveConfirmed = false;
        let isActionInProgress = false;
        
        // --- UI ELEMENTS ---
        const gameContainer = document.querySelector('.game-container');
        const playerHandContainer = document.querySelector('.player-container .play-cards');
        const playButton = document.getElementById('play-button');
        const combineButton = document.getElementById('combine-button');
        const aiCardSlot = document.getElementById('ai-card-slot');
        const playerCardSlot = document.getElementById('player-card-slot');
        const roundResultMsg = document.getElementById('round-result-message');
        const battleFocusOverlay = document.getElementById('battle-focus-overlay');
        const cardInfoModal = document.getElementById('cardInfoModal');
        const winModal = document.getElementById('winModal');
        const loseModal = document.getElementById('loseModal');

        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        const dealInitialCards = async () => {
            // Disable buttons during deal
            playButton.disabled = true;
            combineButton.disabled = true;

            const playerDeckCountEl = document.getElementById('player-deck-count');
            const aiDeckCountEl = document.getElementById('ai-deck-count');
            const totalCards = 24; // Cards in initial deck

            const aiHandContainer = document.querySelector('.ai-container .card-back');
            const row1 = document.createElement('div');
            row1.classList.add('card-row');
            const row2 = document.createElement('div');
            row2.classList.add('card-row');

            // Clear containers
            aiHandContainer.innerHTML = '';
            playerHandContainer.innerHTML = '';
            playerHandContainer.appendChild(row1);
            playerHandContainer.appendChild(row2);

            // Deal cards one by one
            for (let i = 0; i < 5; i++) {
                // AI card
                if (game.ai.hand[i]) {
                    const aiCardImg = document.createElement('img');
                    aiCardImg.src = 'images/card-back.png';
                    aiCardImg.alt = 'card-back';
                    aiCardImg.classList.add('card-dealt');
                    aiHandContainer.appendChild(aiCardImg);
                }

                // Player card
                if (game.player.hand[i]) {
                    const card = game.player.hand[i];
                    const index = i;

                    const cardContainer = document.createElement('div');
                    cardContainer.classList.add('player-card-container', 'card-dealt');
                    cardContainer.dataset.cardIndex = index;

                    const cardButton = document.createElement('button');
                    cardButton.innerHTML = `<img src="${card.image}" alt="${card.name}">`;

                    const infoButton = document.createElement('button');
                    infoButton.classList.add('info-button');
                    infoButton.textContent = 'Info';

                    cardContainer.appendChild(cardButton);
                    cardContainer.appendChild(infoButton);

                    cardButton.addEventListener('click', () => updateSelectedCards(card, cardContainer, index));
                    infoButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        showCardInfo(card);
                    });

                    if (index < 2) {
                        row1.appendChild(cardContainer);
                    } else {
                        row2.appendChild(cardContainer);
                    }
                }
                
                await sleep(150); // Stagger the dealing of each card
                
                // Decrement deck count after card is "dealt"
                const newDeckCount = totalCards - (i + 1);
                playerDeckCountEl.textContent = newDeckCount;
                aiDeckCountEl.textContent = newDeckCount;
            }
            
            // Re-enable buttons
            updateButtonStates();
        };

        const animateHealthUpdate = async (target, damage) => {
            if (damage <= 0) return;

            const hpContainer = target === 'player' ? 
                document.querySelector('.player-container .health-points') : 
                document.querySelector('.ai-container .health-points');

            const hpText = target === 'player' ? document.getElementById('player-hp-text') : document.getElementById('ai-hp-text');
            const hpProgress = target === 'player' ? document.getElementById('player-hp-progress') : document.getElementById('ai-hp-progress');
            
            if (hpContainer) {
                const newHp = target === 'player' ? game.player.hp : game.ai.hp;

                // Update the values
                hpText.textContent = newHp;
                hpProgress.value = newHp;

                // Trigger animation
                hpContainer.classList.add('hp-damage');

                // Wait for animation to finish
                await sleep(600); 

                // Clean up
                hpContainer.classList.remove('hp-damage');
                hpText.style.transform = ''; // Reset transform
                hpText.style.color = ''; // Reset color
            }
        };

        // --- BUTTON STATE LOGIC ---
        const updateButtonStates = () => {
            const hasBase = selectedCards.base !== null;
            const hasPower = selectedCards.power !== null;

            if (isMoveConfirmed) {
                playButton.disabled = false;
                combineButton.disabled = false; // This allows the "Undo" button to be clicked
            } else {
                // Play is enabled if a base card is selected, BUT disabled if a power-up is also selected (forcing combine).
                playButton.disabled = !hasBase || hasPower;
                // Combine is only enabled if exactly one of each card type is selected.
                combineButton.disabled = !(hasBase && hasPower);
            }
        };

        // --- CARD SELECTION LOGIC ---
        const updateSelectedCards = (card, cardContainer, index) => {
            if (isMoveConfirmed) return; // Lock selections after confirmation

            const cardType = card.type;
            const currentSelectionIndex = selectedCards[cardType];

            // Deselect if clicking the same card
            if (currentSelectionIndex === index) {
                selectedCards[cardType] = null;
                cardContainer.classList.remove('selected');
            } else {
                // Deselect previous card of the same type
                if (currentSelectionIndex !== null) {
                    const prevContainer = playerHandContainer.querySelector(`[data-card-index="${currentSelectionIndex}"]`);
                    if(prevContainer) prevContainer.classList.remove('selected');
                }
                // Select the new card
                selectedCards[cardType] = index;
                cardContainer.classList.add('selected');
            }
            updateButtonStates();
        };
        
        // --- ACTION HANDLERS ---
        const handleCombineUndoClick = () => {
            if (isActionInProgress) return;
            isActionInProgress = true;

            if (isMoveConfirmed) {
                // --- UNDO LOGIC ---
                isMoveConfirmed = false;
                playerCardSlot.src = 'images/player-card.png';
                playerCardSlot.classList.remove('animate-reveal');
                renderUI(game); // Easiest way to re-enable hand and listeners
                
                // Restore selection visuals after re-render
                if (selectedCards.base !== null) {
                    const baseContainer = playerHandContainer.querySelector(`[data-card-index="${selectedCards.base}"]`);
                    if (baseContainer) baseContainer.classList.add('selected');
                }
                if (selectedCards.power !== null) {
                    const powerContainer = playerHandContainer.querySelector(`[data-card-index="${selectedCards.power}"]`);
                    if (powerContainer) powerContainer.classList.add('selected');
                }

                combineButton.textContent = 'Combine';
                combineButton.style.background = '#FDFF6D';
                updateButtonStates();

            } else {
                // --- CONFIRM/COMBINE LOGIC ---
                const baseCard = game.player.hand[selectedCards.base];
                const powerCard = game.player.hand[selectedCards.power];
                if (!baseCard || !powerCard) {
                    isActionInProgress = false;
                    return;
                };
                isMoveConfirmed = true;

                const combinedImageSrc = `images/${baseCard.name.toLowerCase()}-${powerCard.name.toLowerCase()}.png`;
                playerCardSlot.src = combinedImageSrc;
                playerCardSlot.classList.add('animate-reveal');

                playerHandContainer.querySelectorAll('.player-card-container').forEach(container => {
                    if (!container.classList.contains('selected')) {
                        container.querySelector('button').disabled = true;
                    }
                });
                
                combineButton.textContent = 'Undo';
                combineButton.style.background = '#FF6D6F';
                updateButtonStates();
            }
            isActionInProgress = false;
        };

        const handlePlayTurn = async () => {
            if (isActionInProgress) return;
            isActionInProgress = true;

            const baseCard = game.player.hand[selectedCards.base];
            if (!baseCard) {
                isActionInProgress = false;
                return;
            }

            const playerMove = {
                base: baseCard,
                power: selectedCards.power !== null ? game.player.hand[selectedCards.power] : null
            };

            const playerDrawCount = playerMove.power ? 2 : 1;

            if (!isMoveConfirmed) {
                 isMoveConfirmed = true;
                 playerCardSlot.src = baseCard.image;
                 playerCardSlot.classList.add('animate-reveal');
                 playerHandContainer.querySelectorAll('.player-card-container').forEach(container => {
                    if (!container.classList.contains('selected')) {
                        container.querySelector('button').disabled = true;
                    }
                });
                 await sleep(500); 
            }

            playButton.disabled = true;
            combineButton.disabled = true;

            const turnData = game.playTurn(playerMove);
            const aiDrawCount = turnData.aiMove.power ? 2 : 1;
            
            aiCardSlot.src = turnData.aiMove.power ? 
                `images/${turnData.aiMove.base.name.toLowerCase()}-${turnData.aiMove.power.name.toLowerCase()}.png` :
                turnData.aiMove.base.image;
            aiCardSlot.classList.add('animate-reveal');

            await sleep(500);

            // Clash animation
            playerCardSlot.classList.add('animate-clash');
            aiCardSlot.classList.add('animate-clash');
            
            await sleep(600); // Wait for clash to be visually impactful

            // --- BATTLE FOCUS EFFECT START ---
            battleFocusOverlay.style.display = 'block';
            gameContainer.classList.add('highlighted');

            // Show result message first
            let message = turnData.result.winner === 'tie' ? "It's a tie!" : 
                `${turnData.result.winner === 'player' ? game.playerName : 'AI'} wins and deals ${turnData.result.damageDealt} damage!`;
            
            roundResultMsg.textContent = message;
            roundResultMsg.style.display = 'block';

            await sleep(1500); // Let user read the message

            // Animate health update after showing the message
            if (turnData.result.winner === 'player') {
                await animateHealthUpdate('ai', turnData.result.damageDealt);
            } else if (turnData.result.winner === 'ai') {
                await animateHealthUpdate('player', turnData.result.damageDealt);
            }
            
            await sleep(1000); // Wait after health drop

            // --- BATTLE FOCUS EFFECT END ---
            roundResultMsg.style.display = 'none';
            battleFocusOverlay.style.display = 'none';
            gameContainer.classList.remove('highlighted');

            isMoveConfirmed = false;
            selectedCards = { base: null, power: null };
            aiCardSlot.src = 'images/ai-card.png';
            playerCardSlot.src = 'images/player-card.png';
            playerCardSlot.classList.remove('animate-reveal', 'animate-clash');
            aiCardSlot.classList.remove('animate-reveal', 'animate-clash');
            
            // Reset combine button state after turn
            combineButton.textContent = 'Combine';
            combineButton.style.background = '#FDFF6D';

            if (game.isGameOver) {
                await sleep(500);
                const modal = game.player.hp > 0 ? winModal : loseModal;
                openModal(modal);
            } else {
                 // --- DRAW PHASE & RESHUFFLE NOTIFICATION ---
                 const drawData = game.drawForEndOfTurn();
                 
                 if (drawData.playerReshuffled || drawData.aiReshuffled) {
                    const reshuffleMessageEl = document.getElementById('reshuffle-message');
                    
                    let playerMsg = '';
                    if(drawData.playerReshuffled) {
                        const reasonText = drawData.playerReason === 'Unplayable Hand' ? 'Unplayable Hand' : 'Deck Empty';
                        playerMsg = `Your Deck Reshuffled<br><span style="font-size: 18px; text-transform: none;">(${reasonText})</span>`;
                    }

                    let aiMsg = '';
                     if(drawData.aiReshuffled) {
                        const reasonText = drawData.aiReason === 'Unplayable Hand' ? 'Unplayable Hand' : 'Deck Empty';
                        aiMsg = `AI Deck Reshuffled<br><span style="font-size: 18px; text-transform: none;">(${reasonText})</span>`;
                    }
                    
                    reshuffleMessageEl.innerHTML = [playerMsg, aiMsg].filter(Boolean).join('<hr style="margin: 15px 0; border-color: black;">');
    
                    battleFocusOverlay.style.display = 'block';
                    reshuffleMessageEl.style.display = 'block';
    
                    await sleep(3000);
    
                    battleFocusOverlay.style.display = 'none';
                    reshuffleMessageEl.style.display = 'none';
                }
                
                await Promise.all([
                    animatePlayerDraw(game, drawData, playerDrawCount),
                    animateAiDraw(game, drawData, aiDrawCount)
                ]);

                updateButtonStates();
            }
            isActionInProgress = false;
        };

        const showCardInfo = (card) => {
            document.getElementById('info-modal-img').src = card.image;
            document.getElementById('info-modal-name').textContent = card.name;
            document.getElementById('info-modal-desc').textContent = card.description;
            openModal(cardInfoModal);
        };

        const createPlayerCardElement = (card, index, isStunned) => {
            const cardContainer = document.createElement('div');
            cardContainer.classList.add('player-card-container');
            cardContainer.dataset.cardIndex = index;

            const cardButton = document.createElement('button');
            cardButton.innerHTML = `<img src="${card.image}" alt="${card.name}">`;

            const infoButton = document.createElement('button');
            infoButton.classList.add('info-button');
            infoButton.textContent = 'Info';
            
            if (isStunned && card.type === 'power') {
                cardButton.disabled = true;
                cardButton.style.opacity = '0.5';
                infoButton.disabled = true;
            }

            cardContainer.appendChild(cardButton);
            cardContainer.appendChild(infoButton);

            cardButton.addEventListener('click', () => updateSelectedCards(card, cardContainer, index));
            infoButton.addEventListener('click', (e) => {
                e.stopPropagation();
                showCardInfo(card);
            });

            return cardContainer;
        }

        const animatePlayerDraw = async (gameInstance, drawData, playerDrawCount) => {
            const playerHandContainer = document.querySelector('.player-container .play-cards');
            const playerDeckCountEl = document.getElementById('player-deck-count');
            const playerHand = gameInstance.player.hand;
        
            const row1 = document.createElement('div');
            row1.classList.add('card-row');
            const row2 = document.createElement('div');
            row2.classList.add('card-row');
        
            playerHandContainer.innerHTML = '';
            playerHandContainer.appendChild(row1);
            playerHandContainer.appendChild(row2);
        
            if (drawData.playerReshuffled) {
                playerDeckCountEl.textContent = 24;
                for (let i = 0; i < playerHand.length; i++) {
                    await sleep(150);
                    playerDeckCountEl.textContent = 24 - (i + 1);
                    const cardContainer = createPlayerCardElement(playerHand[i], i, gameInstance.player.isStunned);
                    cardContainer.classList.add('card-dealt');
                    if (i < 2) { row1.appendChild(cardContainer); } 
                    else { row2.appendChild(cardContainer); }
                }
            } else {
                const oldPlayerCardCount = 5 - playerDrawCount;
                for (let i = 0; i < oldPlayerCardCount; i++) {
                    const cardContainer = createPlayerCardElement(playerHand[i], i, gameInstance.player.isStunned);
                    if (i < 2) { row1.appendChild(cardContainer); } 
                    else { row2.appendChild(cardContainer); }
                }
        
                for (let i = 0; i < playerDrawCount; i++) {
                    await sleep(200);
                    playerDeckCountEl.textContent = parseInt(playerDeckCountEl.textContent) - 1;
                    const cardIndex = oldPlayerCardCount + i;
                    const cardContainer = createPlayerCardElement(playerHand[cardIndex], cardIndex, gameInstance.player.isStunned);
                    cardContainer.classList.add('card-dealt');
                    if (cardIndex < 2) { row1.appendChild(cardContainer); } 
                    else { row2.appendChild(cardContainer); }
                }
            }
            playerDeckCountEl.textContent = gameInstance.player.deck.length;
        };
        
        const animateAiDraw = async (gameInstance, drawData, aiDrawCount) => {
            const aiHandContainer = document.querySelector('.ai-container .card-back');
            const aiDeckCountEl = document.getElementById('ai-deck-count');
            const aiHand = gameInstance.ai.hand;
        
            aiHandContainer.innerHTML = '';
        
            if (drawData.aiReshuffled) {
                aiDeckCountEl.textContent = 24;
                for (let i = 0; i < aiHand.length; i++) {
                    await sleep(150);
                    aiDeckCountEl.textContent = 24 - (i + 1);
                    const aiCardImg = document.createElement('img');
                    aiCardImg.src = 'images/card-back.png';
                    aiCardImg.alt = 'card-back';
                    aiCardImg.classList.add('card-dealt');
                    aiHandContainer.appendChild(aiCardImg);
                }
            } else {
                const oldAiCardCount = 5 - aiDrawCount;
                for (let i = 0; i < oldAiCardCount; i++) {
                    aiHandContainer.innerHTML += `<img src="images/card-back.png" alt="card-back">`;
                }
                for (let i = 0; i < aiDrawCount; i++) {
                    await sleep(200);
                    aiDeckCountEl.textContent = parseInt(aiDeckCountEl.textContent) - 1;
                    const aiCardImg = document.createElement('img');
                    aiCardImg.src = 'images/card-back.png';
                    aiCardImg.alt = 'card-back';
                    aiCardImg.classList.add('card-dealt');
                    aiHandContainer.appendChild(aiCardImg);
                }
            }
            aiDeckCountEl.textContent = gameInstance.ai.deck.length;
        };

        const renderUI = (gameInstance) => {
            // Render names and HP
            document.querySelector('.player-container .name').textContent = gameInstance.playerName;
            document.getElementById('ai-hp-text').textContent = gameInstance.ai.hp;
            document.getElementById('ai-hp-progress').value = gameInstance.ai.hp;
            document.getElementById('player-hp-text').textContent = gameInstance.player.hp;
            document.getElementById('player-hp-progress').value = gameInstance.player.hp;
            document.getElementById('ai-hp-progress').max = 30; // Ensure max is set
            document.getElementById('player-hp-progress').max = 30; // Ensure max is set

            // Render deck counts
            document.getElementById('ai-deck-count').textContent = gameInstance.ai.deck.length;
            document.getElementById('player-deck-count').textContent = gameInstance.player.deck.length;

            // Render AI hand (card backs)
            const aiHandContainer = document.querySelector('.ai-container .card-back');
            aiHandContainer.innerHTML = '';
            gameInstance.ai.hand.forEach(() => {
                aiHandContainer.innerHTML += `<img src="images/card-back.png" alt="card-back">`;
            });

            // Render player hand
            playerHandContainer.innerHTML = '';

            const handCards = gameInstance.player.hand;
            const row1 = document.createElement('div');
            row1.classList.add('card-row');
            const row2 = document.createElement('div');
            row2.classList.add('card-row');

            handCards.forEach((card, index) => {
                const cardContainer = createPlayerCardElement(card, index, gameInstance.player.isStunned);

                // This logic creates the 2-card top row and 3-card bottom row
                if (index < 2) {
                    row1.appendChild(cardContainer);
                } else {
                    row2.appendChild(cardContainer);
                }
            });

            playerHandContainer.appendChild(row1);
            playerHandContainer.appendChild(row2);

            updateButtonStates();
        };

        const initialRender = () => {
             // Render non-hand UI elements first
            document.querySelector('.player-container .name').textContent = game.playerName;
            document.getElementById('ai-hp-text').textContent = game.ai.hp;
            document.getElementById('ai-hp-progress').value = game.ai.hp;
            document.getElementById('player-hp-text').textContent = game.player.hp;
            document.getElementById('player-hp-progress').value = game.player.hp;
            document.getElementById('ai-hp-progress').max = 30;
            document.getElementById('player-hp-progress').max = 30;
            
            const totalCards = 24;
            document.getElementById('ai-deck-count').textContent = totalCards;
            document.getElementById('player-deck-count').textContent = totalCards;

            // Then animate the cards
            dealInitialCards();
        }

        initialRender();
        playButton.addEventListener('click', handlePlayTurn);
        combineButton.addEventListener('click', handleCombineUndoClick);

        // --- PAUSE/RESTART & GAME OVER LOGIC ---
        const returnToMenuBtn = document.querySelector('#pauseModal a[href="index.html"]');
        if(returnToMenuBtn) {
            returnToMenuBtn.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent default link behavior
    
                if (game.turnCount > 0) {
                    // Save game state
                    const gameState = game.getGameState();
                    localStorage.setItem('gameState', JSON.stringify(gameState));
        
                    // Show 'Game Saved' modal
                    const savedModal = document.getElementById('gameSavedModal');
                    openModal(savedModal);
        
                    // Redirect after a delay
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 2000);
                } else {
                    // If no turns have been played, just go back to the menu without saving.
                    window.location.href = 'index.html';
                }
            });
        }

        const restartBtn = document.querySelector('#pauseModal button[style*="#FDFF6D"]');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                const restartModal = document.getElementById('restartModal');
                openModal(restartModal);
            });
        }

        const confirmRestartBtn = document.getElementById('confirmRestartBtn');
        if (confirmRestartBtn) {
            confirmRestartBtn.addEventListener('click', () => {
                location.reload();
            });
        }

        const playAgainBtns = document.querySelectorAll('#winModal button[style*="#6DFF74"], #loseModal button[style*="#6DFF74"]');
        playAgainBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                location.reload();
            });
        });

        const returnToMenuGameOverBtns = document.querySelectorAll('#winModal a, #loseModal a');
        returnToMenuGameOverBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                localStorage.removeItem('gameState'); // Game is over, no need to save
            });
        });
    }

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
        if (modal == null || modal.classList.contains('is-closing')) return;
        modal.classList.add('visible');
    }

    function closeModal(modal) {
        if (modal == null || !modal.classList.contains('visible')) return;
        
        modal.classList.add('is-closing');
        modal.classList.remove('visible');

        modal.addEventListener('transitionend', () => {
            modal.classList.remove('is-closing');
        }, { once: true });
    }

    // --- NAME & GAME START LOGIC ---
    const nameInput = document.getElementById('name');
    const startGameBtn = document.getElementById('startGameBtn');
    
    // Check for saved game on main menu load
    const savedGame = localStorage.getItem('gameState');
    if (savedGame && startGameBtn) {
        startGameBtn.textContent = 'Continue Playing';
    }

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
            if (!playerName) {
                openModal(document.getElementById('promptNameModal'));
                return;
            }
            
            localStorage.setItem('playerName', playerName);

            if (localStorage.getItem('gameState')) {
                openModal(document.getElementById('continueGameModal'));
            } else {
                window.location.href = 'gameplay.html';
            }
        });
    }

    const newGameBtn = document.getElementById('newGameBtn');
    if (newGameBtn) {
        newGameBtn.addEventListener('click', () => {
            localStorage.removeItem('gameState');
            window.location.href = 'gameplay.html';
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

    loadSettings();

    // --- HOW TO PLAY MODAL TABS ---
    const howToPlayModal = document.getElementById('howToPlayModal');
    if (howToPlayModal) {
        const tabButtons = howToPlayModal.querySelectorAll('.tab-button');
        const tabContents = howToPlayModal.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = document.querySelector(button.dataset.tabTarget);

                // Update button active state
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Update content active state
                tabContents.forEach(content => content.classList.remove('active'));
                targetTab.classList.add('active');
            });
        });

        const cardViewModal = document.getElementById('cardViewModal');
        if (cardViewModal) {
            const zoomedCardImg = document.getElementById('zoomed-card-img');
            const cardInfoItems = howToPlayModal.querySelectorAll('.card-info-item');
    
            cardInfoItems.forEach(item => {
                item.addEventListener('click', () => {
                    const imgSrc = item.querySelector('img').src;
                    zoomedCardImg.src = imgSrc;
                    openModal(cardViewModal);
                });
            });
        }
    }
}); 