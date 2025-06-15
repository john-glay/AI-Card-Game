# Bato Bato Pick: A Strategic AI Card Game

Welcome to "Bato Bato Pick," a dynamic card game developed as a school project. This game reimagines the classic Rock-Paper-Scissors by introducing strategic layers of deck management and power-up combinations. At its core, this project demonstrates the implementation of a **Greedy Best-First Search (GBFS)** algorithm, which powers a challenging and intelligent AI opponent. Your goal is to outsmart the AI, manage your health, and become the ultimate Bato Bato Pick champion.

## Features

- Classic Rock-Paper-Scissors gameplay with a strategic twist.
- A unique deck of Base Cards and special Power-Up cards.
- A challenging AI opponent powered by the GBFS algorithm.
- An engaging and responsive user interface with animations and sound effects.
- Game state persistence, allowing you to save and continue your game.
- User-friendly settings including Dark Mode and volume controls.

## How to Play

The objective is simple: reduce your opponent's Health Points (HP) from 30 to zero. You'll use a custom deck of cards to launch attacks and defend against the AI.

#### Game Setup
- Both you and the AI start with 30 HP.
- Your deck contains 24 cards: 5 each of Rock, Paper, and Scissors, and 3 each of Fire, Water, and Thunder power-ups.
- The game begins with each player drawing a hand of 5 cards.

#### Turn Phases
1.  **Select Cards:** Choose one **Base Card** (Rock, Paper, or Scissors) and, optionally, one **Power-Up** from your hand.
2.  **Reveal & Resolve:** Both players' cards are revealed. The round's winner is decided by the classic Rock-Paper-Scissors rules. The winner deals damage, modified by any power-ups in play.
3.  **Draw:** Draw cards to replenish your hand back to 5.
4.  The battle continues until one player's HP drops to zero.

## The Cards
Your strategy revolves around how you use your cards. Each card has a specific role, and combining them effectively is the key to victory.

| Card      | Type      | Effect                                                                       |
| :-------- | :-------- | :--------------------------------------------------------------------------- |
| **Rock**  | Base      | Deals 4 damage. Wins against Scissors.                                       |
| **Paper** | Base      | Deals 3 damage. Wins against Rock.                                           |
| **Scissors**| Base    | Deals 5 damage. Wins against Paper.                                          |
| **Fire**  | Power-Up  | Adds +2 damage to your attack.                                               |
| **Water** | Power-Up  | Reduces incoming damage by 1. Cancels an opponent's Fire power-up.            |
| **Thunder**| Power-Up | If you win the round, the opponent cannot use a Power-Up on their next turn. |

## The AI: Powered by Greedy Best-First Search (GBFS)

The AI opponent isn't just making random choices. It uses a **Greedy Best-First Search (GBFS)** algorithm to think strategically. Here's a simplified look at its "thought process" each turn:

1.  **Predict Your Move:** The AI looks at your past plays. If you've been using Rock a lot, it will predict you'll use Rock again. This simple learning makes it adapt to your playstyle.
2.  **Consider All Options:** The AI generates a list of every possible move it can make with the cards in its hand (e.g., Rock alone, Rock with Fire, Paper alone, etc.).
3.  **Score Each Option:** This is where the "heuristic" comes in. The AI assigns a score to each possible move based on how good it is. The score is calculated based on:
    *   **Winning Probability:** How likely is the move to beat your predicted card?
    *   **Potential Damage:** How much damage will it do if it wins?
    *   **Strategic Utility:** Is it a good time to use a special power-up? For example, using Thunder is more valuable when the AI has less health than you.
4.  **Make the Smartest Choice:** The AI greedily selects the move with the highest score and plays it. This efficient, single-minded approach makes the AI a formidable opponent that responds instantly.

This implementation provides a clear and effective demonstration of how a search algorithm can be used to create intelligent behavior in a game.

<details>
<summary>GBFS Pseudocode</summary>

```
# Inputs -------------------------------------------------------------
# handAI    	: list of cards and power-ups currently held by the AI
# playerHistory : list of the opponent's past base cards (Rock, Paper, Scissors)
# stunBlocked   : boolean – TRUE if Thunder prevented player power-ups this turn
# hpAI, hpPlayer: current health points (for tie-breaking urgency)

function SELECT_MOVE_GBFS(handAI, playerHistory, stunBlocked, hpAI, hpPlayer):
	# 1. Predict the opponent's next base card -----------------------
	counts = frequencyCount(playerHistory)        	# e.g., {Rock:7, Paper:5, Scissors:8}
	predicted = argMax(counts)                    	# most frequent card so far
                                                 	# simple but effective heuristic
    
	# 2. Generate all legal successor moves --------------------------
	frontier = PriorityQueue(maxFirst=True)       	# Greedy queue
	for baseCard in handAI.baseCards:             	# Rock / Paper / Scissors
    	for power in (handAI.powerUps ∪ {None}):
        	if stunBlocked and power is not None:	 
            	continue                          	# opponent stunned, AI can still play power-ups
        	state = { "base": baseCard, "power": power }
        	h = HEURISTIC(state, predicted, hpAI, hpPlayer)
        	frontier.push(state, priority=h)
    
	# 3. Select the move with the highest heuristic ------------------
	bestMove = frontier.pop()                     	# Greedy choice
	return bestMove


# Heuristic function --------------------------------------------------
function HEURISTIC(state, predicted, hpAI, hpPlayer):
	# Immediate damage if AI wins
	dmgTable = {Rock:4, Paper:3, Scissors:5}
	baseDmg   = dmgTable[state.base]
	bonus 	= 0
    
	if state.power == Fire: 	bonus += 2
	if state.power == Thunder:  bonus += 0       	# Thunder adds stun, handled in utility
	if state.power == Water:	baseDmg -= 1     	# Water reduces own damage by 1
    
	expectedWin = WIN_PROB(state.base, predicted)	# 1 if beats predicted card, 0 if loses, 0.5 if tie
	expectedDmg = (baseDmg + bonus) * expectedWin
    
	# Extra utility: prefer stun when losing in HP race
	stunUtility = 3 if (state.power == Thunder and hpPlayer > hpAI) else 0
    
	return expectedDmg + stunUtility             	# Greedy score


# Helper --------------------------------------------------------------
function WIN_PROB(aiCard, predictedCard):
	if aiCard beats predictedCard   : return 1
	if predictedCard beats aiCard   : return 0
	else                        	: return 0.5
```
</details>

## Technologies Used
*   **Frontend:** HTML5, CSS3, JavaScript (ES6)
*   No backend frameworks are used; the entire game logic, including the AI, runs client-side in your browser.

## How to Launch
1.  Clone this repository to your local machine.
2.  Open the `index.html` file in your preferred web browser.
3.  Enter your name and start playing!

## Music and Sound

The background music used in this game, "Child's Nightmare," was composed by Patrick de Arteaga. The track is licensed under an international Creative Commons Attribution 4.0 license, allowing for free use with appropriate credit.

**Reference:**

de Arteaga, P. (n.d.). *Child's Nightmare* [Audio file]. Patrick de Arteaga. Retrieved June 15, 2025, from https://patrickdearteaga.com/audio/Child's%20Nightmare.ogg 