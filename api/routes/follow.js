'use strict'

 const express = require('express');
 const FollowController = require('../controllers/follow');
 const md_auth = require('../middlewares/authenticated');

 const api = express.Router();

 api.post('/follow', md_auth.ensureAuth,FollowController.saveFollow); 
 api.delete('/follow/:id', md_auth.ensureAuth, FollowController.deleteFollow);
 api.get('/following/:id?/:page?', md_auth.ensureAuth, FollowController.getFollowingUser);
 api.get('/followed/:id?/:page?', md_auth.ensureAuth, FollowController.getFollowedUser);
 api.get('/get-my-follows/:followed?', md_auth.ensureAuth, FollowController.getMyFollows);

module.exports = api;