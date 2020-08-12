# 10.DB設計
## usersテーブル (モデル名 = User)
|Column|Type|Options|
|------|----|-------|
|name|string|unique: true, null: false|
|email|string|unique: true, null: false|
|password|string|null: false|
|comment|string||
## Association
has_many :messages,dependent: :destroy

## messagesテーブル (モデル名 = Message)
|Column|Type|Options|
|------|----|-------|
|message|text('long')|null: false|
|user_id|integer|null:false, foreign_key: true|
## Association
belongs_to :user

npx sequelize-cli model:generate --name User --attributes name:string,email:string,password:string,comment:string
npx sequelize-cli model:generate --name Message --attributes message:text,user_id:integer