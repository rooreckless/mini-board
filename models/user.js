'use strict';
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    name: {type:DataTypes.STRING,allowNull: false,unique: true},
    email:{type:DataTypes.STRING,allowNull: false,unique: true,validate:{isEmail:true}},
    // password:{type:DataTypes.STRING,allowNull: false,validate:{len:[4,10]}},
    password:{type:DataTypes.STRING,allowNull: false,validate:{len:{min:6}}},
    comment: DataTypes.STRING
  }, {});
  User.associate = function(models) {
    // associations can be defined here
    User.hasMany(models.Message,{foreignKey:'user_id'});
    User.hasMany(models.Markdatas,{foreignKey:'user_id'});
  };
  return User;
};