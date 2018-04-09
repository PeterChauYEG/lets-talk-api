import dotenv from 'dotenv'
import express from 'express'
import { Server } from 'http'
import path from 'path'
import io from 'socket.io'

// ================ Initialization
// Initialize environment variables
dotenv.config()

// Initialize api
var api = express()
var http = Server(api)

// Initialize web sockets
var socketIO = io(http)

// ================ Globals Variables
var paths = {
  build: path.join(__dirname, '../ui/build'),
  ui: path.join(__dirname, '../ui/build/index.html')
}

var robot = {
  status: 'offline'
}

var race = {
  queue: [],
  time: 0,
  timer: undefined
}

var sockets = {}

// ================ Middleware
// serve the ui
api.use(express.static(paths.build))

// ================ Routes
api.get('/', function (req, res) {
  res.sendFile(paths.ui)
})

// ================ Serve API
http.listen(process.env.PORT, function () {
  console.log('Listening on port: ' + process.env.PORT)
})

// ================ Web Sockets
// client connection
socketIO.on('connection', function (socket) {
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

          socketIO.sockets.emit('race time', race.time)
        }, 1000)
      } else {
        socketIO.sockets.emit('race time', race.time)
      }
    }

    console.log('Connection closed')
  })

  // handle client status
  socket.on('client status', function (msg) {
    console.log('message: ' + msg)
    socketIO.emit('robot status', robot.status)
  })

  // handle robot status
  socket.on('robot status', function (msg) {
    robot.status = msg
    console.log('robot status: ' + robot.status)

    socketIO.emit('robot status', robot.status)
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

          socketIO.sockets.emit('race time', race.time)
        }, 1000)
      } else {
        socketIO.sockets.emit('race time', race.time)
      }
    }
  })

  // handle gpio control
  socket.on('gpio', function (msg) {
    // check if this client is the current pilot
    const clientId = socket.id
    const currentPilot = race.queue[0]

    if (clientId === currentPilot) {
      socketIO.emit('gpio', msg)
      console.log('gpio: ' + msg)
    }
  })
})
