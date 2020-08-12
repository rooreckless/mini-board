// usersルータ ログインと、ユーザ新規作成用コントローラ
var express = require('express');
var router = express.Router();
// モデルを使用
const Sequelize = require('sequelize');
// const User = require('../models').User;
const db=require('../models');
// パスワード暗号化用bcrypt
const bcrypt = require('bcrypt');

// getの/users はログイン画面表示用です
router.get('/', function(req, res, next) {
  console.log('/////////////');
  res.redirect('users/login');
});

// postの/usersで、ログイン処理をします。
router.post('/', async function(req, res, next) {
  // たとえ同じPCからのアクセスでもブラウザがことなると、req.session.loginの値は異なります。
  console.log('login req.session.login=',req.session.login);
  let name = req.body.name;
  let pass = req.body.password;
  
  // フォームに入力された名前とパスワードでUserモデルを検索します。ない場合は、ログイン画面に戻ります。
  // let loginuser = await db.User.findOne({where:{name:name,password:pass}});
  // フォームに入力された名前でUserモデルを検索します。
  let loginuser = await db.User.findOne({where:{name:name}});
  
  // 検索してもユーザがいない場合、パスワードが一致しない場合は、ログイン画面に戻ります。
  if (loginuser === null){
    res.render('users/login',{title: '再度お試しください' , content:'<p class="error">存在しないユーザです<p>'});
    return null;
  }else if(bcrypt.compareSync(pass,loginuser.password)){
    // ログインユーザがあり、パスワードも一致した場合ログインします。
    // セッションのloginキーに、Userモデルに紹介した結果を格納します。でもブラウザを閉じたら消去されるので、再度ログインが必要です。
    req.session.login = loginuser;
    console.log('LoginPostAfter req.session.login=',req.session.login);
    let view_datas ={
      title:'login完了',
      login:req.session.login
    };
    console.log('req.session =>',req.session);
    res.redirect('/');
  }else if(!bcrypt.compareSync(pass,loginuser.password)){
    // ログインするユーザのパスワードが一致しない場合
    loginuser = null;
    res.render('users/login',{title: '再度お試しください' , content:'<p class="error">パスワードが違います。<p>'});
    return null;
  }else{
    console.log('login error');
    return null;
  }
});
// ログアウト処理
router.get('/logout',function(req,res,next){
  // express-sessionのdestroyメソッドを使用
  req.session.destroy((err)=>{
    if(err){
      // destroyでエラーの場合
      console.log('--logout err--',err);
    }else{
      // 正常にdestroy完了。ログイン画面へリダイレクト
      console.log('--logout success--');
      res.redirect('/');
    }
  })
});

// 新規ユーザ作成用画面表示
router.get('/add', function(req, res, next) {
  let formdata = {
    name:'',
    email:'',
    password:'',
    comment:''};
  res.render('users/add', { title: 'user追加画面' , content:'user追加画面です',formdata:formdata});
});
// 新規ユーザ登録処理
router.post('/add', function(req, res, next) {
  let formdata = {
    name:req.body.name,
    email:req.body.email,
    password:bcrypt.hashSync(req.body.password,10),
    comment:req.body.comment};
  //フォームの内容をオブジェクトとして作成し、Userモデルの新規作成の引数として渡します。formdataオブジェクトのプロパティ名はUsersテーブルのカラム名と同じなので、オブジェクトをそのまま渡せます。
  db.User.create(formdata)
  .then(()=>{
    req.session.login =undefined;
    res.redirect('/');
    return
  })
  .catch((err)=>{
    // 新規ユーザ作成に失敗した場合、そのエラー内容を表示。およびパスワード以外のフォームの入力内容を再度渡す
    let errmsgs='';
    for(var i=0;i < err.errors.length;i++){
      errmsgs+=err.errors[i].message;
      errmsgs+='<br>';
    }
    res.render('users/add', { title: 'てすとuser追加' , content:'ユーザ作成に失敗しました<br>'+errmsgs, formdata:formdata});
    return;
  });
  
});
// 以下は後で消すルートです。
router.get('/login', function(req, res, next) {
  res.render('users/login', { title: 'login画面' , content:'ログインしてください'});
});

module.exports = router;
