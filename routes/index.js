'use strict'

const root = process.cwd() + '/',
    config = require(root + 'config.json'),
    devicesList = require(root + 'assets/devices.json')

module.exports = function (server) {
    // Add the route
    server.route({
        method: 'POST',
        path: '/devices',
        handler: (request, reply) => {
            console.log(request.payload)
            if (!request.payload || request.payload.token !== config.verificationToken) {
                reply('').code(400)
            } else {
                let resp
                switch (request.payload.text) {

                    case '?':
                        resp = '*We will display help regarding checkin-out and checking-in devices*'
                        break

                    default:
                        resp = createDeviceActionList()
                }
                reply(resp)
            }
        }
    })

    function createDeviceActionList() {
        let response = {
            text: '*Kingfisher Test Devices*',
            attachments: [
                {
                    fields: [
                        {
                            title: 'available',
                            short: true
                        },
                        {
                            title: 'in use',
                            short: true
                        }
                    ]
                }
            ]
        },
            availableCount = 0,
            inUseCount = 0

        for (let a in devicesList) {
            let device = devicesList[a]
            // following condition will trigger if the device is checked out
            if (device.currentCheckout) {
                inUseCount++
                response.attachments.push({
                    title: a,
                    callback_id: `device_callback_${a}`,
                    color: 'red',
                    attachment_type: 'default'
                })
            }
            // otherwise the device is available
            else {
                availableCount++
                response.attachments.push({
                    title: a,
                    callback_id: `device_callback_${a}`,
                    color: '#3AA3E3',
                    attachment_type: 'default',
                    actions: [
                        {
                            name: "book",
                            text: "Book",
                            type: "button",
                            value: "book"
                        }
                    ]
                })
            }
        }


        // attach the avaible vs. inUse metrics
        response.attachments[0].fields[0].value = availableCount
        response.attachments[0].fields[1].value = inUseCount


        return response
    }


    // Route set up for testing purposes
    server.route({
        method: 'POST',
        path: '/test',
        handler: (request, reply) => {
            reply({
                text: 'It\'s 80 degrees right now.',
                attachments: [
                    {
                        text: 'Partly cloudy today and tomorrow'
                    }
                ]
            })
        }
    })
}