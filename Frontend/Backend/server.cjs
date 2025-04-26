const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

// app.use(cors({
//   origin:"*",
//   method:"*",
//   credentials:true,


// }))

const io = new Server(server, {
  cors: {
    origin: "*", // Update to match frontend deployment URL
    methods: "*",
    credentials:true,
  },
});

let rooms = {}; // Stores active game rooms

io.on("connection", (socket) => {
  console.log(`🔗 Player connected: ${socket.id}`);

  // Handle new player joining a room
  socket.on("joinGame", ({ room, playerName }, callback = () => {}) => {
    if (!room || !playerName) return callback({ error: "Room ID and Player Name are required!" });

    if (!rooms[room]) {
      rooms[room] = {
        players: [],
        board: Array(9).fill(null),
        isXNext: true,
        winner: null,
      };
    }

    let gameRoom = rooms[room];

    if (gameRoom.players.length >= 2) {
      return callback({ error: "Room is full! Try another one." });
    }

    let playerSymbol = gameRoom.players.length === 0 ? "X" : "O";
    let player = { id: socket.id, name: playerName, symbol: playerSymbol };
    gameRoom.players.push(player);
    socket.join(room);

    console.log(`✅ ${playerName} joined room: ${room}`);

    // Notify the player about their assigned symbol
    callback({ symbol: playerSymbol, playerName });

    // Send updated game state to all players in the room
    io.to(room).emit("gameState", gameRoom);
  });

  // Handle player move
  socket.on("makeMove", ({ room, index }, callback = () => {}) => {
    let gameRoom = rooms[room];

    if (!gameRoom) return callback({ error: "Room does not exist." });
    if (gameRoom.winner) return callback({ error: "Game is over." });

    let { board, isXNext, players } = gameRoom;
    let player = players.find((p) => p.id === socket.id);

    if (!player) return callback({ error: "You are not part of this game." });

    if ((isXNext && player.symbol !== "X") || (!isXNext && player.symbol !== "O")) {
      return callback({ error: "Wait for your turn!" });
    }

    if (index < 0 || index > 8 || board[index]) {
      return callback({ error: "Invalid move!" });
    }

    // Update board
    board[index] = player.symbol;
    gameRoom.isXNext = !isXNext;

    // Check for winner
    let winnerSymbol = checkWinner(board);
    if (winnerSymbol) {
      let winnerPlayer = players.find((p) => p.symbol === winnerSymbol);
      gameRoom.winner = winnerPlayer.name;
    }

    io.to(room).emit("gameState", gameRoom);
    callback({ success: true });
  });

  // Reset game
  socket.on("resetGame", (room) => {
    if (!rooms[room]) return;

    rooms[room].board = Array(9).fill(null);
    rooms[room].isXNext = true;
    rooms[room].winner = null;

    io.to(room).emit("gameState", rooms[room]);
  });

  // Handle player disconnect
  socket.on("disconnect", () => {
    console.log(`❌ Player disconnected: ${socket.id}`);

    for (let room in rooms) {
      let gameRoom = rooms[room];
      let playerIndex = gameRoom.players.findIndex((p) => p.id === socket.id);

      if (playerIndex !== -1) {
        gameRoom.players.splice(playerIndex, 1);
        if (gameRoom.players.length === 0) {
          delete rooms[room]; // Remove empty room
        } else {
          io.to(room).emit("gameState", gameRoom);
        }
        break;
      }
    }
  });
});

// Function to check for a winner
function checkWinner(board) {
  const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];

  for (let pattern of winPatterns) {
    const [a, b, c] = pattern;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]; // Return "X" or "O"
    }
  }

  return null;
}

// Start server
server.listen(3001, () => {
  console.log("🚀 Server running on port 3001");
});
