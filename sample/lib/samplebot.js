var SampleBot = function(client) {
  this.client  = client;
  this.admins  = ['yourname'];
  this.balance = 0;

  // This should be a mapping of your commands
  this.commands = {
    '!help': this.printHelp,
    '!roll': this.rollDice
  };

  // It is a good practice to seperate admin
  // commands from normal commands by using
  // another prefix
  this.adminCommands = {
    '!#shutdown': this.shutdown
  };

  this.helpText = "Here goes your helptext";
};

/**
 * Prints out the help when !help is messaged
 */
SampleBot.prototype.printHelp = function(msg) {
  this.client.pushMessage(msg.room, msg.user+": "+this.helpText);
  return false;
};

/**
 * Handles all incoming messages
 */
SampleBot.prototype.handleMessage = function(msg) {
  // First lets check if we're an admin
  var admin = (this.admins.indexOf(msg.user.toLowerCase) != -1)

  // Lets see if the message is a tip
  if (msg.isTip) {
    // ok, we don't need to actually do more here.
    this.balance = msg.tipAmount;
    this.client.pushMessage(msg.room, msg.user+': Thank you for your tip. Your contribution is greatly welcomed!');
    return false;
  }

  // msg params 0 contains the first word in lowercase
  // so we check with that if a command is given.
  if (typeof this.commands[msg.params[0]] == 'function') {
    return this.commands[msg.params[0]].call(this, msg);
  }

  // Then finally we check if it was an admin command
  if (admin && typeof this.adminCommands[msg.params[0]] == 'function') {
    return this.adminCommands[msg.params[0]].call(this, msg);
  }
};

SampleBot.prototype.rollDice = function(msg) {
  var nrDice = Number(msg.params[1]) || 1,
      sides  = Number(msg.params[2]) || 6,
      rolls  = [];

  for (var i=0; i<nrDice; i++) {
    rolls.push(1+Math.floor(Math.random()*sides));
  }

  this.client.pushMessage(msg.room, msg.user+": You rolled "+nrDice+"D"+sides+" and got " + rolls.reduce(function(pv, cv) { return pv + cv; }, 0) + ". "+rolls.join(', '));
}

SampleBot.prototype.shutdown = function(msg) {
  console.log('shutting down..');
  process.exit();
  return false;
};

module.exports = SampleBot;