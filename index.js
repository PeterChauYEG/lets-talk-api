import dotenv from 'dotenv'
import express from 'express'
import { Server } from 'http'
import path from 'path'
import io from 'socket.io'

// lib
import {
  addSocketConnection,
  handleClientStatus,
  handleDisconnect,
  handleGPIO,
  handleQueue,
  handleRobotStatus
} from './lib/functions'

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
  threshold: 10,
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
  socket.on('disconnect', () => {
    const result = handleDisconnect(race, socket, sockets, socketIO)

    race = result.race
    sockets = result.sockets
  })
})
