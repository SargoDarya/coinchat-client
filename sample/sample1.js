var CoinChatClient = require('coinchat-client');

client = new CoinChatClient({
  username: 'foo',
  password: 'bar'
});

// Register a simple message handler
client.register(function(msg) {
  console.log(msg);
});

// Connect to server and join botgames
client.connect(function() {
  console.log('Connected to server');
  client.join('botgames');
});

// When Ctrl+C is pressed, exit gracefully
process.on('SIGINT', function() {
  console.log("Quitting...")
  client.disconnect();
  process.exit();
})