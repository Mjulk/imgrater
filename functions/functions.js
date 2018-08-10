const models  = require('./../models');
const fs      = require("fs");
const projectsDir = __dirname + "/../public/projects";


const functions = {
  hello : function(){
    console.log("hello world");
  },
  fs : fs,
  initProjectContent : function(data){
    if (data.title && data.id) {
      fs.readdir(projectsDir + "/" + data.title, function(err,files){
        var existingFiles = [];
        models.ProjectContent.findAll({
          where: {
            projectId : data.id
          }
        }).then(pc => {
          pc.forEach(function(file){
            existingFiles.push(file.dataValues.filename);
          });

          files = files.filter(function(file){
            return !existingFiles.includes(file) && file.includes(".");
          });

          console.log("init/refresh Project '" + data.title + "' ID: " + data.id);
          console.log("files in project:",existingFiles.length, existingFiles);
          console.log("files to insert",files.length, files);

          if (files.length > 0) {
            var regImg  = /^.+\.((jpg)|(jpeg)|(png)|(bmp))+$/i;
            var regAnim = /^.+\.((gif)|(apng))+$/i;
            var regVid = /^.+\.((mp4)|(webm))+$/i;
            var myMatch = null;
            var type = null;

            files.forEach(function(file){
              if ( (myMatch = file.match(regImg)) != null) {
                type = 1;
              } else if ((myMatch = file.match(regAnim)) != null) {
                type = 2;
              } else if ((myMatch = file.match(regVid)) != null) {
                type = 3;
              } else {

              }
              if (myMatch != null) {
                models.ProjectContent.create({
                  filename: myMatch[0],
                  extension: myMatch[1],
                  type: type,
                  projectId: data.id,
                });
              }
            });
          }
        });
      });
    }
  },

  initProjects : function(){
    fs.readdir(projectsDir, function(err,files){
      if (files.length > 0) {
        var directories = files.filter(function(file){
          return fs.statSync(projectsDir + "/"+ file).isDirectory();
        });
        // console.log("Folders in Projects dir:", directories);

        var existingProjects = [];
        models.Project.findAll().then(project => {
          project.forEach(function(proj){
            existingProjects.push(proj.dataValues.title);
          });
          // console.log("projects in DB", existingProjects);

          var projectsToInsert = directories.filter(function(dir){
            return !existingProjects.includes(dir);
          });
          console.log("projectsToInsert:",projectsToInsert);

          projectsToInsert.forEach((proj, idx)=>{
            models.Project.create({
              title: proj
            });
          });
        });
      }
    });
  }
};
module.exports = functions;
