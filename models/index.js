const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const sequelize = new Sequelize(null, null, null, {
  dialect: "sqlite",
  // force:true,
  logging: false,

  storage: __dirname + "/../database.sqlite"
});
//// TODO: auslagern
// const Sequelize = require('sequelize')
// const { dbconfig } = require('../config.js')
//
// // Initialize database connection
// const sequelize = new Sequelize(dbconfig.database, dbconfig.username, dbconfig.password)
//
// // Locale model
// const Locales = sequelize.import(__dirname + './models/Locale')
//
// // Create schema if necessary
// Locales.sync()

sequelize.authenticate()
  .then(() => {
    console.log('---\nDatabase connection has been established successfully.\n---');
  })
  .catch(err => {
    console.error('---\nUnable to connect to the database:\n' + err + "\n---");
  });


const Project = sequelize.define('project', {
  title: {
    type: Sequelize.STRING,
    unique: true
  },
  description: Sequelize.TEXT
});

const ProjectContent = sequelize.define('projectcontent', {
  filename: {
    type: Sequelize.STRING,
    // unique: true
  },
  extension: Sequelize.STRING,
  type: Sequelize.INTEGER,
  deleted: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
});
ProjectContent.belongsTo(Project);

const ProjectFileVotes = sequelize.define('projectfilevotes', {
  won: Sequelize.BOOLEAN
});
ProjectFileVotes.belongsTo(ProjectContent, {as: 'FileOne', onDelete: 'cascade'});
ProjectFileVotes.belongsTo(ProjectContent, {as: 'FileTwo', onDelete: 'cascade'});
ProjectContent.hasMany(ProjectFileVotes, {as: 'FileOne', onDelete: 'cascade'});
ProjectContent.hasMany(ProjectFileVotes, {as: 'FileTwo', onDelete: 'cascade'});
module.exports = {
  Sequelize         : Sequelize,
  sequelize         : sequelize,
  Op                : Op,
  Project           : Project,
  ProjectContent    : ProjectContent,
  ProjectFileVotes  : ProjectFileVotes
}



// It is possible to create foreign keys:
//  bar_id: {
//    type: Sequelize.INTEGER,
//
//    references: {
//      // This is a reference to another model
//      model: Bar,
//
//      // This is the column name of the referenced model
//      key: 'id',
//
//      // This declares when to check the foreign key constraint. PostgreSQL only.
//      deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE
//    }
//  }
// })
