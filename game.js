const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextCtx = nextCanvas.getContext('2d');

const ROW = 20;
const COL = 10;
const BLOCK_SIZE = 30; // 300x600 화면 크기 기준

// 블록 색상 정보
const COLORS = {
    I: '#00f0f0', O: '#f0f000', T: '#a000f0',
    S: '#00f000', Z: '#f00000', J: '#0000f0', L: '#f0a000'
};

// 테트로미노 형태 정의
const SHAPES = {
    I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    O: [[1,1],[1,1]],
    T: [[0,1,0],[1,1,1],[0,0,0]],
    S: [[0,1,1],[1,1,0],[0,0,0]],
    Z: [[1,1,0],[0,1,1],[0,0,0]],
    J: [[1,0,0],[1,1,1],[0,0,0]],
    L: [[0,0,1],[1,1,1],[0,0,0]]
};

let board = Array.from({length: ROW}, () => Array(COL).fill(0));
let score = 0;
let gameOver = false;
let isPaused = false;
let gameInterval;
let dropStart = Date.now();

let currentPiece;
let nextPiece;

class Piece {
    constructor(shape, color) {
        this.shape = shape;
        this.color = color;
        this.x = Math.floor((COL - shape[0].length) / 2);
        this.y = shape === SHAPES.I ? -1 : 0;
    }

    draw(context, size = BLOCK_SIZE, offsetX = 0, offsetY = 0) {
        context.fillStyle = this.color;
        this.shape.forEach((row, r) => {
            row.forEach((value, c) => {
                if (value) {
                    context.fillRect((this.x + c) * size + offsetX, (this.y + r) * size + offsetY, size - 1, size - 1);
                }
            });
        });
    }

