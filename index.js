// import api deps
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs')
var path = require('path')

// counter
var sockets = {};

// Handle socket events
io.emit('log message', 'api ready');
console.log('api ready');

// client connection
io.on('connection', function(socket) {

  // log total clients connected
  sockets[socket.id] = socket;
  console.log("Total clients connected : " + Object.keys(sockets).length);

  // client disconnection
  socket.on('disconnect', function() {
    delete sockets[socket.id];
    console.log('user disconnected');
  });

  // log message from client
  socket.on('log message', function(msg) {
    io.emit('log message', 'client connected');
    console.log('message: ' + msg);
  });

  // handle gpio
  socket.on('gpio', function(msg) {
    io.emit('gpio', msg);
    console.log('gpio: ' + msg);
  });
})

// serve the ui
app.use(express.static(path.join(__dirname, '../ui/build')))

app.get('/', function (req, res) {
  const ui = __dirname + '../ui/build/index.html'
  res.sendFile(ui)
})

// start listening on port 8080
http.listen(8080, function() {
  console.log('listening on *:8080');
});
