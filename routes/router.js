const express = require("express");
var router = express.Router();

router.get("/", function(req, res) {
  res.render("index", {
    title : "Hello"
  });
});



const imgrater = require('./imgrater');
router.use('/imgrater', imgrater);
const deviantart = require('./deviantart');
router.use('/deviantart', deviantart);



module.exports = router;
