const express = require("express");
var router = express.Router();
const models  = require('./../models');
const querystring = require("querystring");

router.get("/projects", function(req, res) {
  models.Project.findAll().then(projects => {
    projects.map(function(val,idx){
      val.customValues= {
        url : querystring.stringify({
          id: val.dataValues.id,
          title: val.dataValues.title
        })
      };
    });

    res.render("projects", {
      title : "Projects",
      projects: projects,
      count: projects.length
    });
  });
});
router.get("/projects/:name/:mode", function(req,res){
  var id    = parseInt(req.query.id, 10);
  var title = req.query.title;
  var mode = req.query.mode;
  var order = "DESC";
  var deleted = false;
  switch (mode) {
    case "best":
      order = "DESC";
      break;
    case "worst":
      order = "ASC";
      break;
    case "deleted":
      order = "ASC";
      deleted = true;
      break;
    default:

  }
  models.ProjectContent.findAll({
    limit: 20,
    where: {
      projectId: id,
      deleted   : deleted
    },
    attributes: Object.keys(models.ProjectContent.attributes).concat([
      [models.sequelize.literal(`(
          SELECT COUNT("fv"."id")
          FROM "projectfilevotes" "fv"
          WHERE "fv"."FileOneId" = "ProjectContent"."id"
             OR "fv"."FileTwoId" = "ProjectContent"."id")`), 'votes'],
      [models.sequelize.literal(`(
          SELECT COUNT("fv"."id")
          FROM "projectfilevotes" "fv"
          WHERE "fv"."FileOneId" = "ProjectContent"."id" AND "fv"."won" = 1
             OR "fv"."FileTwoId" = "ProjectContent"."id" AND "fv".won = 0)`), 'won']
    ]),
    order: models.sequelize.literal('CAST(won AS float) / CAST(votes AS float) ' + order)
  })
  .then(files => {
    if (files.length < 1) { files = false; }
    else { files = JSON.stringify(files); }

    res.render("projectgallery", {
      title : title,
      id: id,
      files: files,
      mode : mode
    });
  });

});
router.get("/projects/:name", function(req, res) {
  var id    = parseInt(req.query.id, 10);
  var title = req.query.title;
  var data = {
    title : title,
    id: id
  }
  models.Project.findById(id).then(project =>{
    if (project) {
      data.project = project;
      return models.ProjectContent.count();
    }
  })
  .then(count => {
    data.count = count;
     return models.ProjectContent.findAll({
      limit: 20,
      where: {
        projectId: id,
        deleted   : false
      },
      attributes: Object.keys(models.ProjectContent.attributes).concat([
        [models.sequelize.literal(`(
            SELECT COUNT("fv"."id")
            FROM "projectfilevotes" "fv"
            WHERE "fv"."FileOneId" = "ProjectContent"."id"
               OR "fv"."FileTwoId" = "ProjectContent"."id")`), 'votes'],
        [models.sequelize.literal(`(
            SELECT COUNT("fv"."id")
            FROM "projectfilevotes" "fv"
            WHERE "fv"."FileOneId" = "ProjectContent"."id" AND "fv"."won" = 1
               OR "fv"."FileTwoId" = "ProjectContent"."id" AND "fv".won = 0)`), 'won']
      ]),
      order: [
        models.sequelize.literal('votes ASC'),
        models.sequelize.random()
      ]
    });
  })
  .then(files => {
    if (files.length < 2) { data.files = false; }
    else { data.files = JSON.stringify(files); }

    return models.ProjectFileVotes.count({
      include: [{
        model : models.ProjectContent,
        as    : 'FileOne',
        where : {
          projectId: id
        }
      }]
    });
  })
  .then(votecount => {
    data.votecount = votecount;
    console.log(data);
    res.render("project", data);
  });
});




module.exports = router;
