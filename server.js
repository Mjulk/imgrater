const express = require("express");
const app     = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const models  = require("./models");
const fc = require("./functions/functions.js");




models.sequelize.sync().then(function(){
  console.log("---\nTables successfully created.\n---");

  fc.initProjects();

  app.set("view engine", "pug");
  app.set("views", __dirname + "/views");

  app.use("/public", express.static("public"));

  var sockets = require('./sockets/sockets')(io);

  server.listen(8080, ()=>{
    console.log("Webserver wurde auf Port 8080 gestartet.");
  });

});

const router = require('./routes/router');
app.use('/', router);
