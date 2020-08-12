// homeルータ = /home/ユーザidでアクセスすると、そのユーザの投稿内容を全表示するが、ページング表示する。なので、/home/ユーザid/ページングNoとなる。
var express = require('express');
var router = express.Router();
// モデルを使用
const Sequelize = require('sequelize');
const db=require('../models');

// /homeにアクセスしてきたらroot(=/)へ戻ります
router.get('/',(req,res,next)=>{
  // redirect('/')で戻る先はlocalhost
  res.redirect('users/');
});
// /home/:idだと、/home/:id/1に飛ばします。
router.get('/:id',(req,res,next)=>{
  res.redirect('/home/'+req.params.id+'/1');
});
// /home/:id/:pageの場合、ユーザの投稿内容をページネーションで表示します。
router.get('/:id/:page',async (req,res,next)=>{
  let id =parseInt(req.params.id);
  let page= parseInt(req.params.page);
  // id,pageに数値以外が入ったら/に戻ります。また0以下の数値がはいっても戻ります。
  if (Number.isInteger(id)===false || Number.isInteger(page)===false){
      res.redirect('/'); 
  }else if(id <= 0 || page <= 0){
    res.redirect('/');
  }
  console.log('id=',id);
  // 非同期処理のデータベースからのメッセージ取得を同期的に行います。(async await)
  // let datas = await Message.findAll({where:{user_id:id}});
  let datas = await db.Message.findAll({where:{user_id:id},order:[['createdAt','DESC']],include:[{model:db.User,required:false}]});
  console.log('datas.length =',datas.length);
  console.log(datas);
  // Userモデルから(Messageモデルを先読み、結合して)、全件出力する方法
  // let subdatas = await User.findAll({include:[{model:Message,required:false}]});
  res.render('home', { title: 'てすとhomeたいとる' , datas:datas});
});
module.exports = router;
