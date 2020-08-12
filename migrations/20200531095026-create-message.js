'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Messages', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      message: {
        allowNull: false,
        type: Sequelize.TEXT('long'),
      },
      user_id: {
        allowNull:false,
        type: Sequelize.INTEGER,
        // 参照制約 はモデルにtableNameで入れる。モデル名ではだめでした。keyは、「Usersテーブルのidを参照する」の意味
        references:{
          model:{
            tableName: 'Users',
          },
          key:'id',
        }
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Messages');
  }
};