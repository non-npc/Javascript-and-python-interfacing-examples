// Initialize QWebChannel to connect with Python
let bridge;

// Initialize QWebChannel
document.addEventListener('DOMContentLoaded', function() {
    // Initialize QWebChannel before setting up the game
    new QWebChannel(qt.webChannelTransport, function(channel) {
        bridge = channel.objects.bridge;
        console.log("Bridge initialized!");
        
        // Now initialize the game after bridge is ready
        initGame();
    });
});

// Simple game implementation
function initGame() {
    try {
        // Create a simple canvas-based game
        var gameContainer = document.getElementById('game_container');
        var canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        gameContainer.appendChild(canvas);
        
        var ctx = canvas.getContext('2d');
        
        // Load images
        var playerImg = new Image();
        var coinImg = new Image();
        var grassImg = new Image();
        
        // Load sound
        var coinSound = new Audio('assets/sounds/coin.mp3');
        
        var imagesLoaded = 0;
        var totalImages = 3;
        
        function checkAllImagesLoaded() {
            imagesLoaded++;
            
            if (imagesLoaded === totalImages) {
                startGame();
            }
        }
        
        playerImg.onload = checkAllImagesLoaded;
        coinImg.onload = checkAllImagesLoaded;
        grassImg.onload = checkAllImagesLoaded;
        
        playerImg.onerror = function() {
            console.error('Failed to load player image');
        };
        coinImg.onerror = function() {
            console.error('Failed to load coin image');
        };
        grassImg.onerror = function() {
            console.error('Failed to load grass image');
        };
        
        // Set the source after setting up event handlers
        playerImg.src = 'assets/sprite_sheets/char.png';
        coinImg.src = 'assets/sprite_sheets/coin.png';
        grassImg.src = 'assets/tiles/grass.png';
        
        // Game variables
        var player = {
            x: 200,
            y: 300,
            width: 32,
            height: 32,
            speed: 5,
            frameX: 0,
            frameY: 0,
            moving: false,
            frameCount: 0,
            frameDelay: 5  // Only update animation every 5 frames
        };
        
        var coin = {
            x: 400,
            y: 150,
            width: 12,  // Updated to match actual sprite width
            height: 16,
            frameX: 0,
            frameCount: 8,
            collected: false,
            animationCounter: 0,
            animationDelay: 8  // Slow down coin animation
        };
        
        var score = 0;
        var keys = {};
        var frameCounter = 0;
        
        // Notification system
        function showNotification(message) {
            var notification = document.getElementById('notification');
            if (notification) {
                notification.textContent = message;
                notification.style.opacity = 1;
                
                // Fade out after 1 second
                setTimeout(function() {
                    notification.style.opacity = 0;
                }, 1000);
            }
        }
        
        // Save and Load functionality using Python bridge
        var saveGameBtn = document.getElementById('save_game');
        var loadGameBtn = document.getElementById('load_game');
        
        saveGameBtn.addEventListener('click', saveGame);
        loadGameBtn.addEventListener('click', loadGame);
        
        function saveGame() {
            // Create a game state object
            var gameState = {
                player: {
                    x: player.x,
                    y: player.y,
                    frameX: player.frameX,
                    frameY: player.frameY
                },
                coin: {
                    x: coin.x,
                    y: coin.y,
                    collected: coin.collected
                },
                score: score
            };
            
            // Convert to JSON
            var gameStateJSON = JSON.stringify(gameState);
            
            // Use the Python bridge to save the game state
            if (bridge && typeof bridge.saveGameState === 'function') {
                bridge.saveGameState(gameStateJSON);
                console.log('Game state sent to Python for saving');
                showNotification('Game Saved');
            } else {
                console.error('Python bridge not available for saving');
                var errorDisplay = document.getElementById('error_display');
                if (errorDisplay) {
                    errorDisplay.textContent = 'Error: Python bridge not available for saving';
                    errorDisplay.style.display = 'block';
                }
            }
        }
        
        function loadGame() {
            // Use the Python bridge to load the game state
            if (bridge && typeof bridge.loadGameState === 'function') {
                bridge.loadGameState();
                console.log('Requested game state from Python');
            } else {
                console.error('Python bridge not available for loading');
                var errorDisplay = document.getElementById('error_display');
                if (errorDisplay) {
                    errorDisplay.textContent = 'Error: Python bridge not available for loading';
                    errorDisplay.style.display = 'block';
                }
            }
        }
        
        // Register callback for when game state is loaded from Python
        if (bridge) {
            bridge.taskCompleted = function(taskId, result) {
                if (taskId === 'loadGameState') {
                    try {
                        var gameState = JSON.parse(result);
                        
                        // Apply the loaded state
                        if (gameState.player) {
                            player.x = gameState.player.x;
                            player.y = gameState.player.y;
                            player.frameX = gameState.player.frameX;
                            player.frameY = gameState.player.frameY;
                        }
                        
                        if (gameState.coin) {
                            coin.x = gameState.coin.x;
                            coin.y = gameState.coin.y;
                            coin.collected = gameState.coin.collected;
                        }
                        
                        if (gameState.score !== undefined) {
                            score = gameState.score;
                        }
                        
                        console.log('Game state loaded successfully from Python');
                        showNotification('Game Loaded');
                    } catch (error) {
                        console.error('Error parsing game state from Python:', error);
                    }
                }
            };
        }
        
        // Handle keyboard input
        window.addEventListener('keydown', function(e) {
            keys[e.keyCode] = true;
        });
        
        window.addEventListener('keyup', function(e) {
            keys[e.keyCode] = false;
        });
        
        function movePlayer() {
            player.moving = false;
            
            if (keys[37]) { // Left arrow
                player.x -= player.speed;
                player.frameY = 1;
                player.moving = true;
            }
            if (keys[39]) { // Right arrow
                player.x += player.speed;
                player.frameY = 2;
                player.moving = true;
            }
            if (keys[38]) { // Up arrow
                player.y -= player.speed;
                player.frameY = 3;
                player.moving = true;
            }
            if (keys[40]) { // Down arrow
                player.y += player.speed;
                player.frameY = 0;
                player.moving = true;
            }
            
            // Keep player within bounds
            if (player.x < 0) player.x = 0;
            if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;
            if (player.y < 0) player.y = 0;
            if (player.y > canvas.height - player.height) player.y = canvas.height - player.height;
        }
        
        function checkCollision() {
            if (!coin.collected &&
                player.x < coin.x + coin.width &&
                player.x + player.width > coin.x &&
                player.y < coin.y + coin.height &&
                player.y + player.height > coin.y) {
                
                coin.collected = true;
                score++;
                
                // Play coin sound
                coinSound.currentTime = 0; // Reset sound to beginning
                coinSound.play().catch(function(error) {
                    console.error('Error playing sound:', error);
                });
                
                // Respawn coin after a short delay
                setTimeout(function() {
                    coin.x = Math.random() * (canvas.width - 50) + 25;
                    coin.y = Math.random() * (canvas.height - 50) + 25;
                    coin.collected = false;
                }, 500);
            }
        }
        
        function drawTiledBackground() {
            // Draw tiled grass background (32x32 tiles)
            var tileSize = 32;
            var tilesX = Math.ceil(canvas.width / tileSize);
            var tilesY = Math.ceil(canvas.height / tileSize);
            
            for (var y = 0; y < tilesY; y++) {
                for (var x = 0; x < tilesX; x++) {
                    ctx.drawImage(
                        grassImg,
                        0, 0, tileSize, tileSize,
                        x * tileSize, y * tileSize, tileSize, tileSize
                    );
                }
            }
        }
        
        function animate() {
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw tiled background
            drawTiledBackground();
            
            // Update frame counter
            frameCounter++;
            
            // Draw player with slower animation
            if (player.moving && frameCounter % player.frameDelay === 0) {
                player.frameX = (player.frameX + 1) % 3;
            }
            
            ctx.drawImage(
                playerImg,
                player.frameX * 32, player.frameY * 32, 32, 32,
                player.x, player.y, player.width, player.height
            );
            
            // Draw coin if not collected, with slower animation
            if (!coin.collected) {
                if (frameCounter % coin.animationDelay === 0) {
                    coin.frameX = (coin.frameX + 1) % coin.frameCount;
                }
                
                ctx.drawImage(
                    coinImg,
                    coin.frameX * 12, 0, 12, 16,  // Updated to use 12px width for each frame
                    coin.x, coin.y, coin.width, coin.height
                );
            }
            
            // Draw score
            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.fillText('Coins: ' + score, 20, 30);
            
            // Move player
            movePlayer();
            
            // Check for collisions
            checkCollision();
            
            // Request next frame
            requestAnimationFrame(animate);
        }
        
        function startGame() {
            // Start animation loop
            animate();
        }
        
    } catch (e) {
        console.error('Game error:', e);
    }
}