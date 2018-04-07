// import api deps
require('dotenv').config()

var express = require('express')
var app = express()
var http = require('http').Server(app)
var io = require('socket.io')(http)
var path = require('path')

// counter
var sockets = {}
var robotStatus = 'offline'

console.log('api ready')

// client connection
io.on('connection', function (socket) {
  // handle clients connecting
  sockets[socket.id] = socket
  console.log('Total connections : ' + Object.keys(sockets).length)

  // handle clients disconnecting
  socket.on('disconnect', function () {
    delete sockets[socket.id]
    console.log('Connection closed')
  })

  // handle client status
  socket.on('client status', function (msg) {
    console.log('message: ' + msg)
    io.emit('robot status', robotStatus)
  })

  // handle robot status
  socket.on('robot status', function (msg) {
    robotStatus = msg
    console.log('robot status: ' + robotStatus)

    io.emit('robot status', robotStatus)
  })

  // handle gpio control
  socket.on('gpio', function (msg) {
    io.emit('gpio', msg)
    console.log('gpio: ' + msg)
  })
})

// serve the ui
app.use(express.static(path.join(__dirname, '../ui/build')))

app.get('/', function (req, res) {
  const ui = path.join(__dirname, '../ui/build/index.html')
  res.sendFile(ui)
})

// start listening on a port
http.listen(process.env.PORT, function () {
  console.log('listening on *:' + process.env.PORT)
})
