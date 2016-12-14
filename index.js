var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');

var five = require('johnny-five');
var raspi = require('./raspi');

var gpio = require('./gpio');
var camera = require('./camera.js');

const LED = gpio.LED;
const drivetrain = gpio.drivetrain;

// Create board with gpio
const board = new five.Board({
    io: new raspi()
});

var sockets = {};

app.use('/', express.static(path.join(__dirname, 'stream')));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {
    sockets[socket.id] = socket;
    console.log("Total clients connected : " + Object.keys(sockets).length);

    io.emit('log message', 'a user has connected');
    console.log('a user connected');

    socket.on('disconnect', function() {
        delete sockets[socket.id];

        io.emit('log message', 'a user has disconnected');
        console.log('user disconnected');

        // if no more sockets, kill the stream
        if (Object.keys(sockets).length == 0) {
            app.set('watchingFile', false);
            camera.stopStreaming();
        }
    });

    socket.on('start-stream', function() {
        io.emit('log message', 'starting video streat');

        if (app.get('watchingFile')) {
            io.sockets.emit('liveStream', 'image_stream.jpg?=' + (Math.random() * 100000));
        }
        else {
            camera.startStreaming(io);
            app.set('watchingFile', true);
        }

    });

    socket.on('log message', function(msg) {
        console.log('message: ' + msg);
        io.emit('log message', msg);
    })

    socket.on('gpio', function(req) {
        if (req == 'initialize') {
            // Initialize board
            board.on('ready', function() {

                // initialize motors
                gpio.setdrivetrain(drivetrain, 1, 1);
                gpio.setdrivetrain(drivetrain, 0, 0);

                // Set Software state LED to "board-ready"
                gpio.setLED(LED, 'board-ready');

                // Set Software state LED to "error connecting-to-server"
                gpio.setLED(LED, 'error-connecting-to-server');

                // Set Software state LED to "connected-to-server"
                gpio.setLED(LED, 'connected-to-server');

                // gpiO.setdrivetrain(drivetrain, AIN, BIN);
                gpio.setLED(LED, 'board-response');

                gpio.setLED(LED, 'reconnected-to-server');
                gpio.setLED(LED, 'server-pipe');

                // Handle board shutdown
                board.on('warn', function(event) {
                    console.log(event.message + '...');
                    if (event.message === 'Closing.') {

                        // Turn off motors
                        console.log('shutting down board...');
                        gpio.setdrivetrain(drivetrain, 0, 0);

                        // Set Software state LED to "board-off"
                        console.log('talk to you later bae <3');
                        gpio.setLED(LED, 'board-off');
                    }
                });
            });
        }

        if (req == 'shutdown') {
            // if no more sockets, kill the stream
            if (Object.keys(sockets).length == 0) {

                // Turn off motors
                console.log('shutting down board...');
                gpio.setdrivetrain(drivetrain, 0, 0);

                // Set Software state LED to "board-off"
                console.log('talk to you later bae <3');
                gpio.setLED(LED, 'board-off');
            }
        }

    })
})

http.listen(8080, function() {
    console.log('listening on *:8080');
});