const models  = require('./../models');
const fc = require("./../functions/functions.js");
module.exports = function(io){


  io.on("connection", (socket)=>{
    console.log("User connected.");
    socket.emit("welcome", {
      date: Date.now()
    });
    // socket.on("welcomeServer", (message)=>{
    //   console.log("welcomeServer", message);
    // });
    socket.on("initProjectContent", message =>{
      fc.initProjectContent(message);
    });
    socket.on("markAsDeleted", message =>{
      console.log("Marking as deleted: projectContent", message);
      models.ProjectContent.update(
        { deleted: true },
        { where: {
            id: message.id
        }}
      )
    });
    socket.on("restoreFromDeleted", message =>{
      console.log("Restoring: projectContent", message);
      models.ProjectContent.update(
        { deleted: false },
        { where: {
            id: message.id
        }}
      )
    });

    // #####################################
    // ###  deleteForever
    // #####################################
    socket.on("deleteForever", message =>{
      var oldPath = "." + message.path + message.filename;
      var newDir  = "." + message.path + "deleted/"
      var newPath = newDir + message.filename;
      console.log(oldPath, newPath);
      if (!fc.fs.existsSync(newDir)){
          fc.fs.mkdirSync(newDir);
          console.log("directory created:", newDir);
      }
      fc.fs.rename(oldPath, newPath, function(err){
        if (err) throw err;
        console.log("rename complete");
      });
      models.ProjectContent.destroy({
        where: {id : message.id}
      });
    });

    // #####################################
    socket.on("refreshProjectMeta", message =>{
      data = {};
      models.ProjectContent.count({
        where: {
          projectId: message.id
        }
      })
      .then(pcount =>{
        data.filecount = pcount;
        return models.ProjectFileVotes.count({
          include: [{
            model : models.ProjectContent,
            as    : 'FileOne',
            where : {
              projectId: message.id
            }
          }]
        });
      })
      .then(fcount =>{
        data.votecount = fcount;
        console.log(data);
        socket.emit("sendProjectMeta", data);
      })
    });
    // #####################################
    // ###  requestingAdditionalFiles
    // #####################################
    socket.on("requestingAdditionalFiles", message =>{
      console.log("requesting for:", message);
      models.ProjectContent.findAll({
        limit: 10,
        where: {
          projectId : message.id,
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
                 OR "fv"."FileTwoId" = "ProjectContent"."id" AND "fv"."won" = 0)`), 'won'],
          [models.sequelize.literal(`(
              SELECT GROUP_CONCAT("fv"."FileOneId")
            	FROM "projectfilevotes" "fv"
            	WHERE "fv"."FileTwoId" = "ProjectContent"."id")`), 'pairsOne'],
          [models.sequelize.literal(`(
              SELECT GROUP_CONCAT("fv"."FileTwoId")
            	FROM "projectfilevotes" "fv"
            	WHERE "fv"."FileOneId" = "ProjectContent"."id")`), 'pairsTwo'],
        ]),
        order: [
          models.sequelize.literal('votes ASC'),
          models.sequelize.random()
        ]
      }).then(files => {
        files.forEach( file => {
          var id = file.dataValues.id;
          var pairs = (file.dataValues.pairsOne + "," + file.dataValues.pairsTwo + "," + id)
            .split(",")
            .filter(id => {
              return (id != 'null');
            });
          models.ProjectContent.findAll({
            limit: 1,
            where: {
              projectId : message.id,
              deleted   : false,
              id        : {
                [models.Op.and]: {
                  [models.Op.notIn]: pairs
                }
              }
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
                     OR "fv"."FileTwoId" = "ProjectContent"."id" AND "fv"."won" = 0)`), 'won']
            ]),
            order: [
              models.sequelize.literal('votes ASC'),
              models.sequelize.random()
            ]
          }).then(files => {
            socket.emit("servingAdditionalFiles", [file, files[0]]);
          });

        });

        // socket.emit("servingAdditionalFiles", files);
      });

      // models.ProjectContent.findAll({
      //   limit: message.limit,
      //   // order: models.sequelize.random(),
      //   where: {
      //     projectId : message.id,
      //     deleted   : false
      //   },
      //   attributes: Object.keys(models.ProjectContent.attributes).concat([
      //     [models.sequelize.literal(`(
      //         SELECT COUNT("fv"."id")
      //         FROM "projectfilevotes" "fv"
      //         WHERE "fv"."FileOneId" = "ProjectContent"."id"
      //            OR "fv"."FileTwoId" = "ProjectContent"."id")`), 'votes'],
      //     [models.sequelize.literal(`(
      //         SELECT COUNT("fv"."id")
      //         FROM "projectfilevotes" "fv"
      //         WHERE "fv"."FileOneId" = "ProjectContent"."id" AND "fv"."won" = 1
      //            OR "fv"."FileTwoId" = "ProjectContent"."id" AND "fv"."won" = 0)`), 'won']
      //   ]),
      //   order: [
      //     models.sequelize.literal('votes ASC'),
      //     models.sequelize.random()
      //   ]
      // }).then(files => {
      //   socket.emit("servingAdditionalFiles", files);
      // });

    });

    socket.on("voted", message =>{
      var win       = message.winnerId;
      var lose      = message.loserId;
      var winFlag   = null;
      var fileOneId = null;
      var fileTwoId = null;

      if (win < lose) {
        fileOneId = win;
        fileTwoId = lose;
        winFlag   = true;
      } else {
        fileOneId  = lose;
        fileTwoId  = win;
        winFlag    = false;
      }
      console.log("win:",win, "lose",lose);
      console.log("fileOneId",fileOneId, "fileTwoId",fileTwoId, "winFlag:",winFlag);

      models.ProjectFileVotes.findAll({
        where: {
          FileOneId: fileOneId,
          FileTwoId: fileTwoId
        }}).then(function(entry){
          // console.log(entry);
          if (entry.length === 0) {
            console.log("no results. inserting.");
            models.ProjectFileVotes.create({
              FileOneId: fileOneId,
              FileTwoId: fileTwoId,
              won: winFlag
            });
          } else if (entry[0].dataValues.won != winFlag) {
            console.log("vote exists but result differs. updating.");
            models.ProjectFileVotes.update(
              { won: winFlag },
              { where: {
                  FileOneId: fileOneId,
                  FileTwoId: fileTwoId
              }}
            )
              .then( result => console.log("update successful: " + result) )
              .catch( err => console.log(err) );
          } else {
            console.log("vote exists with same result. no updates or inserts necessary.");
          }
        });
    });
  });


}
