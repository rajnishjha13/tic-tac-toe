let currentPlayer = 'X';
let gameBoard = ['', '', '', '', '', '', '', '', ''];
let gameActive = false;
let gameMode = null;
let difficulty = 'easy';
let theme = 'light';

// Game statistics for showcase
let gameStats = {
    aiWins: 0,
    playerWins: 0,
    draws: 0,
    totalMoves: 0,
    averageDepth: 0
};

// Memoization cache for minimax
let memoCache = {};

const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

// Strategic position values (heuristic)
const positionValues = [
    3, 2, 3,
    2, 4, 2,
    3, 2, 3
];

function setGameMode(mode) {
    gameMode = mode;
    gameActive = true;
    document.getElementById('ludo-board').classList.add('hidden');
    document.getElementById('tic-tac-toe-board').classList.remove('hidden');
    resetGame();
    updateTurnIndicator();
}

function backToMenu() {
    document.getElementById('tic-tac-toe-board').classList.add('hidden');
    document.getElementById('ludo-board').classList.remove('hidden');
}

function toggleDifficulty() {
    difficulty = difficulty === 'easy' ? 'hard' : 'easy';
    document.getElementById('difficulty-text').innerText = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
} 

function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light';
    document.getElementById('theme-text').innerText = theme.charAt(0).toUpperCase() + theme.slice(1);
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', theme);
}

function loadSavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        theme = savedTheme;
        document.getElementById('theme-text').innerText = theme.charAt(0).toUpperCase() + theme.slice(1);
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
        }
    }
}

loadSavedTheme();

function updateTurnIndicator() {
    const turnText = gameMode === 'pvp' 
        ? `Player ${currentPlayer}'s turn`
        : currentPlayer === 'X' ? "Your turn" : "AI's turn";
    document.getElementById('player-turn').innerText = turnText;
}

function makeMove(index) {
    if (gameBoard[index] === '' && gameActive) {
        gameBoard[index] = currentPlayer;
        gameStats.totalMoves++;
        const cell = document.querySelector(`[data-index="${index}"]`);
        cell.innerText = currentPlayer;
        cell.classList.add(currentPlayer.toLowerCase());

        if (checkWinner()) {
            const winner = gameMode === 'pvc' && currentPlayer === 'O' ? 'AI' : `Player ${currentPlayer}`;
            document.getElementById('result').innerText = `${winner} wins!`;
            
            // Update stats
            if (gameMode === 'pvc') {
                if (currentPlayer === 'O') {
                    gameStats.aiWins++;
                } else {
                    gameStats.playerWins++;
                }
            }
            gameActive = false;
            updateStats();
            return;
        }

        if (isBoardFull()) {
            document.getElementById('result').innerText = 'It\'s a tie!';
            gameStats.draws++;
            gameActive = false;
            updateStats();
            return;
        }

        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        updateTurnIndicator();

        if (gameMode === 'pvc' && currentPlayer === 'O' && gameActive) {
            setTimeout(aiMove, 700);
        }
    }
}

function aiMove() {
    if (difficulty === 'easy') {
        const availableMoves = gameBoard.map((cell, index) => cell === '' ? index : null).filter(index => index !== null);
        const randomIndex = availableMoves[Math.floor(Math.random() * availableMoves.length)];
        makeMove(randomIndex);
    } else {
        // Hard mode: Advanced AI with alpha-beta pruning
        memoCache = {}; // Clear cache for new game state
        const bestMove = findBestMove(gameBoard);
        makeMove(bestMove);
    }
}

function findBestMove(board) {
    let bestScore = -Infinity;
    let bestMove = 0;
    const availableMoves = getOrderedMoves(board);

    for (let move of availableMoves) {
        const boardCopy = [...board];
        boardCopy[move] = 'O';
        const score = minimaxAlphaBeta(boardCopy, 0, false, -Infinity, Infinity);
        
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }

    return bestMove;
}

// Move ordering heuristic - evaluates moves strategically
function getOrderedMoves(board) {
    const availableMoves = board.map((cell, index) => cell === '' ? index : null).filter(index => index !== null);
    
    // Sort moves by strategic value
    return availableMoves.sort((a, b) => {
        const scoreA = calculateMoveScore(board, a);
        const scoreB = calculateMoveScore(board, b);
        return scoreB - scoreA; // Descending order
    });
}

