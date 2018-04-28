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
    username: String,
    password: String
})

// Compile mode from schema
var Users = mongoose.model('Users', UsersSchema)

// Seed the db by creating a model instance, then saving it
var first_user = new Users({ username: 'test', password: 'test' })

first_user.save(function(error) {
  if (error) {
    console.log(error)
    return
  }
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
    // Find users
    Users.find({ username: username }, function (error, users) {
      if (error) {
        console.log(error)
        return
      }

      if (users.length < 1) {
        return cb(null, false)
      }

      if (users[0].password != password) {
        return cb(null, false)
      }

      return cb(null, users[0])
    })
  }
))

// Configure passport authenticated session persistence
passport.serializeUser(function(user, cb) {
  cb(null, user._id)
})

passport.deserializeUser(function(id, cb) {
  // Find users by id
  Users.find({ _id: id }, function (error, users) {
    if (error) {
      return cb(err)
    }

    if (users.length < 1) {
      return cb(err)
    }

    return cb(null, users[0])
  })
})

// serve the ui
api.use(express.static(paths.build))

// use body parser
api.use(bodyParser.json())

// Initialize passport
api.use(passport.initialize())

// restore session if there is one
// api.use(passport.session())

// ================ Routes
api.get('/', function (req, res) {
  res.sendFile(paths.ui)
})

api.post('/login', passport.authenticate('local'), function (req, res) {
  // called if auth was successful
  res.json()
})

api.get('/logout', function (req, res) {
  req.logout()
  res.json()
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
