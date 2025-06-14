// --- Card & Deck Definitions ---

const cardTypes = {
    BASE: 'base',
    POWER: 'power'
};

const baseCards = {
    ROCK: { name: 'Rock', type: cardTypes.BASE, damage: 4, image: 'images/rock.png', description: 'Deals 4 damage. Wins against Scissors.' },
    PAPER: { name: 'Paper', type: cardTypes.BASE, damage: 3, image: 'images/paper.png', description: 'Deals 3 damage. Wins against Rock.' },
    SCISSORS: { name: 'Scissors', type: cardTypes.BASE, damage: 5, image: 'images/scissors.png', description: 'Deals 5 damage. Wins against Paper.' }
};

const powerUps = {
    FIRE: { name: 'Fire', type: cardTypes.POWER, effect: 'damage', value: 2, image: 'images/fire.png', description: 'Adds +2 damage to your attack.' },
    WATER: { name: 'Water', type: cardTypes.POWER, effect: 'defense', value: 1, image: 'images/water.png', description: 'Reduces incoming damage by 1 and cancels opponent\'s Fire power-up.' },
    THUNDER: { name: 'Thunder', type: cardTypes.POWER, effect: 'stun', value: null, image: 'images/thunder.png', description: 'If you win the round, your opponent cannot use a Power-Up on their next turn.' }
};

const initialDeckConfig = [
    ...Array(5).fill(baseCards.ROCK),
    ...Array(5).fill(baseCards.PAPER),
    ...Array(5).fill(baseCards.SCISSORS),
    ...Array(3).fill(powerUps.FIRE),
    ...Array(3).fill(powerUps.WATER),
    ...Array(3).fill(powerUps.THUNDER)
];

// --- Game Class ---
class Game {
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

    _shuffle(deck) {
        // Fisher-Yates shuffle algorithm
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

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
    playTurn(playerMove) {
        this.turnCount++;
        const aiMove = this._selectMoveGBFS();
        
        if (playerMove.base) {
            this.playerHistory.push(playerMove.base.name);
        }
        
        this._moveCardToDiscard(this.player, playerMove.base);
        this._moveCardToDiscard(this.player, playerMove.power);
        this._moveCardToDiscard(this.ai, aiMove.base);
        this._moveCardToDiscard(this.ai, aiMove.power);

        const result = this._resolveRound(playerMove, aiMove);
        this._applyRoundResult(result, playerMove, aiMove);

        if (this.player.hp <= 0 || this.ai.hp <= 0) {
            this.isGameOver = true;
        }
        
        return { playerMove, aiMove, result };
    }

    _moveCardToDiscard(target, card) {
        if (!card) return;
        const index = target.hand.indexOf(card);
        if (index > -1) {
            target.hand.splice(index, 1);
            target.discard.push(card);
        }
    }

    drawForEndOfTurn() {
        this.player.reshuffled = false;
        this.player.reshuffleReason = null;
        this.ai.reshuffled = false;
        this.ai.reshuffleReason = null;

        const playerDrawAmount = 5 - this.player.hand.length;
        for (let i = 0; i < playerDrawAmount; i++) {
            const needsGuaranteedBase = !this.player.hand.some(c => c.type === cardTypes.BASE) && this.player.hand.length === 4;
            this._drawCard(this.player, needsGuaranteedBase);
        }
        
        const aiDrawAmount = 5 - this.ai.hand.length;
        for (let i = 0; i < aiDrawAmount; i++) {
            const needsGuaranteedBase = !this.ai.hand.some(c => c.type === cardTypes.BASE) && this.ai.hand.length === 4;
            this._drawCard(this.ai, needsGuaranteedBase);
        }

        this._ensurePlayableHand(this.player);
        this._ensurePlayableHand(this.ai);

        return {
            playerReshuffled: this.player.reshuffled,
            aiReshuffled: this.ai.reshuffled,
            playerReason: this.player.reshuffleReason,
            aiReason: this.ai.reshuffleReason
        };
    }

    _resolveRound(playerMove, aiMove) {
        const pBase = playerMove.base.name;
        const aBase = aiMove.base.name;
        const pPower = playerMove.power?.name;
        const aPower = aiMove.power?.name;

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

        if (winner === 'player') {
            playerDamage = playerMove.base.damage;
            if (pPower === 'Fire' && aPower !== 'Water') playerDamage += powerUps.FIRE.value;
        } else if (winner === 'ai') {
            aiDamage = aiMove.base.damage;
            if (aPower === 'Fire' && pPower !== 'Water') aiDamage += powerUps.FIRE.value;
        }

        if (aPower === 'Water') playerDamage = Math.max(0, playerDamage - powerUps.WATER.value);
        if (pPower === 'Water') aiDamage = Math.max(0, aiDamage - powerUps.WATER.value);

        return { winner, playerDamage, aiDamage };
    }

    _applyRoundResult(result, playerMove, aiMove) {
        this.player.hp -= result.aiDamage;
        this.ai.hp -= result.playerDamage;

        if (this.player.hp < 0) this.player.hp = 0;
        if (this.ai.hp < 0) this.ai.hp = 0;

        this.player.isStunned = (result.winner === 'ai' && aiMove.power?.name === 'Thunder');
        this.ai.isStunned = (result.winner === 'player' && playerMove.power?.name === 'Thunder');
    }

    _ensurePlayableHand(target) {
        const hasBaseCard = target.hand.some(card => card.type === cardTypes.BASE);
        if (hasBaseCard) return;

        const canDrawBase = target.deck.some(c => c.type === 'base') || target.discard.some(c => c.type === 'base');
        if (!canDrawBase) return;

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
    _selectMoveGBFS() {
        const counts = this.playerHistory.reduce((acc, move) => {
            acc[move] = (acc[move] || 0) + 1;
            return acc;
        }, { Rock: 0, Paper: 0, Scissors: 0 });

        let predictedMoveName = 'Rock';
        if (this.playerHistory.length > 0) {
            predictedMoveName = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
        }
        const predictedCard = Object.values(baseCards).find(c => c.name === predictedMoveName);

        let bestMove = { move: null, score: -Infinity };
        const aiBaseCards = this.ai.hand.filter(c => c.type === cardTypes.BASE);
        const aiPowerUps = this.ai.hand.filter(c => c.type === cardTypes.POWER);
        
        if (aiBaseCards.length === 0) {
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
        
        return bestMove.move;
    }

    _heuristic(state, predicted, hpAI, hpPlayer) {
        let baseDmg = state.base.damage;
        let bonus = 0;
        
        if (state.power?.name === 'Fire') bonus += 2;
        if (state.power?.name === 'Water') baseDmg -= 1;

        const winProb = this._winProb(state.base, predicted);
        const expectedDmg = (baseDmg + bonus) * winProb;
        
        const stunUtility = (state.power?.name === 'Thunder' && hpPlayer > hpAI) ? 3 : 0;
        
        return expectedDmg + stunUtility;
    }

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