'use strict';
module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define('Message', {
    message: {
      type:DataTypes.TEXT('long'),
      allowNull:false,
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
  
  Message.associate = function(models) {
    // associations can be defined here
    // モデルUser:Message = 1:多 =hasMany
    // モデルMessage:User = 1:1 =belongsTo
    Message.belongsTo(models.User,{foreignKey:'user_id',targetKey:'id'});
  };
  return Message;
};