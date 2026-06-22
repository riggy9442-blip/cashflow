import crypto from 'crypto';

class GameState {
  constructor(io) {
    this.io = io;
    this.status = 'WAITING'; // WAITING, IN_PROGRESS, CRASHED
    this.multiplier = 1.0;
    this.crashPoint = 0;
    this.players = new Map(); // socket.id -> { betAmount, cashedOut, winnings, username }
    this.history = [];
    
    this.tickRate = 100; // ms
    this.interval = null;
    this.startTime = 0;
    
    this.startWaitingPhase();
  }

  generateCrashPoint() {
    // 1% instant crash at 1.00x
    if (Math.random() < 0.01) return 1.00;
    // Otherwise pareto distribution
    return Math.max(1.01, parseFloat((0.99 / Math.random()).toFixed(2)));
  }

  startWaitingPhase() {
    this.status = 'WAITING';
    this.multiplier = 1.0;
    this.players.clear();
    this.io.emit('gameState', this.getState());
    
    let countdown = 5;
    const waitInterval = setInterval(() => {
      countdown--;
      this.io.emit('gameCountdown', countdown);
      
      if (countdown <= 0) {
        clearInterval(waitInterval);
        this.startGamePhase();
      }
    }, 1000);
  }

  startGamePhase() {
    this.status = 'IN_PROGRESS';
    this.crashPoint = this.generateCrashPoint();
    this.startTime = Date.now();
    this.multiplier = 1.0;
    
    this.io.emit('gameState', this.getState());
    
    this.interval = setInterval(() => {
      // Calculate multiplier based on time elapsed to create exponential curve
      const elapsed = Date.now() - this.startTime;
      // Formula: m = e^(rt), roughly 0.00006 for a smooth curve
      this.multiplier = Math.max(1.0, Math.pow(Math.E, 0.00006 * elapsed));
      
      if (this.multiplier >= this.crashPoint) {
        this.multiplier = this.crashPoint; // Exact crash point
        this.crashGame();
      } else {
        this.io.emit('gameTick', { multiplier: this.multiplier.toFixed(2) });
      }
    }, this.tickRate);
  }

  crashGame() {
    clearInterval(this.interval);
    this.status = 'CRASHED';
    
    // Process losses
    for (let [id, player] of this.players) {
      if (!player.cashedOut) {
        // Lost
        player.winnings = 0;
      }
    }
    
    this.history.unshift(this.crashPoint.toFixed(2));
    if (this.history.length > 20) this.history.pop();
    
    this.io.emit('gameCrashed', {
      multiplier: this.crashPoint.toFixed(2),
      players: Array.from(this.players.entries()).map(([id, p]) => p)
    });
    
    setTimeout(() => {
      this.startWaitingPhase();
    }, 3000);
  }

  placeBet(username, amount) {
    if (this.status !== 'WAITING') return false;
    
    this.players.set(username, {
      username,
      betAmount: amount,
      cashedOut: false,
      winnings: 0
    });
    
    this.io.emit('playersUpdate', Array.from(this.players.values()));
    return true;
  }

  cashOut(username) {
    if (this.status !== 'IN_PROGRESS') return false;
    
    const player = this.players.get(username);
    if (!player || player.cashedOut) return false;
    
    player.cashedOut = true;
    player.winnings = player.betAmount * this.multiplier;
    
    this.io.emit('playerCashedOut', {
      username: player.username,
      multiplier: this.multiplier.toFixed(2),
      winnings: player.winnings
    });
    this.io.emit('playersUpdate', Array.from(this.players.values()));
    return player.winnings;
  }

  getState() {
    return {
      status: this.status,
      multiplier: this.multiplier.toFixed(2),
      players: Array.from(this.players.values()),
      history: this.history
    };
  }
}

export default GameState;
