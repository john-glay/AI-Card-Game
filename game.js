// --- Card & Deck Definitions ---

const cardTypes = {
    BASE: 'base',
    POWER: 'power'
};

const baseCards = {
    ROCK: { name: 'Rock', type: cardTypes.BASE, damage: 4, image: 'images/rock.png' },
    PAPER: { name: 'Paper', type: cardTypes.BASE, damage: 3, image: 'images/paper.png' },
    SCISSORS: { name: 'Scissors', type: cardTypes.BASE, damage: 5, image: 'images/scissors.png' }
};

const powerUps = {
    FIRE: { name: 'Fire', type: cardTypes.POWER, effect: 'damage', value: 2, image: 'images/fire.png' },
    WATER: { name: 'Water', type: cardTypes.POWER, effect: 'defense', value: 1, image: 'images/water.png' },
    THUNDER: { name: 'Thunder', type: cardTypes.POWER, effect: 'stun', value: null, image: 'images/thunder.png' }
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
    constructor(playerName) {
        this.playerName = playerName;
        this.player = {
            hp: 30,
            deck: [],
            hand: [],
            discard: [],
            isStunned: false,
            reshuffleReason: null,
            selectedCard: { base: null, power: null }
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

        this._setupGame();
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

        if (target.deck.length > 0) {
            let card;
            if (forceBase) {
                const baseCardIndex = target.deck.findIndex(c => c.type === cardTypes.BASE);
                if (baseCardIndex !== -1) {
                    card = target.deck.splice(baseCardIndex, 1)[0];
                } else {
                     card = target.deck.pop(); // No base card available, draw normally
                }
            } else {
                 card = target.deck.pop();
            }
            target.hand.push(card);
            return card;
        }
        return null;
    }

    // --- GAMEPLAY & TURN LOGIC ---
    playTurn(playerMove) {
        const aiMove = this._selectMoveGBFS();
        
        this.playerHistory.push(playerMove.base.name);
        
        // Move played cards to discard pile
        this.player.discard.push(playerMove.base);
        if(playerMove.power) this.player.discard.push(playerMove.power);
        this.ai.discard.push(aiMove.base);
        if(aiMove.power) this.ai.discard.push(aiMove.power);

        this._removeCardFromHand(this.player.hand, playerMove.base);
        this._removeCardFromHand(this.player.hand, playerMove.power);
        this._removeCardFromHand(this.ai.hand, aiMove.base);
        this._removeCardFromHand(this.ai.hand, aiMove.power);

        const result = this._resolveRound(playerMove, aiMove);
        this._applyRoundResult(result);

        if (this.player.hp <= 0 || this.ai.hp <= 0) {
            this.isGameOver = true;
        }
        
        return { playerMove, aiMove, result };
    }

    drawForEndOfTurn() {
        this.player.reshuffled = false;
        this.player.reshuffleReason = null;
        this.ai.reshuffled = false;
        this.ai.reshuffleReason = null;

        this._replenishHand(this.player);
        this._replenishHand(this.ai);

        return {
            playerReshuffled: this.player.reshuffled,
            aiReshuffled: this.ai.reshuffled,
            playerReason: this.player.reshuffleReason,
            aiReason: this.ai.reshuffleReason
        };
    }

    _replenishHand(target) {
        // Draw until hand has 5 cards, with smart drawing for the last card
        while(target.hand.length < 5 && (target.deck.length > 0 || target.discard.length > 0)) {
            const isStuckWithPowerUps = target.hand.length === 4 && target.hand.every(c => c.type === 'power');
            this._drawCard(target, isStuckWithPowerUps);
        }

        // After drawing, check for an unplayable hand (no base cards) as a last resort.
        const hasBaseCard = target.hand.some(card => card.type === cardTypes.BASE);
        const canEverDrawBaseCard = hasBaseCard || target.deck.some(c => c.type === 'base') || target.discard.some(c => c.type === 'base');

        if (!hasBaseCard && canEverDrawBaseCard) {
            this._performMulligan(target);
        }
    }

    _performMulligan(target) {
        // Move all cards from hand and deck back to discard
        target.discard.push(...target.hand);
        target.hand = [];
        target.discard.push(...target.deck);
        target.deck = [];
        
        // Reshuffle discard pile into a new deck
        target.deck = this._shuffle(target.discard);
        target.discard = [];
        target.reshuffled = true;
        target.reshuffleReason = 'Unplayable Hand';

        // Draw a fresh hand of 5
        this._replenishHand(target);
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
            if (pPower === 'Fire' && aPower !== 'Water') playerDamage += 2;
            if (pPower === 'Water') playerDamage = Math.max(0, playerDamage - 1);
        } else if (winner === 'ai') {
            aiDamage = aiMove.base.damage;
            if (aPower === 'Fire' && pPower !== 'Water') aiDamage += 2;
            if (aPower === 'Water') aiDamage = Math.max(0, aiDamage - 1);
        }

        // Apply opponent's water power-up damage reduction
        if (aPower === 'Water') playerDamage = Math.max(0, playerDamage - 1);
        if (pPower === 'Water') aiDamage = Math.max(0, aiDamage - 1);

        // Stun logic
        this.player.isStunned = (winner === 'ai' && aPower === 'Thunder');
        this.ai.isStunned = (winner === 'player' && pPower === 'Thunder');

        const damageDealt = winner === 'player' ? playerDamage : aiDamage;
        return { winner, damageDealt };
    }

    _applyRoundResult(result) {
        if (result.winner === 'player') {
            this.ai.hp -= result.damageDealt;
        } else if (result.winner === 'ai') {
            this.player.hp -= result.damageDealt;
        }
        if (this.ai.hp < 0) this.ai.hp = 0;
        if (this.player.hp < 0) this.player.hp = 0;
    }

    _removeCardFromHand(hand, cardToRemove) {
        if (!cardToRemove) return;
        const cardIndex = hand.indexOf(cardToRemove);
        if (cardIndex > -1) {
            hand.splice(cardIndex, 1);
        }
    }

    _ensurePlayableHand(target) {
        const hasBaseCard = target.hand.some(card => card.type === cardTypes.BASE);
        if (hasBaseCard) return;

        // Find a base card in the deck
        const baseCardInDeckIndex = target.deck.findIndex(card => card.type === cardTypes.BASE);
        if (baseCardInDeckIndex === -1) {
            // This is an extreme edge case (no base cards in the first 10 cards)
            // Perform a full mulligan
            this._performMulligan(target);
            return;
        };

        // Find a power-up in hand to swap
        const powerUpInHandIndex = target.hand.findIndex(card => card.type === cardTypes.POWER);
        
        // This should always find one, since the hand has no base cards
        if (powerUpInHandIndex !== -1) {
            // Swap the cards
            const powerUpCard = target.hand[powerUpInHandIndex];
            const baseCard = target.deck[baseCardInDeckIndex];
            
            target.hand[powerUpInHandIndex] = baseCard;
            target.deck[baseCardInDeckIndex] = powerUpCard;

            // Shuffle the deck to maintain randomness
            this._shuffle(target.deck);
        }
    }

    // --- GBFS AI IMPLEMENTATION ---
    _selectMoveGBFS() {
        // 1. Predict opponent's next base card
        const counts = this.playerHistory.reduce((acc, move) => {
            acc[move] = (acc[move] || 0) + 1;
            return acc;
        }, { Rock: 0, Paper: 0, Scissors: 0 });

        let predicted = 'Rock'; // Default prediction
        if (this.playerHistory.length > 0) {
            predicted = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
        }
        
        const predictedCard = Object.values(baseCards).find(c => c.name === predicted);

        // 2. Generate all legal successor moves and evaluate with heuristic
        let bestMove = { move: null, score: -Infinity };
        const aiBaseCards = this.ai.hand.filter(c => c.type === 'base');
        const aiPowerUps = this.ai.hand.filter(c => c.type === 'power');
        
        for (const base of aiBaseCards) {
            const possiblePowers = [null, ...aiPowerUps];
            for (const power of possiblePowers) {
                // Skip if AI is stunned and tries to use a power-up
                if (this.ai.isStunned && power) continue;
                
                const state = { base, power };
                const h = this._heuristic(state, predictedCard);
                if (h > bestMove.score) {
                    bestMove = { move: state, score: h };
                }
            }
        }
        
        return bestMove.move;
    }

    _heuristic(state, predicted) {
        let baseDmg = state.base.damage;
        let bonus = 0;
        
        if (state.power?.name === 'Fire') bonus += 2;
        if (state.power?.name === 'Water') baseDmg = Math.max(0, baseDmg - 1);

        const winProb = this._winProb(state.base, predicted);
        const expectedDmg = (baseDmg + bonus) * winProb;
        
        const stunUtility = (state.power?.name === 'Thunder' && this.player.hp > this.ai.hp) ? 3 : 0;
        
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