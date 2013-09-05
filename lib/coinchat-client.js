var io = require('socket.io-client');

/**
 * @class
 * @param {Object}     cfg           Configuration Object for the class.
 *
 * @property {Array}   outputBuffer    Contains all messages
 * @property {Object}  socket          The main connection socket
 * @property {Boolean} connected       Shows if there is an active connection
 * @property {Number}  messageHandle   Interval handle to the message pump
 * @property {String}  connectionURL   Holds the Connection URL to the host
 * @property {Object}  rooms           Holds all rooms the client is connected to
 * @property {Array}   colors          Contains all colors we have available
 * @property {Array}   messageHandlers Holds all registered message handlers
 * @property {String}  username        Used to store the username with which we connect
 * @property {String}  password        Used to store the password with which we connect
 * @property {String}  session         Used to store the session with which we connect
 * @property {Number}  logLevel        Regulates the log level output
 */
var CoinChatClient = function(cfg) {
  this.outputBuffer = [];
  this.socket = null;
  this.connected = false;
  this.messageHandle = null;
  this.connectionURL = "https://coinchat.org:443";
  this.rooms = {};
  this.colors = ['000'];
  this.messageHandlers = [];

  if(!cfg.username) {
    throw new Error("No Username given.");
  } else if (!cfg.session && !cfg.password) {
    throw new Error("No password or session given.");
  }

  this.username = cfg.username;
  this.password = cfg.password;
  this.session  = cfg.session;

  this.logLevel = cfg.logLevel || 0;
}

/**
 * Connects to the coinchat servers if not already connected
 * @param {Function} callback  (optional) Function to call when connection was successful.
 * @returns {Boolean}
 */
CoinChatClient.prototype.connect = function(callback) {
  if (this.connected)
    return false;
  
  this.socket = io.connect(this.connectionURL, {
    secure: true
  });
  
  this.socket.on('connect', function() {
    this.connected = true;
    
    this.addListeners();
    if(typeof callback == 'function') {
      callback();
    }
    
    this.pumpMessages();
  }.bind(this));
  
  return true;
};

/**
 * Disconnects when already connected to the host
 * and leaves every channel before disconnecting.
 * @returns {Boolean} True when connected, false when not connected
 */
CoinChatClient.prototype.disconnect = function() {
  if(!this.connected)
    return false;
  
  if(this.messageHandle) {
    clearInterval(this.messageHandle);
    this.messageHandle = null;
  }
  
  for (var k in this.rooms) {
    if (this.rooms[k]) {
      this.leave(k);
    }
  }
  
  this.connected = false;
  return true;
};

/**
 * Adds CoinChat event listeners. May be
 * extended in the future.
 * @private
 */
CoinChatClient.prototype.addListeners = function() {
  this.socket.on('chat', this.messageHandler.bind(this));
};

/**
 * Parses the messages and directs them further to
 * all other messageHandlers.
 * Should not be called directly.
 * @private
 */
CoinChatClient.prototype.messageHandler = function(data) {
  data.isTip = false;
  data.tipAmount = 0;
  
  if (contains(data.message, ["<span style=\"color: #"])) {
		data.message = data.message.split("\">")[1];
		data.message = data.message.replace("</span>", "");		
  } else if(contains(data.message, ["<span class='label label-success'>has tipped " + this.username])) {
		var amt = data.message.split("<span class='label label-success'>has tipped ")[1].split(" ")[1];
    data.isTip = true;
    data.tipAmount = Number(amt);
	}
  
	data.params = data.message.toLowerCase().trim().split(" ");
  
  for(var i=0; i<this.messageHandlers.length; i++) {
    switch(typeof this.messageHandlers[i]) {
      case 'object':
        this.messageHandlers[i].handleMessage(data);
        break;
        
      case 'function':
        this.messageHandlers[i](data);
        break;
    }
  }
};

/**
 * This sets up the message pump and is called automatically
 * on connect. You shall not call this yourself.
 * @private
 */
