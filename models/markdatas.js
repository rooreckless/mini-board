'use strict';
module.exports = (sequelize, DataTypes) => {
  const Markdatas = sequelize.define('Markdatas', {
    title: {
      type:DataTypes.STRING,
      allowNull:false
    },
    content: {
      type:DataTypes.TEXT('long'),
      allowNull:false
    },
    user_id:{
      type:DataTypes.INTEGER,
      allowNull:false,
      references: {
        // This is a reference to another model
        model: 'User',
        // This is the column name of the referenced model
        key: 'id',
      }
    }
  }, {});
  Markdatas.associate = function(models) {
    // associations can be defined here
    // モデルUser:Markdatas = 1:多 =hasMany
    // モデルMarkdata:User = 1:1 =belongsTo
    Markdatas.belongsTo(models.User,{foreignKey:'user_id',targetKey:'id'});
  };
  return Markdatas;
};