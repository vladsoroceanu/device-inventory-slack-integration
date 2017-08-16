'use strict'

const root = process.cwd() + '/',
    fs = require('fs'),
    config = require(root + 'config.json'),
    deviceList = require(root + 'assets/devices.json')

module.exports = function (server) {
    // Add the route
    server.route({
        method: 'POST',
        path: '/devices',
        handler: (request, reply) => {
            if (!request.payload || request.payload.token !== config.verificationToken) {
                reply('Service temporarily unavailable').code(400)
            } else {
                let resp
                switch (request.payload.text) {
                    case '?':
                        resp = '*We will display help regarding checkin-out and checking-in devices*'
                        break

                    default:
                        resp = createDeviceActionList(request.payload)
                }
                reply(resp)
            }
        }
    })

    // This route will answer button clicks
    server.route({
        method: 'POST',
        path: '/buttons',
        handler: (request, reply) => {
            let payload = JSON.parse(request.payload.payload)
            if (!payload || payload.token !== config.verificationToken) {
                reply('Service temporarily unavailable').code(400)
            } else {
                let device = deviceList[payload.actions[0].value],
                    action = payload.actions[0].name,
                    resp = {}

                switch (action) {
                    case 'check_out':
                        // save current user  
                        device.currentCheckout = {
                            userId: payload.user.id,
                            username: payload.user.name,
                            outAt: new Date()
                        }
                        // set reply
                        resp.text = `Device ${device.title} booked.\nTake care of it! :smile:`
                        resp.delete_original = true
                        break

                    case 'check_in':
                        // save current user as the last user to check out the device
                        device.lastCheckout = {
                            userId: payload.user.id,
                            username: payload.user.name,
                            outAt: device.currentCheckout.outAt,
                            inAt: new Date()
                        }
                        // delete current user record
                        delete device.currentCheckout
                        // set reply
                        resp.text = `Device ${device.title} is checked back in. Cheers!`
                        resp.delete_original = true
                        break

                    default:
                        let checkout = device.currentCheckout || device.lastCheckout,
                            date = new Date(checkout.outAt)
                        resp.text = `${device.name} was last checked out by ${checkout.username} on ${date}`
                        // the following flag will tell Slack to not replace the printed list of devices with this message; the message will be
                        // displayed underneath the list
                        resp.replace_original = false
                }
                // write new device record to file
                fs.writeFile(root + 'assets/devices.json', JSON.stringify(deviceList), 'utf8', () => { })
                reply(resp)
            }
        }
    })

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



// private functions
function createDeviceActionList(payload) {
    let availableCount = 0,
        inUseCount = 0,
        response = {
            text: 'Below you can book or return any devices. Click on "Show Last Booking" to see who is the last person that booked the device.',
            attachments: [
                {
                    color: '#000000',
                    fields: [
                        {
                            title: 'Available',
                            short: true
                        },
                        {
                            title: 'In use',
                            short: true
                        }
                    ]
                }
            ]
        }

    for (let a in deviceList) {
        let device = deviceList[a],
            attachment = {
                title: device.name,
                text: `${device.type}, ${device.os}`,
                footer: device.footer,
                thumb_url: device.thumbUrl,
                callback_id: `device_${a}`,
                attachment_type: 'default',
                "mrkdwn_in": ["pretext", "text", "fields"],
                actions: []
            }
        // following condition will trigger if the device is checked out
        if (device.currentCheckout) {
            inUseCount++
            // set attachment properties
            attachment.color = 'warning'
            // set an action for check in button
            if (payload.user_id === device.currentCheckout.userId) {
                attachment.actions = [{
                    name: 'check_in',
                    text: 'Return',
                    type: 'button',
                    style: 'primary',
                    value: a
                }]
            } else {
                attachment.text += `\nThe device was booked by *${device.currentCheckout.username}* on *${device.currentCheckout.outAt}*.`
            }
        }
        // otherwise the device is available
        else {
            availableCount++
            // set attachment properties
            attachment.color = 'good'
            attachment.actions = [{
                name: "check_out",
                text: "Book",
                type: "button",
                style: 'primary',
                value: a
            }, {
                name: 'history',
                text: 'Show Last Booking',
                type: 'button',
                value: a
            }]
        }
        response.attachments.push(attachment)
    }

    // attach the avaible vs. inUse metrics
    response.attachments[0].fields[0].value = availableCount
    response.attachments[0].fields[1].value = inUseCount
    return response
}