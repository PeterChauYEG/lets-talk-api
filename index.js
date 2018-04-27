import dotenv from 'dotenv'
import express from 'express'
import { Server } from 'http'
import path from 'path'
import io from 'socket.io'
import passport from 'passport'
import bodyParser from 'body-parser'
import mongoose from 'mongoose'

// lib
import {
  addSocketConnection,
  handleClientStatus,
  handleDisconnect,
  handleGPIO,
  handleQueue,
  handleRobotStatus
} from './lib/functions'

var Strategy = require('passport-local').Strategy

// ================ Initialization
// Initialize environment variables
dotenv.config()

// Connect to the database
mongoose.connect(process.env.MONGODB)

// define a schema
var Schema = mongoose.Schema

var UsersSchema = new Schema({
    name: String,
    data: Date
})

// Compile mode from schema
var Users = mongoose.model('Users', UsersSchema)

// Seed the db by creating a model instance, then saving it
var first_user = new Users({ name: 'test' })
first_user.save(function(error) {
  if (error) {
    console.log(error)
    return
  }
})

// Find users
Users.find(function (error, users) {
  if (error) {
    console.log(error)
    return
  }

  console.log(users)
  return
})

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
  defaultTime: 60 * 5,
  time: 60 * 5,
  timer: undefined
}

var sockets = {}

// ================ Middleware
// passport setup
passport.use(new Strategy(
  {
    usernameField: 'username',
    passwordField: 'password',
    session: false
  },
  function(username, password, cb) {
    console.log('here')
    return cb(null, 'done')
  }
))

// Configure passport authenticated session persistence
passport.serializeUser(function(user, cb) {
  cb(null, 's')
})

passport.deserializeUser(function(id, cb) {
  cb(null, 's')
})

// serve the ui
api.use(express.static(paths.build))

// use body parser
api.use(bodyParser.json())

// Initialize passport
api.use(passport.initialize())

// restore session if there is one
api.use(passport.session())

// ================ Routes
api.get('/', function (req, res) {
  res.sendFile(paths.ui)
})

api.post('/login', passport.authenticate('local'), function (req, res) {
  console.log(req.body)

  // called if auth was successful
  // req.user contains the authenticated user
  console.log(req.user)
  res.json('/')
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
