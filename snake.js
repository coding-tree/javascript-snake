const MAP = {
  scale: 70,
  x: 12,
  y: 8
};

const COLORS = {
  BACKGROUND: "rgb(230,230,255)",
  SNAKE_BODY: "rgb(0,100,0)"
};

const MOVES = {
  RIGHT: "right",
  LEFT: "left",
  UP: "up",
  DOWN: "down"
};

const ArrowMapping = {
  ["ArrowLeft"]: MOVES.LEFT,
  ["ArrowUp"]: MOVES.UP,
  ["ArrowRight"]: MOVES.RIGHT,
  ["ArrowDown"]: MOVES.DOWN
};

const ASWDMapping = {
  ["KeyA"]: MOVES.LEFT,
  ["KeyW"]: MOVES.UP,
  ["KeyD"]: MOVES.RIGHT,
  ["KeyS"]: MOVES.DOWN
};

class Position {
  constructor(obj) {
    if (obj instanceof Array) {
      this.x = obj[0];
      this.y = obj[1];
    } else {
      Object.assign(this, obj);
    }
  }

  add(pos) {
    return StaticPosition(this.x + pos.x, this.y + pos.y);
  }

  equals(pos) {
    return this.x === pos.x && this.y === pos.y;
  }
}

function RandomPosition() {
  return new Position({
    x: Math.floor(Math.random() * MAP.x),
    y: Math.floor(Math.random() * MAP.y)
  });
}

function StaticPosition(x, y) {
  return new Position({ x, y });
}

const DirectionToMoveVector = {
  [MOVES.RIGHT]: StaticPosition(1, 0),
  [MOVES.LEFT]: StaticPosition(-1, 0),
  [MOVES.UP]: StaticPosition(0, -1),
  [MOVES.DOWN]: StaticPosition(0, 1)
};

const SNAKE_DEFAULT = {
  speed: 500,
  fastSpeedUp: 25,
  position: [[3, 2], [2, 2], [1, 2]]
};

const loadImage = src => {
  return new Promise(resolve => {
    const cache = loadImage.cache || {};
    const mbyImage = cache[src];
    if (mbyImage) {
      resolve(mbyImage);
    } else {
      const image = new Image();
      image.src = src;
      image.onload = () => {
        cache[src] = image;
        resolve(image);
      };
    }
  });
};

class CanvasManager {
  constructor(ctx) {
    this.ctx = ctx;
  }

  createElement() {
    const canvasNotSupportedText =
      "here is a canvas element with the game snake if you can't see it your browser is OLD!";
    const canvas = document.createElement("canvas");
    canvas.id = "canvas";
    canvas.height = MAP.scale * MAP.y;
    canvas.width = MAP.scale * MAP.x;
    canvas.innerHTML = canvasNotSupportedText;
    root.appendChild(canvas);
    this.ctx = canvas.getContext("2d");
  }

  drawSnake(snake) {
    snake.position.slice(1).map(position => {
      this._drawSnakeBodyPart(position);
    });
    this._drawEyes(snake);
  }

  _drawSnakeBodyPart(position) {
    loadImage("./body-right.svg").then(image => {
      this.ctx.drawImage(
        image,
        position.x * MAP.scale + 1,
        position.y * MAP.scale + 1,
        70,
        70
      );
    });
  }

  _rotateAndPaintImage(image, angleInRad, positionX, positionY, axisX, axisY) {
    this.ctx.translate(positionX, positionY);
    this.ctx.rotate(angleInRad);
    this.ctx.drawImage(image, -axisX, -axisY, 70, 70);
  }

  _drawEyes(snake) {
    const TO_RADIANS = Math.PI / 180;

    loadImage("./head-right.svg").then(image => {
      this.ctx.save();
      this._rotateAndPaintImage(
        image,
        0 * TO_RADIANS,
        snake.position[0].x * MAP.scale + 1,
        snake.position[0].y * MAP.scale + 1,
        0,
        0
      );
      this.ctx.restore();
    });
  }

  drawFood(score, position) {
    this.ctx.fillStyle = score > 10 ? "rgb(210,214,27)" : "rgb(200,200,200)";
    this.ctx.fillRect(
      position.x * MAP.scale + 1,
      position.y * MAP.scale + 1,
      MAP.scale - 2,
      MAP.scale - 2
    );
  }

  cleanMap() {
    this.ctx.fillStyle = COLORS.BACKGROUND;
    this.ctx.fillRect(0, 0, MAP.x * MAP.scale, MAP.y * MAP.scale);
  }
}

const regularFoodProducer = {
  id: "regular",
  produce: () => {
    return { id: "regular", score: 10, position: RandomPosition(), timer: 0 };
  },
  canProduce: foodList => {
    const existingFood = foodList.find(x => x.id === "regular");
    return existingFood === undefined;
  },
  isValid: () => {
    return true;
  }
};

