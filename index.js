// import api deps
require('dotenv').config()

var express = require('express')
var app = express()
var http = require('http').Server(app)
var io = require('socket.io')(http)
var path = require('path')

// Globals
// Web Sockets
var sockets = {}

// Robot
var robot = {
  status: 'offline'
}

// Race
var race = {
  queue: [],
  time: 0,
  timer: undefined
}

console.log('api ready')

// client connection
io.on('connection', function (socket) {
  // handle clients connecting
  sockets[socket.id] = socket
  console.log('Total connections : ' + Object.keys(sockets).length)

  // handle clients disconnecting
  socket.on('disconnect', function () {
    const currentPilot = race.queue[0]

    // remove from sockets
    delete sockets[socket.id]

    // remove from robotQueue if present
    const clientId = socket.id
    let queuePosition = race.queue.indexOf(clientId)
    const inQueue = queuePosition !== -1
    if (inQueue) {
      race.queue.splice(queuePosition, 1)

      if (queuePosition === 0) {
        const nextPilot = race.queue[0]

        if (nextPilot) {
          const nextPilotSocket = sockets[race.queue[0]]
          nextPilotSocket.emit('queue', 0)
        }
      }
    }

    // check if the current pilot changed
    const nextPilot = race.queue[0]
    if (currentPilot !== nextPilot) {
      race.time = 0

      clearInterval(race.timer)

      // start the raceTime if there is a client in the robotQueue
      if (race.queue.length > 0) {
        race.timer = setInterval(function () {
          race.time += 1

          io.sockets.emit('race time', race.time)
        }, 1000)
      } else {
        io.sockets.emit('race time', race.time)
      }
    }

    console.log('Connection closed')
  })

  // handle client status
  socket.on('client status', function (msg) {
    console.log('message: ' + msg)
    io.emit('robot status', robot.status)
  })

  // handle robot status
  socket.on('robot status', function (msg) {
    robot.status = msg
    console.log('robot status: ' + robot.status)

    io.emit('robot status', robot.status)
  })

  // handle join queue
  socket.on('queue', function (msg) {
    const currentPilot = race.queue[0]

    // check if a client wants to join
    if (msg === 'join') {
      const clientId = socket.id
      let queuePosition = race.queue.indexOf(clientId)
      const inQueue = queuePosition !== -1

      // check if client is in queue
      if (!inQueue) {
        // add user to queue and update queuePosition
        race.queue.push(clientId)
        queuePosition = race.queue.length - 1
        console.log('client joined queue: ' + queuePosition)
      }

      socket.emit('queue', queuePosition)
    }

    // check if a client wants to leave a queue
    if (msg === 'leave') {
      // remove from robotQueue if present
      const clientId = socket.id
      let queuePosition = race.queue.indexOf(clientId)
      const inQueue = queuePosition !== -1
      if (inQueue) {
        race.queue.splice(queuePosition, 1)

        if (queuePosition === 0) {
          const nextPilot = race.queue[0]

          if (nextPilot) {
            const nextPilotSocket = sockets[race.queue[0]]
            nextPilotSocket.emit('queue', 0)
          }
        }
      }
    }

    // check if the current pilot changed
    const nextPilot = race.queue[0]
    if (currentPilot !== nextPilot) {
      race.time = 0

      clearInterval(race.timer)

      // start the raceTime if there is a client in the robotQueue
      if (race.queue.length > 0) {
        race.timer = setInterval(function () {
          race.time += 1

          io.sockets.emit('race time', race.time)
        }, 1000)
      } else {
        io.sockets.emit('race time', race.time)
      }
    }
  })

  // handle gpio control
  socket.on('gpio', function (msg) {
    // check if this client is the current pilot
    const clientId = socket.id
    const currentPilot = race.queue[0]

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
