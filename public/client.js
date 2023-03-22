const roomSelector = document.getElementById('roomSelector');
const roomInput = document.getElementById('roomInput');
const createRoomBtn = document.getElementById('createRoomBtn');
const gameContainer = document.getElementById('gameContainer');

createRoomBtn.addEventListener('click', () => {
    const roomName = roomInput.value.trim();
    if (roomName.length > 0) {
        createRoom(roomName);
    }
});

function createRoom(roomName) {
  gameContainer.style.display = 'block';
  roomSelector.style.display = 'none';

  // Connect to the server and join the room
  const socket = io();
  socket.emit('joinRoom', roomName);

  const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#8cac0e',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0 },
      }
    },
    scene: {
      preload: preload,
      create: create,
      update: update
    }
  };
  
  const game = new Phaser.Game(config);
  let player;
  let otherPlayers;
  let boxes;
  let cursors;
  let floor;
  let boxColor;
  
  function preload() {
    this.load.image('player', 'assets/character.png');
    this.load.image('box', 'assets/box.png');
  }
  
  function create() {
    player = this.physics.add.sprite(config.width / 2, config.height - 50, 'player');
    otherPlayers = this.add.group();
    cursors = this.input.keyboard.createCursorKeys();
  
    socket.on('currentPlayers', (players) => {
      console.log('socket on currentPlayers');
      Object.keys(players).forEach((id) => {
          if (id !== socket.id) {
              const otherPlayer = this.add.sprite(players[id].x, players[id].y, 'player');
              otherPlayer.playerId = id;
              otherPlayers.add(otherPlayer);
          }
      });
    });
  
    socket.on('currentBoxes', (newBoxes) => {
      newBoxes.forEach((box) => {
        let newBox = boxes.create(box.x, box.y, 'box');
        newBox.setTintFill(box.boxColor);
      });
    });
  
    socket.on('newPlayer', (playerInfo) => {
      console.log('socket on newPlayer');
      const otherPlayer = this.add.sprite(playerInfo.x, playerInfo.y, 'player');
      otherPlayer.playerId = playerInfo.playerId;
      otherPlayers.add(otherPlayer);
    });
  
    socket.on('playerMoved', (playerInfo) => {
      otherPlayers.getChildren().forEach((otherPlayer) => {
        if (playerInfo.playerId === otherPlayer.playerId) {
          otherPlayer.setPosition(playerInfo.x, playerInfo.y);
        }
      });
    });
  
    socket.on('playerDisconnected', (playerId) => {
      otherPlayers.getChildren().forEach((otherPlayer) => {
        if (playerId === otherPlayer.playerId) {
          otherPlayer.destroy();
        }
      });
    });
  
    socket.on('boxCreated', (boxInfo) => {
      let box = boxes.create(boxInfo.x, boxInfo.y, 'box');
      box.setTintFill(boxInfo.boxColor);
    });
  
    player.setCollideWorldBounds(true);
  
    boxes = this.physics.add.group();
  
    cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown-SPACE', placeBox, this);
  
    // Add this code to create the floor
    floor = this.physics.add.staticGroup();
    const floorRect = this.add.rectangle(config.width / 2, config.height - 25, config.width, 5, 0x000000);
    floor.add(floorRect);
    this.physics.add.collider(player, floor);
    
    // Send event for server to add existing players and boxes to new player
    socket.emit('clientReady');

    boxColor = getRandomColor();
  }
  
  function update() {
    if (cursors.left.isDown) {
      player.setVelocityX(-200);
    } else if (cursors.right.isDown) {
      player.setVelocityX(200);
    } else {
      player.setVelocityX(0);
    }
  
    if (cursors.up.isDown) {
      player.setVelocityY(-200);
    } else if (cursors.down.isDown) {
      player.setVelocityY(200);
    } else {
      player.setVelocityY(0);
    }
  
    // Emit player movement
    const x = player.x;
    const y = player.y;
  
    if (player.oldPosition && (x !== player.oldPosition.x || y !== player.oldPosition.y)) {
      socket.emit('playerMovement', { x: player.x, y: player.y });
    }
  
    // Save old position data
    player.oldPosition = {
      x: player.x,
      y: player.y,
    };
  }
  
  function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '0x';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return parseInt(color);
  }

  function placeBox() {
    let box = boxes.create(player.x, player.y - 32, 'box');
    box.setTintFill(boxColor);
    socket.emit('boxCreated', { x: box.x, y: box.y, boxColor: boxColor });
  }
}