const premiumFoodProducer = {
  id: "premium",
  produce: () => {
    return {
      id: "premium",
      score: 20,
      position: RandomPosition(),
      timer: 0
    };
  },
  canProduce: (foodList, gameState) => {
    const existingFood = foodList.find(x => x.id === "premium");
    return existingFood === undefined && gameState.score % 50 === 0;
  },
  isValid: food => {
    return food.timer < 16;
  }
};

const foodProducers = [regularFoodProducer, premiumFoodProducer];

// canvas context
let gameContainer = document.getElementById("root");

const canvasManager = new CanvasManager();
canvasManager.createElement();

const createInitialSnake = () => {
  const clone = JSON.parse(JSON.stringify(SNAKE_DEFAULT));
  clone.position = clone.position.map(x => new Position(x));
  return clone;
};

let snake;
let foodItems;
let time;
let gameState = {
  score: 0,
  currentDirection: MOVES.RIGHT
};

initializeGame();

function gameLoop() {
  canvasManager.cleanMap();

  moveSnake(snake, gameState);

  if (isCollision()) {
    initializeGame();
  }

  snakeTeleportOnBorder(snake.position[0]);
  checkIfSnakeIsOnAnyFood();

  canvasManager.drawSnake(snake);

  foodItems.map(food => drawFood(food));
  produceFood(foodItems);
}

function moveSnake(snake, gameState) {
  const vector = DirectionToMoveVector[gameState.currentDirection];
  const newHeadPosition = snake.position[0].add(vector);
  snake.position.unshift(newHeadPosition);
  snake.position.pop();
  return snake;
}

function produceFood() {
  foodProducers.forEach(producer => {
    if (producer.canProduce(foodItems, gameState)) {
      console.log("Creating food", producer.id);

      foodItems.push(producer.produce());
    }
  });
}

function drawFood(food) {
  canvasManager.drawFood(food.score, food.position);
}

// keyboard support up down left right
window.addEventListener(
  "keydown",
  function(event) {
    const KeyMapping = Object.assign({}, ArrowMapping, ASWDMapping);

    const isMoveAllowed = oppositDirection => direction => {
      console.log(oppositDirection, direction);
      return direction !== oppositDirection;
    };

    const allowedMoves = {
      [MOVES.LEFT]: isMoveAllowed(MOVES.RIGHT),
      [MOVES.UP]: isMoveAllowed(MOVES.DOWN),
      [MOVES.RIGHT]: isMoveAllowed(MOVES.LEFT),
      [MOVES.DOWN]: isMoveAllowed(MOVES.UP),
      undefined: () => {}
    };

    const keyDirection = { currentDirection: KeyMapping[event.code] };
    const allowed = allowedMoves[keyDirection.currentDirection](
      gameState.currentDirection
    );
    console.log(allowed);
    allowed && Object.assign(gameState, keyDirection);
  },
  false
);

function snakeTeleportOnBorder(snakeHead) {
  if (snakeHead.x === -1) {
    snakeHead.x = MAP.x - 1;
  } else if (snakeHead.x === MAP.x) {
    snakeHead.x = 0;
  } else if (snakeHead.y === -1) {
    snakeHead.y = MAP.y - 1;
  } else if (snakeHead.y === MAP.y) {
    snakeHead.y = 0;
  }
}

function foodInSnake(foodPos) {
  return snake.position.find(position => position.equals(foodPos)) != undefined;
}

function checkIfSnakeIsOnAnyFood() {
  const snakeHead = snake.position[0];
  const currentFood = foodItems.find(x => x.position.equals(snakeHead));

  if (currentFood) {
    scoreUp(currentFood.score);
    snakeEatFood(currentFood);
    foodItems = foodItems.filter(f => !f.position.equals(snakeHead));
  }
}

function snakeEatFood(food) {
  snake.position.push({
    x: 1,
    y: 1
  });
}

function isCollision() {
  const snakeHead = snake.position[0];
  for (let i = 1; i < snake.position.length; i++) {
    if (
      snake.position[i].x === snakeHead.x &&
      snake.position[i].y === snakeHead.y
    ) {
      return true;
    }
  }
  return false;
}

function initializeGame() {
  snake = createInitialSnake();
  foodItems = [];
  gameState = {
    score: 0,
    currentDirection: MOVES.RIGHT
  };

  produceFood();

  printScore(gameState.score);

  clearInterval(time);
  time = setInterval(gameLoop, snake.speed);
}

function scoreUp(howMany) {
  const newGameState = {
    ...gameState,
    score: gameState.score + howMany
  };
  gameState = newGameState;

  acceleration();
  printScore(gameState.score);
  clearInterval(time);
  time = setInterval(gameLoop, snake.speed);
}

function acceleration() {
  if (snake.fastSpeedUp > 0) {
    snake.speed -= snake.fastSpeedUp;
    snake.fastSpeedUp--;
  }
}

function printScore(score) {
  document.querySelector("h1").innerHTML = `Score: ${score}`;
}
