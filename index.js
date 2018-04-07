// import api deps
require('dotenv').config();

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
  // handle clients connecting
  sockets[socket.id] = socket;
  io.emit('log message', 'client connected');
  console.log("Total clients connected : " + Object.keys(sockets).length);

  // handle clients disconnecting
  socket.on('disconnect', function() {
    delete sockets[socket.id];
    console.log('user disconnected');
  });

  // handle messages
  socket.on('log message', function(msg) {
    console.log('message: ' + msg);

    // handle robot online/offline
    if (msg === 'robot online' || msg === 'robot offline') {
      io.emit('log message', msg);
    }
  });

  // handle robot status
  socket.on('robot status', function(msg) {
    console.log('robot status: ' + msg);

    io.emit('robot status', msg);
  });

  // handle gpio control
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

// start listening on a port
http.listen(process.env.PORT, function() {
  console.log('listening on *:' + process.env.PORT);
});
