let playerChips = [1000, 1000, 1000]; // Chips for 3 players
let communityCards = [];

// Placeholder cards
const cardDeck = [
    'A♠', '2♠', '3♠', '4♠', '5♠', '6♠', '7♠', '8♠', '9♠', '10♠', 'J♠', 'Q♠', 'K♠',
    'A♦', '2♦', '3♦', '4♦', '5♦', '6♦', '7♦', '8♦', '9♦', '10♦', 'J♦', 'Q♦', 'K♦',
    'A♣', '2♣', '3♣', '4♣', '5♣', '6♣', '7♣', '8♣', '9♣', '10♣', 'J♣', 'Q♣', 'K♣',
    'A♥', '2♥', '3♥', '4♥', '5♥', '6♥', '7♥', '8♥', '9♥', '10♥', 'J♥', 'Q♥', 'K♥'
];

// Shuffle the deck
function shuffleDeck() {
    return cardDeck.sort(() => Math.random() - 0.5);
}

// Deal cards to players and community
function dealCards() {
    const shuffledDeck = shuffleDeck();
    const playerCards = [
        shuffledDeck.splice(0, 2), // Player 1 cards
        shuffledDeck.splice(0, 2), // Player 2 cards
        shuffledDeck.splice(0, 2)  // Player 3 cards
    ];
    communityCards = shuffledDeck.splice(0, 5); // 5 community cards

    // Display community cards
    let communityDiv = document.getElementById("community-cards");
    communityCards.forEach(card => {
        let cardElement = document.createElement('img');
        cardElement.src = `assets/cards/${card}.png`;
        cardElement.alt = card;
        communityDiv.appendChild(cardElement);
    });

    // Display each player's cards
    playerCards.forEach((cards, index) => {
        let playerDiv = document.getElementById(`player${index + 1}`);
        cards.forEach(card => {
            let cardElement = document.createElement('img');
            cardElement.src = `assets/cards/${card}.png`;
            cardElement.alt = card;
            playerDiv.appendChild(cardElement);
        });
    });
}

// Handle bet action
function bet() {
    let betAmount = 50;
    console.log(`Bet placed: ${betAmount}`);
}

// Handle fold action
function fold() {
    console.log("Player folded");
}

// Start the game
window.onload = () => {
    dealCards();
};
