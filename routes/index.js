// indexルータ 全投稿内容の表示(ページング対応) と 新規メッセージの投稿(ただしどちらもログイン状態必須)
var express = require('express');
var router = express.Router();

// ファイル読み込み用
const fs = require('fs'); 
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
// モデルを使用
const Sequelize = require('sequelize');
// 不要const Message = require('../models').Message;
const db=require('../models');
// ページネーション用の1ページごとの表示メッセージ量
const PER_PAGE =2;

// 下の'/'より下に、この'/:page'をもってったらログイン後の「/」にアクセスしたら「/:page」も暴発します。
router.get('/:page', async function(req, res, next) {
  // ログインせずに投稿一覧を見に来たら、ログイン画面へリダイレクトします。
  if(req.session.login === undefined){
    res.redirect('users/login');
    return;
  }
  let page = parseInt(req.params.page);
  if(page < 1 ||page ===undefined){
    page =1;
  }
  // 非同期処理のデータベースからのメッセージ取得を同期的に行います。(async await)これで、投稿メッセージの全件を取得します。(await必須)
  let allmessages = await getAllmessages(page);

  let viewdatas={
    title:'メモ全件表示',
    login:{name:req.session.login.name},
    allmessages:allmessages.rows,
    formdata:null,
    site_msg:'下のフォームでメッセージを残せます。',
    maxcount:allmessages.count,
    nowpage:page,
    maxpage:Math.ceil(allmessages.count/PER_PAGE)};
  res.render('index',viewdatas);
});

// メッセージ全件表示ページを表示する(ログインしているなら。)
router.get('/', async function(req, res, next) {
  // ログインせずに投稿一覧を見に来たら、ログイン画面へリダイレクトします。
  if(req.session.login === undefined){
    res.redirect('users/login');
    return;
  }
  // 最初の全件表示は1ページ目を表示する
  let page=1;
  
  // 非同期処理のデータベースからのメッセージ取得を同期的に行います。(async await)これで、投稿メッセージの全件を取得します。
  let allmessages = await getAllmessages(page);
  
  let viewdatas={
    title:'メモ全件表示',
    login:{name:req.session.login.name}, 
    allmessages:allmessages.rows,
    formdata:null,
    site_msg:'下のフォームでメッセージを残せます。',
    maxcount:allmessages.count,
    nowpage:page,
    maxpage:Math.ceil(allmessages.count/PER_PAGE)};
  res.render('index',viewdatas);
  
});

router.post('/',async function(req,res,next){
  // /のフォーム(name属性=msg)の内容を取得
  let new_msg =req.body.msg;
  let savedata = {message:new_msg,user_id:req.session.login.id};
  // 取得した内容をDBに保存する
  let savemsg =await createMessage(savedata);
  console.log('savemsg=',savemsg);
    if (savemsg.saveresult === 'success'){
      res.redirect('/');
    }else{
      let allmessages = await db.Message.findAll({order:[['createdAt','DESC']],include:[{model:db.User,required:false}]});
      res.render('index', { title: 'メモ全件表示',site_msg:'保存に失敗しました<br>'+savemsg.errmsgs,formdata:new_msg,login:{name:req.session.login.name}, allmessages:allmessages,formdata:new_msg});
    }
});

// テキストファイルの内容を読み取りメッセージにします。
// upload.single('filename')で指定しているので、Viewのenctype="multipart/form-data"になっているform内のinputタグのname要素="filename"になっているところからのファイルをreq.fileで使えるようになる。またアプリの最上位階層にuploadsフォルダが出現し、そこにアップロードされる。
router.post('/c_file',upload.single('filename'), async function(req,res,next){
  // 同期処理版
  try {
    const buff = fs.readFileSync("./uploads/"+req.file.filename, "utf8");
    // console.log('buff= ',buff);
    // メッセージを保存します。(フォームに直接入力する部分と同じ)
    let new_msg =buff;
    let savedata = {message:new_msg,user_id:req.session.login.id};
    // アップロードしたファイルを削除します。
    deleteUploadedfile(req.file.filename);
    // 取得した内容をDBに保存する
    let savemsg =await createMessage(savedata);
    console.log('savemsg.saveresult =',savemsg.saveresult);
    if (savemsg.saveresult === 'success'){
      res.redirect('/');
    }else{
      let allmessages = await db.Message.findAll({order:[['createdAt','DESC']],include:[{model:db.User,required:false}]});
      res.render('index', { title: 'メモ全件表示',site_msg:'保存に失敗しました<br>'+savemsg.errmsgs,formdata:new_msg,login:{name:req.session.login.name}, allmessages:allmessages,formdata:new_msg});
    }
  }
  catch(e) {
    console.log('error= ',e.message);
  }
  
});

async function getAllmessages(page){
  // limit = 1ページに表示するメッセージ件数
  // offset = 全投稿件数中、何件目からlimit分取得するかの開始位置
  return await db.Message.findAndCountAll({
    limit: PER_PAGE,
    offset: PER_PAGE * (parseInt(page) - 1),
    order:[['createdAt','DESC']],
    include:[{model:db.User,required:false}]});
}
function deleteUploadedfile(filename){
  // 引数のファイル名のファイルを./uploadsフォルダから削除します。(後にprivateメソッドかしましょう) https://www.gesource.jp/weblog/?p=8216
  try {
    fs.unlinkSync('./uploads/'+String(filename));
    // console.log('削除しました。');
  } catch (error) {
    throw error;
  }
}

async function createMessage(savedata){
  let saveflg;
  let errmsgs='';
  // ここのセーブできた場合、できなかった場合で結果を返したいならcreateもawaitにしないとだめ。でないとsaveflgが決まらないまま、下の行へ続行される。
  await db.Message.create(savedata)
    .then(()=>{
      // 保存に成功した場合フラグを立てます。
      console.log('message-saved savedata=',savedata);
      saveflg=true;
    })
    .catch((err)=>{
      // 保存に失敗した場合はエラーメッセージを返します。
      console.log('/////message-save err//////');
      for(var i=0;i < err.errors.length;i++){
        errmsgs+=err.errors[i].message;
        errmsgs+='<br>';
      }
      console.log('errmsgs=',errmsgs);
      saveflg=false;
      
    });
    if(saveflg===true){
      return {saveresult:'success'};
    }else if(saveflg===false){
      return {saveresult:'false',errmsgs:errmsgs};
    }else{
      // saveflgがtrueでもfalseでもなかった場合です。create(非同期)を同期で(awaitで)実施できてない場合、flgがundefindになりここに落ちる。
      console.log('createMessage methods is error-- saveflg=',saveflg);
    }
}
module.exports = router;

