// --- Card & Deck Definitions ---

// Defines the types of cards available in the game.
const cardTypes = {
    BASE: 'base',
    POWER: 'power'
};

// Defines the properties of the base cards (Rock, Paper, Scissors).
const baseCards = {
    ROCK: { name: 'Rock', type: cardTypes.BASE, damage: 4, image: '../assets/images/rock.png', description: 'Deals 4 damage. Wins against Scissors.' },
    PAPER: { name: 'Paper', type: cardTypes.BASE, damage: 3, image: '../assets/images/paper.png', description: 'Deals 3 damage. Wins against Rock.' },
    SCISSORS: { name: 'Scissors', type: cardTypes.BASE, damage: 5, image: '../assets/images/scissors.png', description: 'Deals 5 damage. Wins against Paper.' }
};

// Defines the properties of the power-up cards.
const powerUps = {
    FIRE: { name: 'Fire', type: cardTypes.POWER, effect: 'damage', value: 2, image: '../assets/images/fire.png', description: 'Adds +2 damage to your attack.' },
    WATER: { name: 'Water', type: cardTypes.POWER, effect: 'defense', value: 1, image: '../assets/images/water.png', description: 'Reduces incoming damage by 1 and cancels opponent\'s Fire power-up.' },
    THUNDER: { name: 'Thunder', type: cardTypes.POWER, effect: 'stun', value: null, image: '../assets/images/thunder.png', description: 'If you win the round, your opponent cannot use a Power-Up on their next turn.' }
};

// Creates the initial deck configuration with a set number of each card.
const initialDeckConfig = [
    ...Array(5).fill(baseCards.ROCK),
    ...Array(5).fill(baseCards.PAPER),
    ...Array(5).fill(baseCards.SCISSORS),
    ...Array(3).fill(powerUps.FIRE),
    ...Array(3).fill(powerUps.WATER),
    ...Array(3).fill(powerUps.THUNDER)
];

// --- Game Class ---
// Manages the entire game state and logic.
class Game {
    /**
     * Initializes a new game or loads from a saved state.
     * @param {string} playerName - The name of the player.
     * @param {object | null} savedState - The saved game state to load, if any.
     */
    constructor(playerName, savedState = null) {
        if (savedState) {
            // Load game from saved state
            this.playerName = savedState.playerName;
            this.player = savedState.player;
            this.ai = savedState.ai;
            this.playerHistory = savedState.playerHistory;
            this.isGameOver = savedState.isGameOver;
            this.turnCount = savedState.turnCount || 0;
        } else {
            // Setup a new game
            this.playerName = playerName;
            this.player = {
                hp: 30,
                deck: [],
                hand: [],
                discard: [],
                isStunned: false,
                reshuffleReason: null
            };
            this.ai = {
                hp: 30,
                deck: [],
                hand: [],
                discard: [],
                isStunned: false,
                reshuffleReason: null
            };
            this.playerHistory = [];
            this.isGameOver = false;
            this.turnCount = 0;
    
            this._setupGame();
        }
    }

    /**
     * Returns the current state of the game for saving.
     * @returns {object} The game state.
     */
    getGameState() {
        return {
            playerName: this.playerName,
            player: this.player,
            ai: this.ai,
            playerHistory: this.playerHistory,
            isGameOver: this.isGameOver,
            turnCount: this.turnCount
        };
    }

    /**
     * Sets up the initial game state, including decks and hands.
     * @private
     */
    _setupGame() {
        // Setup decks
        this.player.deck = this._shuffle([...initialDeckConfig]);
        this.ai.deck = this._shuffle([...initialDeckConfig]);

        // Draw initial hands
        for (let i = 0; i < 5; i++) {
            this._drawCard(this.player);
            this._drawCard(this.ai);
        }

        // Ensure opening hands are playable
        this._ensurePlayableHand(this.player);
        this._ensurePlayableHand(this.ai);
    }

