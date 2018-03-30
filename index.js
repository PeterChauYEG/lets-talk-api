// import api deps
// var express = require('express');
// var app = express();
// var streamApp = express();
// var http = require('http').Server(app);
var http = require('http')
// var streamHttp = require('http').Server(app);
// var httpRequest = require('http');
// var request = require('request');
// var io = require('socket.io')(http);
// var streamIO = require('socket.io').listen(8081);
// var ss = require('socket.io-stream');
var path = require('path');
var fs = require('fs')
//
// // setup hardware api
// var sockets = {};
//
// // endpoint that requests video stream from robot
// // then responds to client request with the stream
// // listen for a request for our video stream
// streamIO.on('connection', function (socket) {
//   console.log('here')
//   var stream = ss.createStream()
//   var filename = 'test.png'
//
//   ss(socket).emit('stream', stream, {name: filename})
//   fs.createReadStream(filename).pipe(stream)
//   console.log('done')
// })

var server = http.createServer(function(req, res) {
  var stream = fs.createReadStream(__dirname + '/test.png')
  stream.pipe(res)
})

server.listen(8081)

//
// // Handle socket events
// io.emit('log message', 'api ready');
// console.log('api ready');
//
// // client connection
// io.on('connection', function(socket) {
//
//   // log total clients connected
//   sockets[socket.id] = socket;
//   console.log("Total clients connected : " + Object.keys(sockets).length);
//
//   // log user connections
//   io.emit('log message', 'a user has connected');
//   console.log('a user connected');
//
//   // client disconnection
//   socket.on('disconnect', function() {
//     delete sockets[socket.id];
//
//     io.emit('log message', 'a user has disconnected');
//     console.log('user disconnected');
//   });
//
//   // log message to client
//   socket.on('log message', function(msg) {
//     io.emit('log message', msg);
//     console.log('message: ' + msg);
//   });
//
//   // handle gpio
//   socket.on('gpio', function(msg) {
//     io.emit('gpio', msg);
//     console.log('gpio: ' + msg);
//   });
// })
//
// // start listening on port 8080 for main service
// http.listen(8080, function() {
//   console.log('listening on *:8080');
// });

// start listening on port 8081 for stream service
// streamApp.listen(8081, function() {
//   console.log('listening on *:8081');
// });
