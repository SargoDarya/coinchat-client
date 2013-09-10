var CoinChatClient = require('../lib/coinchat-client'),
    SampleBot = require('./lib/samplebot.js'),
    client, bot;

client = new CoinChatClient({
  username: 'foo',
  password: 'bar'
});

bot = new SampleBot(client);

// Connect to server and join botgames
console.log('Connecting...');
client.connect(function() {
  console.log('Logging in...');
  // after that we need to login
  try {
    client.login(function() {
      console.log('Joining room');

      // now we join a room
      client.join('throwingdice');

      // and after an initial delay to ignore all old messages
      // we register our message handler alias bot
      setTimeout(function() {
        client.register(bot);
      }, 3000);
    });
  } catch (e) {
    // client login may throw an exception caused by invalid credentials
    console.log(e);
  }
});

// When Ctrl+C is pressed, exit gracefully
process.on('SIGINT', function() {
  console.log("Quitting...")
  client.disconnect();
  process.exit();
})