CoinChatClient.prototype.pumpMessages = function() {
  this.messageHandle = setInterval(function(){
    var m = this.outputBuffer[0];
    if(m) {
      if(m.tip) {
        this.s('tip', m);
      } else {
        this.s('chat', m);
      }
      this.outputBuffer.shift();
    }
  }.bind(this), 600);
};

/**
 * Logs in the user
 * @param {Function} callback (optional) Function to be called when successfully logged in
 */
CoinChatClient.prototype.login = function(callback) {
  if(this.password) {
    this.s('accounts', {
      action: "login",
      username: this.username,
      password: this.password
    });
  } else {
    this.s('accounts', {
      action: "login",
      session: this.session
    });
  }
  
  this.socket.on('loggedin', function() {
    if(typeof callback === 'function') {
      callback();
    }
  });
};

/**
 * Pushes a normal message to the output buffer
 * @param {String}  room     Name of the room to post message
 * @param {String}  message  Message which should be sent.
 * @param {String}  color    (Optional) color in which the message should appear.
 * @see CoinChatClient#colors
 * @return Boolean
 */
CoinChatClient.prototype.pushMessage = function(room, message, color) {
  if(typeof room === 'object') {
    message = room.message;
    color = room.color || "000";
    room = room.room;
  } else {
    color = color || "000";
  }

  if (!message || !room)
    return false;

  this.outputBuffer.push({
    message: message,
    room: room,
    color: color
  });

  return true;
};

/**
 * Pushes a tip to the output buffer
 * @param {String}  room     Name of the room to post tip to
 * @param {String}  user     Name of the user to post tip to
 * @param {Number}  tip      Amount to tip to the user
 * @param {String}  message  (Optional) message to post with tip
 * @return Boolean
 */
CoinChatClient.prototype.pushTip = function(room, user, tip, message) {
  if(typeof room === 'object') {
    message = room.message;
    tip = room.tip;
    user = room.user;
    room = room.room;
  }
  
  this.outputBuffer.push({
    room: room,
    user: user,
    tip: tip,
    message: message
  });

  return true;
};

/**
 * Join a room given by name if not already present in that room
 * @param {String} room   Name of the room to join
 * @returns {Boolean}
 */
CoinChatClient.prototype.join = function(room) {
  if(this.rooms[room]) {
    return false;
  }

  this.s('joinroom', { join: room });

  this.rooms[room] = true;
  return true;
};

/**
 * Leave a room given by name. Returns nothing because
 * we can always leave a room EVEN IF WE'RE NOT IN IT (d'oh!)
 * @param {String} room   Name of the room to leave
 */
CoinChatClient.prototype.leave = function(room) {
  this.s('quitroom', { room: room });

  this.rooms[room] = false;
};

/**
 * Shorthand to emit socket events if we
 * are already connected
 * @param {String}  evt  Name of the event to send
 * @param {Object}  obj  (optional) Object to send data with.
 * @returns {Boolean}
 */
CoinChatClient.prototype.s = function(evt, obj) {
  if(!evt || !this.connected)
    return false;

  this.socket.emit(evt, obj);
  return true;
};

/**
 * Registers a message handler for external plugins
 * Handler needs to have method handleMessage()
 * @param {Object|Function} handler A message handling object or function
 * @throws {InvalidTypeException} If given handler is not a function or object
 * @returns {Boolean}
 */
CoinChatClient.prototype.register = function(handler) {
  var handlerType = typeof handler;
  if (handlerType != 'object' && handlerType != 'function') {
    throw new InvalidTypeException('Not a valid message handler');
  }
  
  this.messageHandlers.push(handler);
  return true;
};

module.exports = CoinChatClient;


/**
 * Checks if given terms are found in string
 * @param {String} string The string to search in
 * @param {Array}  terms  The conditions to look for
 */
function contains(string, terms) {
  for (var i = 0; i < terms.length; i++) {
    if (string.toLowerCase().indexOf(terms[i].toLowerCase()) == -1) {
      return false;
    }
  }
  return true;
}


/**
 * Thrown when a different type was expected
 * @class
 * @param {String} message
 */
var InvalidTypeException = function(message) {
  this.name = "InvalidTypeException";
  this.message = message;
};

InvalidTypeException.prototype = Error.prototype;