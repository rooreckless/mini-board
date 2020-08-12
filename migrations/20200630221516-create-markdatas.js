'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Markdatas', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
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
      title: {
        type: Sequelize.STRING,
        allowNull:false,
      },
      content: {
        type: Sequelize.TEXT('long'),
        allowNull:false,
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
    return queryInterface.dropTable('Markdatas');
  }
};