    /**
     * Shuffles a deck using the Fisher-Yates algorithm.
     * @param {Array} deck - The deck to be shuffled.
     * @returns {Array} The shuffled deck.
     * @private
     */
    _shuffle(deck) {
        // Fisher-Yates shuffle algorithm
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    /**
     * Draws a card from a target's deck to their hand.
     * @param {object} target - The player or AI to draw a card.
     * @param {boolean} forceBase - If true, ensures a base card is drawn if possible.
     * @returns {object | null} The drawn card or null if no card could be drawn.
     * @private
     */
    _drawCard(target, forceBase = false) {
        if (target.deck.length === 0) {
            if (target.discard.length === 0) return null; // Nothing to draw or reshuffle
            
            target.deck = this._shuffle(target.discard);
            target.discard = [];
            target.reshuffled = true;
            target.reshuffleReason = 'Deck Empty';
        }

        if (forceBase) {
            let baseCardIndex = target.deck.findIndex(c => c.type === cardTypes.BASE);
            if (baseCardIndex !== -1) {
                const card = target.deck.splice(baseCardIndex, 1)[0];
                target.hand.push(card);
                return card;
            } else if (target.discard.some(c => c.type === cardTypes.BASE)) {
                // If a base card exists in the discard pile, reshuffle everything to get it
                target.deck.push(...target.discard);
                target.discard = [];
                target.deck = this._shuffle(target.deck);
                target.reshuffled = true;
                target.reshuffleReason = 'Unplayable Hand'; // A reshuffle was forced to find a base card

                baseCardIndex = target.deck.findIndex(c => c.type === cardTypes.BASE);
                if (baseCardIndex !== -1) {
                    const card = target.deck.splice(baseCardIndex, 1)[0];
                    target.hand.push(card);
                    return card;
                }
            }
        }

        // Default draw if not forcing, or if force failed (no base cards left)
        const card = target.deck.pop();
        if (card) {
            target.hand.push(card);
        }
        return card;
    }

    // --- GAMEPLAY & TURN LOGIC ---
    /**
     * Executes a single turn of the game.
     * @param {object} playerMove - The player's chosen move {base, power}.
     * @returns {object} Data about the turn, including moves and results.
     */
    playTurn(playerMove) {
        this.turnCount++;
        const aiMove = this._selectMoveGBFS();
        
        // Record player's move for AI prediction
        if (playerMove.base) {
            this.playerHistory.push(playerMove.base.name);
        }
        
        // Move played cards from hand to discard pile
        this._moveCardToDiscard(this.player, playerMove.base);
        this._moveCardToDiscard(this.player, playerMove.power);
        this._moveCardToDiscard(this.ai, aiMove.base);
        this._moveCardToDiscard(this.ai, aiMove.power);

        // Determine and apply the outcome of the round
        const result = this._resolveRound(playerMove, aiMove);
        this._applyRoundResult(result, playerMove, aiMove);

        // Check for game over condition
        if (this.player.hp <= 0 || this.ai.hp <= 0) {
            this.isGameOver = true;
        }
        
        return { playerMove, aiMove, result };
    }

    /**
     * Moves a card from a target's hand to their discard pile.
     * @param {object} target - The player or AI.
     * @param {object} card - The card to move.
     * @private
     */
    _moveCardToDiscard(target, card) {
        if (!card) return;
        const index = target.hand.indexOf(card);
        if (index > -1) {
            target.hand.splice(index, 1);
            target.discard.push(card);
        }
    }

    /**
     * Draws cards for both player and AI to replenish their hands to 5.
     * @returns {object} Information about any reshuffles that occurred.
     */
    drawForEndOfTurn() {
        this.player.reshuffled = false;
        this.player.reshuffleReason = null;
        this.ai.reshuffled = false;
        this.ai.reshuffleReason = null;

        // Draw cards for the player
        const playerDrawAmount = 5 - this.player.hand.length;
        for (let i = 0; i < playerDrawAmount; i++) {
            const needsGuaranteedBase = !this.player.hand.some(c => c.type === cardTypes.BASE) && this.player.hand.length === 4;
            this._drawCard(this.player, needsGuaranteedBase);
        }
        
        // Draw cards for the AI
        const aiDrawAmount = 5 - this.ai.hand.length;
        for (let i = 0; i < aiDrawAmount; i++) {
            const needsGuaranteedBase = !this.ai.hand.some(c => c.type === cardTypes.BASE) && this.ai.hand.length === 4;
            this._drawCard(this.ai, needsGuaranteedBase);
        }

        // Ensure both hands are playable after drawing
        this._ensurePlayableHand(this.player);
        this._ensurePlayableHand(this.ai);

        return {
            playerReshuffled: this.player.reshuffled,
            aiReshuffled: this.ai.reshuffled,
            playerReason: this.player.reshuffleReason,
            aiReason: this.ai.reshuffleReason
        };
    }

    /**
     * Resolves the round to determine the winner and calculate damage.
     * @param {object} playerMove - The player's move.
     * @param {object} aiMove - The AI's move.
     * @returns {object} The result of the round {winner, playerDamage, aiDamage}.
     * @private
     */
    _resolveRound(playerMove, aiMove) {
        const pBase = playerMove.base.name;
        const aBase = aiMove.base.name;
        const pPower = playerMove.power?.name;
        const aPower = aiMove.power?.name;

        // Determine winner based on Rock-Paper-Scissors logic
        let winner = null;
        if ( (pBase === 'Rock' && aBase === 'Scissors') ||
             (pBase === 'Scissors' && aBase === 'Paper') ||
             (pBase === 'Paper' && aBase === 'Rock') ) {
            winner = 'player';
        } else if (pBase === aBase) {
            winner = 'tie';
        } else {
            winner = 'ai';
        }

        let playerDamage = 0;
        let aiDamage = 0;

        // Calculate base and power-up damage
        if (winner === 'player') {
            playerDamage = playerMove.base.damage;
            if (pPower === 'Fire' && aPower !== 'Water') playerDamage += powerUps.FIRE.value;
        } else if (winner === 'ai') {
            aiDamage = aiMove.base.damage;
            if (aPower === 'Fire' && pPower !== 'Water') aiDamage += powerUps.FIRE.value;
        }

        // Apply water power-up defense
        if (aPower === 'Water') playerDamage = Math.max(0, playerDamage - powerUps.WATER.value);
        if (pPower === 'Water') aiDamage = Math.max(0, aiDamage - powerUps.WATER.value);

        return { winner, playerDamage, aiDamage };
    }

    /**
     * Applies the result of the round to player and AI stats.
     * @param {object} result - The result object from _resolveRound.
     * @param {object} playerMove - The player's move.
     * @param {object} aiMove - The AI's move.
     * @private
     */
    _applyRoundResult(result, playerMove, aiMove) {
        this.player.hp -= result.aiDamage;
        this.ai.hp -= result.playerDamage;

        // Ensure HP doesn't go below zero
        if (this.player.hp < 0) this.player.hp = 0;
        if (this.ai.hp < 0) this.ai.hp = 0;

        // Apply stun effect from Thunder power-up
        this.player.isStunned = (result.winner === 'ai' && aiMove.power?.name === 'Thunder');
        this.ai.isStunned = (result.winner === 'player' && playerMove.power?.name === 'Thunder');
    }

    /**
     * Ensures a target has at least one base card in hand, reshuffling if necessary.
     * @param {object} target - The player or AI.
     * @private
     */
    _ensurePlayableHand(target) {
        const hasBaseCard = target.hand.some(card => card.type === cardTypes.BASE);
        if (hasBaseCard) return;

        // Check if a base card exists in the deck or discard to be drawn
        const canDrawBase = target.deck.some(c => c.type === 'base') || target.discard.some(c => c.type === 'base');
        if (!canDrawBase) return;

        // Collect all cards, reshuffle, and draw a new hand
        target.discard.push(...target.hand);
        target.hand = [];
        target.discard.push(...target.deck);
        target.deck = [];
        
        target.deck = this._shuffle(target.discard);
        target.discard = [];
        target.reshuffled = true;
        target.reshuffleReason = 'Unplayable Hand';

        for (let i = 0; i < 5; i++) {
            this._drawCard(target);
        }
    }

    // --- GBFS AI IMPLEMENTATION ---
    /**
     * Selects the AI's move using a Greedy Best-First Search algorithm.
     * @returns {object} The selected move {base, power}.
     * @private
     */
    _selectMoveGBFS() {
        // 1. Predict player's next move based on frequency of past moves.
        const counts = this.playerHistory.reduce((acc, move) => {
            acc[move] = (acc[move] || 0) + 1;
            return acc;
        }, { Rock: 0, Paper: 0, Scissors: 0 });

        let predictedMoveName = 'Rock';
        if (this.playerHistory.length > 0) {
            predictedMoveName = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
        }
        const predictedCard = Object.values(baseCards).find(c => c.name === predictedMoveName);

        // 2. Evaluate all possible moves using a heuristic.
        let bestMove = { move: null, score: -Infinity };
        const aiBaseCards = this.ai.hand.filter(c => c.type === cardTypes.BASE);
        const aiPowerUps = this.ai.hand.filter(c => c.type === cardTypes.POWER);
        
        if (aiBaseCards.length === 0) {
            // Failsafe if AI has no base cards (should not happen with _ensurePlayableHand).
            return { base: this.ai.hand[0], power: null };
        }
        
        for (const base of aiBaseCards) {
            const possiblePowers = [null, ...aiPowerUps];
            for (const power of possiblePowers) {
                if (this.ai.isStunned && power) continue;
                
                const state = { base, power };
                const h = this._heuristic(state, predictedCard, this.ai.hp, this.player.hp);
                if (h > bestMove.score) {
                    bestMove = { move: state, score: h };
                }
            }
        }
        
        // 3. Greedily select the move with the highest score.
        return bestMove.move;
    }

    /**
     * Heuristic function to score a potential move.
     * @param {object} state - The AI's potential move {base, power}.
     * @param {object} predicted - The player's predicted base card.
     * @param {number} hpAI - Current HP of the AI.
     * @param {number} hpPlayer - Current HP of the player.
     * @returns {number} The heuristic score for the move.
     * @private
     */
    _heuristic(state, predicted, hpAI, hpPlayer) {
        let baseDmg = state.base.damage;
        let bonus = 0;
        
        // Calculate potential damage output
        if (state.power?.name === 'Fire') bonus += 2;
        if (state.power?.name === 'Water') baseDmg -= 1;

        const winProb = this._winProb(state.base, predicted);
        const expectedDmg = (baseDmg + bonus) * winProb;
        
        // Add utility for using Thunder when behind in HP
        const stunUtility = (state.power?.name === 'Thunder' && hpPlayer > hpAI) ? 3 : 0;
        
        return expectedDmg + stunUtility;
    }

    /**
     * Calculates the probability of winning against the predicted card.
     * @param {object} aiCard - The AI's base card.
     * @param {object} predictedCard - The player's predicted base card.
     * @returns {number} 1 for a win, 0.5 for a tie, 0 for a loss.
     * @private
     */
    _winProb(aiCard, predictedCard) {
        const ai = aiCard.name;
        const pred = predictedCard.name;
        if ( (ai === 'Rock' && pred === 'Scissors') ||
             (ai === 'Scissors' && pred === 'Paper') ||
             (ai === 'Paper' && pred === 'Rock') ) {
            return 1;
        } else if (ai === pred) {
            return 0.5;
        } else {
            return 0;
        }
    }
} 