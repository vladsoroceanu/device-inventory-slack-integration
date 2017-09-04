'use strict'

// import third-party modules
const path = require('path'),
  http = require('http'),
  express = require('express'),
  debug = require('debug')('device-management-app:server'),
  bodyParser = require('body-parser')


// get config, routes and set port
const index = require('./routes/index'),
  port = normalizePort(process.env.PORT || 5998)

// set up express app
const app = express()
app.set('port', port)

// set up http server
const server = http.createServer(app)
server.listen(port)
server.on('error', onError)
server.on('listening', onListening)

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error
  }
  let bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port
  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges')
      process.exit(1)
      break
    case 'EADDRINUSE':
      console.error(bind + ' is already in use')
      process.exit(1)
      break
    default:
      throw error
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
  var addr = server.address()
  var bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port
  debug('Listening on ' + bind)
}


// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'hbs')
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
// set static file folder
app.use(express.static(path.join(__dirname, 'public')))
// routes
app.use('/', index)



// catch 404 and forward to error handler
app.use((req, res, next) => {
  var err = new Error('Not Found')
  err.status = 404
  next(err)
})
// error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).send(err.message)
})


// export module
module.exports = app


// PRIVATE FUNCTIONS
/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
  var port = parseInt(val, 10)
  if (isNaN(port)) return val
  if (port >= 0) return port
  return false
}