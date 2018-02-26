'use strict'

const express = require('express');
const MessageController = require('../controllers/message');
const md_auth = require('../middlewares/authenticated');

const api = express.Router();

api.get('/message-md', md_auth.ensureAuth, MessageController.probando);
api.post('/message', md_auth.ensureAuth, MessageController.saveMessage);
api.get('/my-message/:page?', md_auth.ensureAuth, MessageController.getReceivedMessages);
api.get('/message', md_auth.ensureAuth, MessageController.getEmitterMessages);
api.get('/unviewed-messages', md_auth.ensureAuth, MessageController.getUnviewedMessages);
api.get('/set-viewed-messages', md_auth.ensureAuth, MessageController.setViewedMessages);


module.exports = api;