    clear(context) {
        this.shape.forEach((row, r) => {
            row.forEach((value, c) => {
                if (value) {
                    context.clearRect((this.x + c) * BLOCK_SIZE, (this.y + r) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    // 격자선 다시 그리기
                    context.strokeStyle = '#1e293b';
                    context.strokeRect((this.x + c) * BLOCK_SIZE, (this.y + r) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            });
        });
    }

    moveDown() {
        if (!this.collision(0, 1, this.shape)) {
            this.clear(ctx);
            this.y++;
            this.draw(ctx);
            return true;
        }
        this.lock();
        return false;
    }

    moveLeft() {
        if (!this.collision(-1, 0, this.shape)) {
            this.clear(ctx);
            this.x--;
            this.draw(ctx);
        }
    }

    moveRight() {
        if (!this.collision(1, 0, this.shape)) {
            this.clear(ctx);
            this.x++;
            this.draw(ctx);
        }
    }

    rotate() {
        let nextShape = [];
        for (let i = 0; i < this.shape[0].length; i++) {
            let row = [];
            for (let j = this.shape.length - 1; j >= 0; j--) {
                row.push(this.shape[j][i]);
            }
            nextShape.push(row);
        }

        if (!this.collision(0, 0, nextShape)) {
            this.clear(ctx);
            this.shape = nextShape;
            this.draw(ctx);
        }
    }

    collision(xOffset, yOffset, futureShape) {
        for (let r = 0; r < futureShape.length; r++) {
            for (let c = 0; c < futureShape[r].length; c++) {
                if (!futureShape[r][c]) continue;
                let newX = this.x + c + xOffset;
                let newY = this.y + r + yOffset;

                if (newX < 0 || newX >= COL || newY >= ROW) return true;
                if (newY < 0) continue;
                if (board[newY][newX]) return true;
            }
        }
        return false;
    }

    lock() {
        this.shape.forEach((row, r) => {
            row.forEach((value, c) => {
                if (value) {
                    if (this.y + r < 0) {
                        endGame();
                        return;
                    }
                    board[this.y + r][this.x + c] = this.color;
                }
            });
        });
        if (!gameOver) {
            clearLines();
            getNextPiece();
        }
    }
}

function getRandomPiece() {
    const keys = Object.keys(SHAPES);
    const randKey = keys[Math.floor(Math.random() * keys.length)];
    return new Piece(SHAPES[randKey], COLORS[randKey]);
}

function getNextPiece() {
    currentPiece = nextPiece || getRandomPiece();
    nextPiece = getRandomPiece();
    drawBoard();
    currentPiece.draw(ctx);
    drawNext();
}

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let r = 0; r < ROW; r++) {
        for (let c = 0; c < COL; c++) {
            if (board[r][c]) {
                ctx.fillStyle = board[r][c];
                ctx.fillRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
            } else {
                ctx.strokeStyle = '#1e293b';
                ctx.strokeRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        }
    }
}

function drawNext() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    // 다음 블록 미리보기 창 중앙 정렬을 위한 연산
    const size = 25;
    const offsetX = (nextCanvas.width - nextPiece.shape[0].length * size) / 2;
    const offsetY = (nextCanvas.height - nextPiece.shape.length * size) / 2;
    
    nextCtx.fillStyle = nextPiece.color;
    nextPiece.shape.forEach((row, r) => {
        row.forEach((value, c) => {
            if (value) {
                nextCtx.fillRect(c * size + offsetX, r * size + offsetY, size - 1, size - 1);
            }
        });
    });
}

function clearLines() {
    let linesCleared = 0;
    for (let r = ROW - 1; r >= 0; r--) {
        if (board[r].every(value => value !== 0)) {
            board.splice(r, 1);
            board.unshift(Array(COL).fill(0));
            linesCleared++;
            r++; // 라인이 내려왔으므로 현재 행을 다시 확인
        }
    }
    if (linesCleared > 0) {
        const points = [0, 100, 300, 500, 800];
        score += points[linesCleared] || 1000;
        document.getElementById('score').innerText = score;
    }
}

// 자동 낙하 루프
function update() {
    if (gameOver || isPaused) return;
    let now = Date.now();
    let delta = now - dropStart;
    if (delta > 1000) { // 1초마다 한 칸씩 낙하
        currentPiece.moveDown();
        dropStart = Date.now();
    }
    gameInterval = requestAnimationFrame(update);
}

function startGame() {
    cancelAnimationFrame(gameInterval);
    board = Array.from({length: ROW}, () => Array(COL).fill(0));
    score = 0;
    gameOver = false;
    isPaused = false;
    document.getElementById('score').innerText = score;
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('start-btn').innerText = '일시정지 (P)';
    
    nextPiece = getRandomPiece();
    getNextPiece();
    dropStart = Date.now();
    update();
}

function togglePause() {
    if (gameOver) return;
    isPaused = !isPaused;
    if (isPaused) {
        document.getElementById('start-btn').innerText = '게임 재개';
        cancelAnimationFrame(gameInterval);
    } else {
        document.getElementById('start-btn').innerText = '일시정지 (P)';
        dropStart = Date.now();
        update();
    }
}

function endGame() {
    gameOver = true;
    cancelAnimationFrame(gameInterval);
    document.getElementById('final-score').innerText = score;
    document.getElementById('game-over').classList.remove('hidden');
    document.getElementById('start-btn').innerText = '게임 시작';
}

// 키보드 이벤트 리스너
document.addEventListener('keydown', event => {
    if (gameOver || isPaused) {
        if (event.key.toLowerCase() === 'p') togglePause();
        return;
    }
    switch (event.key) {
        case 'ArrowLeft': currentPiece.moveLeft(); break;
        case 'ArrowRight': currentPiece.moveRight(); break;
        case 'ArrowUp': currentPiece.rotate(); break;
        case 'ArrowDown': currentPiece.moveDown(); dropStart = Date.now(); break;
        case ' ': // 스페이스바: 하드 드롭
            while(currentPiece.moveDown()){}
            dropStart = Date.now();
            break;
        case 'p':
        case 'P':
            togglePause();
            break;
    }
});

document.getElementById('start-btn').addEventListener('click', () => {
    if (document.getElementById('start-btn').innerText === '게임 시작' && !gameOver) {
        startGame();
    } else {
        togglePause();
    }
});
document.getElementById('restart-btn').addEventListener('click', startGame);

// 초기 화면 그리드만 표시
drawBoard();
