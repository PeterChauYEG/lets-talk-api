// import api deps
var express = require('express');
var app = express();
// var streamApp = express();
var http = require('http').Server(app);
// var streamHttp = require('http');
// var http = require('http');
var io = require('socket.io')(http);
// var ss = require('socket.io-stream');
// var fs = require('fs');
// var path = require('path');

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

  // handle stream
  socket.on('start-stream', function(msg) {
    io.emit('log message', 'starting video stream');
    console.log('starting video stream');
    startStream(io)
  });
})

// start listening on port 8080 for main service
http.listen(8080, function() {
  console.log('listening on *:8080');
});

// io.on('connection', function (socket) {
//   http.get('http://192.168.0.22:9090/test.mjpeg', function (robotRes) {
//     var data = '';
//
//     // a chunk of data has been recieved
//     robotRes.on('data', function (chunk) {
//       var stream = ss.createStream();
//
//       stream.write(new Blob(chunk))
//
//       ss(socket).emit('stream', stream, { name: 'stream' })
//     })
//
//     // the whole response has been received
//     robotRes.on('end', function () {
//       console.log(data)
//     })
//   }).on('error', function (err) {
//     console.log('error:' + err.message)
//   })
// })

// start listening on port 8081 for stream service
// streamApp.listen(8080, function() {
//   console.log('listening on *:8081');
// });

// function startStream(io) {
//   console.log('start stream')
// }
