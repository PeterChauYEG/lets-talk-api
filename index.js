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
// socket connection
socketIO.on('connection', function (socket) {
  // handle socket connecting
  sockets = addSocketConnection(socket, sockets)

  // handle client status
  socket.on('client status', status => {
    handleClientStatus(robot, status, socket)
  })

  // handle robot status
  socket.on('robot status', status => {
    robot = handleRobotStatus(robot, status, socketIO)
  })

  // handle gpio control
  socket.on('gpio', direction => {
    handleGPIO(direction, race, socket, socketIO)
  })

  // handles race queue
  socket.on('queue', msg => {
    race = handleQueue(msg, race, socket, sockets, socketIO)
  })

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
})

// ================ Functions
// adds new socket connections to the sockets counter and reports the current
// number of connections
const addSocketConnection = (socket, sockets) => {
  sockets[socket.id] = socket
  console.log('Total connections : ' + Object.keys(sockets).length)

  return sockets
}

// allows this socket GPIO control if it is the current pilot and sends the
// GPIO command to all sockets
const handleGPIO = (direction, race, socket, socketIO) => {
  const socketId = socket.id
  const currentPilot = race.queue[0]

  if (socketId !== currentPilot) {
    return
  }

  socketIO.emit('gpio', direction)
  console.log('GPIO: ' + direction)
}

// reports the robot's status to this socket
const handleClientStatus = (robot, status, socket) => {
  console.log('Client Status: ' + status)
  socket.emit('robot status', robot.status)
}

const handleQueue = (msg, race, socket, sockets, socketIO) => {
  const currentPilot = race.queue[0]
  const socketId = socket.id

  // get the position of this socket in the queue
  let socketQueuePosition = race.queue.indexOf(socketId)
  const inQueue = socketQueuePosition !== -1

  // check if this socket wants to join the queue
  if (msg === 'join') {
    // check if this socket is in the queue
    if (!inQueue) {
      // add user to queue and update queuePosition
      race.queue.push(socketId)

      // report the queue position of this socket
      socketQueuePosition = race.queue.length - 1
      console.log('client joined queue: ' + socketQueuePosition)
    }

    // report the current queue position of this socket
    socket.emit('queue', socketQueuePosition)
  }

  // check if a client wants to leave a queue
  if (msg === 'leave') {
    // check if this socket is in the queue
    if (inQueue) {
      // remove this socket from the queue
      race.queue.splice(socketQueuePosition, 1)

      // check if this socket was the current pilot
      if (socketQueuePosition === 0) {
        // get the socket id of the next pilot
        const nextPilot = race.queue[0]

        // check if there is a socket
        if (nextPilot) {
          // get the socket of the next pilot
          const nextPilotSocket = sockets[race.queue[0]]

          // report to them that they are the new pilot
          nextPilotSocket.emit('queue', 0)
          console.log('New pilot')
        }
      }
    }
  }

  // grab the next pilot
  const nextPilot = race.queue[0]

  // check if the current pilot changed
  if (currentPilot !== nextPilot) {
    // reset race time
    race.time = 0

    // stop the timer
    clearInterval(race.timer)

    // check if there is a pilot in queue
    if (race.queue.length > 0) {
      // start the race timer
      race.timer = setInterval(function () {
        // increment the time
        race.time += 1

        // report to all sockets the current race time
        socketIO.sockets.emit('race time', race.time)
      }, 1000)
    } else {
      // report to all sockets the current race time
      socketIO.sockets.emit('race time', race.time)
    }
  }

  return race
}

// updates the robot's status and reports it to all sockets
const handleRobotStatus = (robot, status, socketIO) => {
  robot.status = status
  console.log('Robot Status: ' + robot.status)

  socketIO.emit('robot status', robot.status)

  return robot
}
