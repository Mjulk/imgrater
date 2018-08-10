const express = require("express");
var router = express.Router();
// const models  = require('./../models');
// const querystring = require("querystring");
const Oauth2 = require('client-oauth2');
const KEYS = {
  client_id: 8441,
  client_secret: "079b1d943b0da1e10be4c94cd3cc7aad"
}
const AUTH_URL = "https://www.deviantart.com/oauth2/token";


router.get("/", (req,res)=>{

  auth().then(function(data){
    console.log("auth then:", data);
  });
  res.render("deviantart/index", {
    title : "Hello"
  });
});





function auth() {
  return new Promise((resolve, reject) => {
    let auth = new Oauth2({
      clientId: KEYS.client_id,
      clientSecret: KEYS.client_secret,
      accessTokenUri: AUTH_URL, // https://www.deviantart.com/oauth2/token
      authorizationGrants: ['credentials']
    });

    auth.credentials.getToken()
    .then((data) => {
      console.log("getToken:", data);
      resolve({
        token: data.accessToken
      });
    })
    .catch(reject);
  });
}


module.exports = router;
