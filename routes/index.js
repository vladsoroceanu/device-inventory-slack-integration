'use strict'

const express = require('express'),
  router = express.Router(),
  root = process.cwd() + '/',
  fs = require('fs'),
  config = require(root + 'config.json'),
  deviceList = require(root + 'assets/devices.json')

/* GET home page. */
router.get('/', (req, res, next) => {
  res.render('index', { title: 'Express' })
})

// devices route
router.post('/devices', (req, res, next) => {
  if (!req.body || req.body.token !== config.verificationToken) {
    res.status(400).send({ test: 'Service temporarily unavailable' })
  } else {
    let resp
    switch (req.body.text) {
      case '?':
        resp = '*We will display help regarding checkin-out and checking-in devices*'
        break

      default:
        resp = createDeviceActionList(req.body)
    }
    res.send(resp)
  }
})

// This route will answer button clicks
router.post('/buttons', (req, res, next) => {
  let payload = JSON.parse(req.body.payload)
  if (!payload || payload.token !== config.verificationToken) {
    res.status(400).send({ test: 'Service temporarily unavailable' })
  } else {
    let device = deviceList[payload.actions[0].value],
      action = payload.actions[0].name,
      resp = {
        mrkdwn: true
      }

    switch (action) {
      case 'check_out':
        // save current user  
        device.currentCheckout = {
          userId: payload.user.id,
          username: payload.user.name,
          outAt: new Date().getTime()
        }
        // set reply
        resp.text = `Device \`${device.name}\` has been booked.\nGo get it from the locker and *Take care of it!* :smile:\nTo get the device please contact \`Sujata Singh\`, \`Tarunkumar Gondalia\` and \`Ravi Dindu\` to collect the devices`
        resp.delete_original = true
        break

      case 'check_in':
        // save current user as the last user to check out the device
        device.lastCheckout = {
          userId: payload.user.id,
          username: payload.user.name,
          outAt: device.currentCheckout.outAt,
          inAt: new Date().getTime()
        }
        // delete current user record
        delete device.currentCheckout
        // set reply
        resp.text = `Device \`${device.name}\` has been checked back in.\n*Please return the device to the locker.* Cheers!`
        resp.delete_original = true
        break

      default:
        let checkout = device.currentCheckout || device.lastCheckout,
          date = new Date(checkout.outAt).toUTCString()

        resp.text = `\`${device.name}\` was last checked out by *${checkout.username}* on *${date}*`
        // the following flag will tell Slack to not replace the printed list of devices with this message; the message will be
        // displayed underneath the list
        resp.replace_original = false
    }
    // write new device record to file
    fs.writeFile(root + 'assets/devices.json', JSON.stringify(deviceList), 'utf8', () => { })
    res.send(resp)
  }
})

module.exports = router


// private functions
function createDeviceActionList(payload) {
  let availableCount = 0,
    inUseCount = 0,
    response = {
      mrkdwn: true,
      text: 'Below you can book or return any devices. Click on "Show Last Booking" to see who is the last person that booked the device.\n*After booking it please contact `Sujata Singh`, `Tarunkumar Gondalia` or `Ravi Dindu` to collect the device.*',
      attachments: [
        {
          color: '#000000',
          mrkdwn_in: ["fields"],
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
        callback_id: `device_${a}`,
        attachment_type: 'default',
        mrkdwn_in: ["text"],
        title: device.name,
        text: `*${device.type}, ${device.os}*\n${device.description}`,
        thumb_url: device.thumbUrl,
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
        let date = new Date(device.currentCheckout.outAt).toUTCString()
        attachment.text += `\nThe device was booked by *${device.currentCheckout.username}* on *${date}*.`
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
      }]
      if (device.lastCheckout) {
        attachment.actions.push({
          name: 'history',
          text: 'Show Last Booking',
          type: 'button',
          value: a
        })
      }
    }
    response.attachments.push(attachment)
  }

  // attach the avaible vs. inUse metrics
  response.attachments[0].fields[0].value = availableCount
  response.attachments[0].fields[1].value = inUseCount
  return response
}