// import api deps
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// setup hardware api
var sockets = {};

// Handle socket events
io.emit('log message', 'api ready');
console.log('api ready');

// client connection
io.on('connection', function(socket) {

  // log total clients connected
  sockets[socket.id] = socket;
  console.log("Total clients connected : " + Object.keys(sockets).length);

  // log user connections
  io.emit('log message', 'a user has connected');
  console.log('a user connected');

  // client disconnection
  socket.on('disconnect', function() {
    delete sockets[socket.id];

    io.emit('log message', 'a user has disconnected');
    console.log('user disconnected');
  });

  // log message to client
  socket.on('log message', function(msg) {
    io.emit('log message', msg);
    console.log('message: ' + msg);
  });

  // handle gpio
  socket.on('gpio', function(msg) {
    io.emit('gpio', msg);
    console.log('gpio: ' + msg);
  });
})

// start listening on port 8080 for main service
http.listen(8080, function() {
  console.log('listening on *:8080');
});