// Calculate heuristic score for a move (fork detection, winning moves, blocking)
function calculateMoveScore(board, move) {
    let score = positionValues[move];
    
    // Check if move wins
    const testBoard = [...board];
    testBoard[move] = 'O';
    if (checkWinnerForBoard(testBoard)) {
        return 1000; // Highest priority
    }
    
    // Check if blocks opponent win
    testBoard[move] = 'X';
    if (checkWinnerForBoard(testBoard)) {
        return 900; // Second highest
    }
    
    // Fork detection - creates two winning opportunities
    if (detectsFork(board, move)) {
        score += 300;
    }
    
    return score;
}

// Detects if a move creates a fork (two winning threats)
function detectsFork(board, move) {
    const testBoard = [...board];
    testBoard[move] = 'O';
    let winningThreats = 0;
    
    for (let pattern of winPatterns) {
        const [a, b, c] = pattern;
        const cells = [testBoard[a], testBoard[b], testBoard[c]];
        const oCount = cells.filter(cell => cell === 'O').length;
        const emptyCount = cells.filter(cell => cell === '').length;
        
        if (oCount === 1 && emptyCount === 2) {
            winningThreats++;
        }
    }
    
    return winningThreats >= 2;
}

// Minimax with Alpha-Beta Pruning for optimized game tree search
function minimaxAlphaBeta(board, depth, isMaximizing, alpha, beta) {
    const boardKey = board.join(',');
    
    // Check memoization cache
    if (memoCache[boardKey] !== undefined) {
        return memoCache[boardKey];
    }

    // Terminal states
    if (checkWinnerForBoard(board)) {
        return isMaximizing ? -10 + depth : 10 - depth;
    }
    
    if (board.every(cell => cell !== '')) {
        return 0; // Draw
    }

    let bestScore;
    
    if (isMaximizing) {
        // AI maximizing
        bestScore = -Infinity;
        for (let i = 0; i < 9; i++) {
            if (board[i] === '') {
                board[i] = 'O';
                const score = minimaxAlphaBeta(board, depth + 1, false, alpha, beta);
                board[i] = '';
                bestScore = Math.max(score, bestScore);
                alpha = Math.max(alpha, score);
                if (beta <= alpha) break; // Beta cutoff
            }
        }
    } else {
        // Player minimizing
        bestScore = Infinity;
        for (let i = 0; i < 9; i++) {
            if (board[i] === '') {
                board[i] = 'X';
                const score = minimaxAlphaBeta(board, depth + 1, true, alpha, beta);
                board[i] = '';
                bestScore = Math.min(score, bestScore);
                beta = Math.min(beta, score);
                if (beta <= alpha) break; // Alpha cutoff
            }
        }
    }
    
    memoCache[boardKey] = bestScore;
    return bestScore;
}

function checkWinner() {
    for (let pattern of winPatterns) {
        if (gameBoard[pattern[0]] === gameBoard[pattern[1]] && gameBoard[pattern[1]] === gameBoard[pattern[2]] && gameBoard[pattern[0]] !== '') {
            return true;
        }
    }
    return false;
}

function checkWinnerForBoard(board) {
    for (let pattern of winPatterns) {
        if (board[pattern[0]] === board[pattern[1]] && board[pattern[1]] === board[pattern[2]] && board[pattern[0]] !== '') {
            return true;
        }
    }
    return false;
}

function isBoardFull() {
    return gameBoard.every(cell => cell !== '');
}

function resetGame() {
    gameBoard = ['', '', '', '', '', '', '', '', ''];
    currentPlayer = 'X';
    gameActive = true;
    memoCache = {}; // Clear cache on game reset
    document.getElementById('board').innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = i;
        cell.addEventListener('click', () => makeMove(i));
        cell.addEventListener('touchstart', () => makeMove(i));
        document.getElementById('board').appendChild(cell);
    }
    updateTurnIndicator();
    document.getElementById('result').innerText = '';
}

function updateStats() {
    if (document.getElementById('stats-display')) {
        const winRate = gameStats.aiWins + gameStats.playerWins > 0 
            ? ((gameStats.aiWins / (gameStats.aiWins + gameStats.playerWins)) * 100).toFixed(1)
            : '0';
        
        document.getElementById('stats-display').innerHTML = `
            <div class="stats-container">
                <div class="stat-item">AI Wins: <span>${gameStats.aiWins}</span></div>
                <div class="stat-item">Your Wins: <span>${gameStats.playerWins}</span></div>
                <div class="stat-item">Draws: <span>${gameStats.draws}</span></div>
                <div class="stat-item">AI Win Rate: <span>${winRate}%</span></div>
                <div class="stat-item">Total Moves: <span>${gameStats.totalMoves}</span></div>
            </div>
        `;
    }
}

resetGame();