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
var robotQueue = []

console.log('api ready')

// client connection
io.on('connection', function (socket) {
  // handle clients connecting
  sockets[socket.id] = socket
  console.log('Total connections : ' + Object.keys(sockets).length)

  // handle clients disconnecting
  socket.on('disconnect', function () {
    // remove from sockets
    delete sockets[socket.id]

    // remove from robotQueue if present
    const clientId = socket.id
    let queuePosition = robotQueue.indexOf(clientId)
    const inQueue = queuePosition !== -1
    if (inQueue) {
      robotQueue.splice(queuePosition, 1)

      if (queuePosition === 0) {
        const nextPilot = robotQueue[0]

        if (nextPilot) {
          const nextPilotSocket = sockets[robotQueue[0]]
          nextPilotSocket.emit('queue', 0)
        }
      }
    }

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

  // handle join queue
  socket.on('queue', function (msg) {
    // check if a client wants to join
    if (msg === 'join') {
      const clientId = socket.id
      let queuePosition = robotQueue.indexOf(clientId)
      const inQueue = queuePosition !== -1

      // check if client is in queue
      if (!inQueue) {
        // add user to queue and update queuePosition
        robotQueue.push(clientId)
        queuePosition = robotQueue.length - 1
        console.log('client joined queue: ' + queuePosition)
      }

      socket.emit('queue', queuePosition)
    }

    // check if a client wants to leave a queue
    if (msg === 'leave') {
      // remove from robotQueue if present
      const clientId = socket.id
      let queuePosition = robotQueue.indexOf(clientId)
      const inQueue = queuePosition !== -1
      if (inQueue) {
        robotQueue.splice(queuePosition, 1)

        if (queuePosition === 0) {
          const nextPilot = robotQueue[0]

          if (nextPilot) {
            const nextPilotSocket = sockets[robotQueue[0]]
            nextPilotSocket.emit('queue', 0)
          }
        }
      }
    }
  })

  // handle gpio control
  socket.on('gpio', function (msg) {
    // check if this client is the current pilot
    const clientId = socket.id
    const currentPilot = robotQueue[0]

    if (clientId === currentPilot) {
      io.emit('gpio', msg)
      console.log('gpio: ' + msg)
    }
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
