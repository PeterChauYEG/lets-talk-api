// ================ Functions
// adds new socket connections to the sockets counter and reports the current
// number of connections
export const addSocketConnection = (socket, sockets) => {
  sockets[socket.id] = socket
  console.log('Total connections : ' + Object.keys(sockets).length)

  return sockets
}

// reports the robot's status to this socket
export const handleClientStatus = (robot, status, socket) => {
  console.log('Client Status: ' + status)
  socket.emit('robot status', robot.status)
}

export const handleDisconnect = (race, socket, sockets, socketIO) => {
  const currentPilot = race.queue[0]
  const socketId = socket.id

  // get the position of this socket in the queue
  let socketQueuePosition = race.queue.indexOf(socketId)
  const inQueue = socketQueuePosition !== -1

  // remove this socket from sockets
  delete sockets[socket.id]

  // remove this socket from queue if it's in it and switch pilots if required
  race = handleLeaveQueue(inQueue, race, socket, socketQueuePosition, sockets)

  // reset the race timer
  race = resetTimer(currentPilot, race, sockets, socketIO)

  console.log('Connection closed')
  return { race, sockets }
}

// allows this socket GPIO control if it is the current pilot and sends the
// GPIO command to all sockets
export const handleGPIO = (direction, race, socket, socketIO) => {
  const socketId = socket.id
  const currentPilot = race.queue[0]

  if (socketId !== currentPilot) {
    return
  }

  socketIO.emit('gpio', direction)
  console.log('GPIO: ' + direction)
}

const handleJoinQueue = (
  inQueue,
  race,
  socket,
  socketQueuePosition,
  socketId
) => {
  // check if this socket is in the queue
  if (!inQueue) {
    // add user to queue and update queuePosition
    race.queue.push(socketId)

    // report the queue position of this socket
    socketQueuePosition = race.queue.length - 1
    console.log('Client joined queue: ' + socketQueuePosition)
  }

  // report the current queue position of this socket
  socket.emit('queue', socketQueuePosition)

  return race
}

const handleLeaveQueue = (inQueue, race, socket, socketQueuePosition, sockets) => {
  // check if this socket is in the queue
  if (inQueue) {
    // remove this socket from the queue
    race.queue.splice(socketQueuePosition, 1)

    // report the current queue position of this socket
    socket.emit('queue', 'Not in queue')

    console.log('Client left queue')

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

  return race
}

export const handleQueue = (msg, race, socket, sockets, socketIO) => {
  const currentPilot = race.queue[0]
  const socketId = socket.id

  // get the position of this socket in the queue
  let socketQueuePosition = race.queue.indexOf(socketId)
  const inQueue = socketQueuePosition !== -1

  // check if this socket wants to join the queue
  if (msg === 'join') {
    race = handleJoinQueue(inQueue, race, socket, socketQueuePosition, socketId)
  }

  // check if a client wants to leave a queue
  if (msg === 'leave') {
    // remove this socket from queue if it's in it and switch pilots if required
    race = handleLeaveQueue(inQueue, race, socket, socketQueuePosition, sockets)
  }

  // reset the race timer
  race = resetTimer(currentPilot, race, sockets, socketIO)

  return race
}

// updates the robot's status and reports it to all sockets
export const handleRobotStatus = (robot, status, socketIO) => {
  robot.status = status
  console.log('Robot Status: ' + robot.status)

  socketIO.emit('robot status', robot.status)

  return robot
}

// kicks the current pilot
const kickCurrentPilot = (race, sockets, socketIO) => {
  // get the current pilot
  const currentPilot = race.queue[0]

  // get the currentPilot's socket
  const currentPilotSocket = sockets[currentPilot]

  // remove the current pilot from the queue
  race.queue.splice(0, 1)

  // report the current queue position of this socket
  currentPilotSocket.emit('queue', 'Not in queue')

  // get the socket id of the next pilot
  const nextPilot = race.queue[0]

  // check if there is a socket
  if (nextPilot) {
    // get the socket of the next pilot
    const nextPilotSocket = sockets[nextPilot]

    // report to them that they are the new pilot
    nextPilotSocket.emit('queue', 0)
    console.log('New pilot')

    // check if there is a pilot in queue
    if (race.queue.length > 0) {
      // start the race timer
      setTimer(race, sockets, socketIO)
      race.time = 0
    } else {
      // report to all sockets the current race time
      socketIO.sockets.emit('race time', race.time)
    }
  }
}

const resetTimer = (currentPilot, race, sockets, socketIO) => {
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
      setTimer(race, sockets, socketIO)
      race.time = 0
    } else {
      // report to all sockets the current race time
      socketIO.sockets.emit('race time', race.time)
    }
  }
  return race
}

const setTimer = (race, sockets, socketIO) => {
  race.timer = setInterval(() => {
    // increment the time
    race.time += 1

    // report to all sockets the current race time
    socketIO.sockets.emit('race time', race.time)

    // check to see if the timer has hit the threshold
    if (race.time === race.threshold) {
      // stop the timer
      clearInterval(race.timer)

      // kick the curent pilot
      kickCurrentPilot(race, sockets, socketIO)
    }
  }, 1000)
}
