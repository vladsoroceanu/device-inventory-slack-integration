'use strict'

var Hapi = require('hapi')
var port = process.env.PORT || 3000

// Create a server with a host and port
var server = new Hapi.Server()
server.connection({
    port: port
})

// Add routes
require('./routes')(server)

// Start the server
server.start((err) => {
    if (err) {
        throw err
    }
    console.log('Kingfisher Test Devices API running at:', server.info.uri)
})