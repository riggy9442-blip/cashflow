import crypto from 'crypto';

class GameState {
  constructor(io) {
    this.io = io;
    this.status = 'WAITING'; // WAITING, IN_PROGRESS, CRASHED
    this.multiplier = 1.0;
    this.serverSeed = this.generateServerSeed();
    this.serverHash = this.generateHash(this.serverSeed);
    this.crashPoint = this.generateCrashPoint();
    this.players = new Map(); // username -> { username, betAmount, cashedOut, winnings }
    this.history = [];
    this.startTime = 0;
    this.tickRate = 50; // ms — 20fps for smoother animation
    this.bots = [];
    
    this.startWaitingPhase();
  }

  generateServerSeed() {
    return crypto.randomBytes(32).toString('hex');
  }

  generateHash(seed) {
    return crypto.createHash('sha256').update(seed).digest('hex');
  }

  generateBots() {
    const numBots = Math.floor(Math.random() * 15) + 10; // 10 to 25 bots
    this.bots = [];
    const prefixes = ['071', '072', '079', '011', '074', 'user', 'pro', 'win'];
    for(let i=0; i<numBots; i++) {
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const name = `${prefix}***${Math.floor(Math.random() * 99)}`;
      const betAmount = (Math.floor(Math.random() * 100) + 1) * 10; // 10 to 1000 KSH
      
      // Bots usually cash out early, sometimes hold longer
      let targetMultiplier = 1.05 + (Math.random() * 1.5); // 1.05x to 2.55x
      if (Math.random() > 0.8) targetMultiplier += Math.random() * 5; // 20% chance to hold up to 7x
      
      this.bots.push({
        username: name,
        betAmount,
        targetMultiplier
      });
    }
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
    this.serverSeed = this.generateServerSeed();
    this.serverHash = this.generateHash(this.serverSeed);
    this.crashPoint = this.generateCrashPoint();
    this.players.clear();
    this.generateBots();
    
    let countdown = 5;
    this.io.emit('gameState', this.getState());
    
    // Simulate bots betting over time
    this.bots.forEach(bot => {
      setTimeout(() => {
        if(this.status === 'WAITING') {
          this.placeBet(bot.username, bot.betAmount);
        }
      }, Math.random() * 4000);
    });

    const interval = setInterval(() => {
      countdown--;
      this.io.emit('gameCountdown', countdown);
      
      if (countdown <= 0) {
        clearInterval(interval);
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
      // Formula: m = e^(rt) — 0.0002 reaches 2x in ~3.5s, feels like real Aviator
      this.multiplier = Math.max(1.0, Math.pow(Math.E, 0.0002 * elapsed));
      
      // Process bot cashouts
      this.bots.forEach(bot => {
        if (this.multiplier >= bot.targetMultiplier) {
          this.cashOut(bot.username, 1);
        }
      });

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
      players: Array.from(this.players.entries()).map(([id, p]) => p),
      serverSeed: this.serverSeed
    });
    
    setTimeout(() => {
      this.startWaitingPhase();
    }, 3000);
  }

  placeBet(username, amount, panelId = 1) {
    if (this.status !== 'WAITING') return false;
    
    const key = `${username}-${panelId}`;
    this.players.set(key, {
      username,
      betAmount: amount,
      cashedOut: false,
      winnings: 0,
      panelId
    });
    
    this.io.emit('playersUpdate', Array.from(this.players.values()));
    return true;
  }

  cashOut(username, panelId = 1) {
    if (this.status !== 'IN_PROGRESS') return false;
    
    const key = `${username}-${panelId}`;
    const player = this.players.get(key);
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
      history: this.history,
      serverHash: this.serverHash,
      serverSeed: this.status === 'CRASHED' ? this.serverSeed : null
    };
  }
}

export default GameState;
