// indexルータ 全投稿内容の表示(ページング対応) と 新規メッセージの投稿(ただしどちらもログイン状態必須)
var express = require('express');
var router = express.Router();
// ファイル読み込み用
const fs = require('fs'); 
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
// モデルを使用
const Sequelize = require('sequelize');
const db=require('../models');
// sequelizeのオペレータ用
const { Op } = require("sequelize");
const { QueryTypes } = require('sequelize');
// markdown文字列をhtmlにレンダリング用
const MarkdownIt = require('markdown-it');
const markdown =new MarkdownIt();
// markdown-itのレンダリングにクラスやid値を付与する用
const markdownItAttrs = require('markdown-it-attrs');
markdown.use(markdownItAttrs, {
  // optional, these are default options
  leftDelimiter: '{',
  rightDelimiter: '}',
  // allowedAttributes: []
  //上の"allowedAttributes" が空配列なら、マークダウンレンダリング時にあらゆる属性が有効になってしまう。
  // マークダウンのレンダリング時に有効な属性を idとclassとregexから始まる属性のみに限定し、onclickとか使えないようにします。
  allowedAttributes: ['id', 'class', /^regex.*$/]
});
// さらにマークダウンのレンダリング時、<br>の文字で改行する様レンダリングする、'markdown-it-br'も適用されるようにします。
markdown.use(require('markdown-it-br'));
// ページネーション用の1ページごとの表示メッセージ量
const PER_PAGE =2;


// 下の'/'より下に、この'/:page'をもってったらログイン後の「/」にアクセスしたら「/:page」も暴発します。
// router.get('/:page', async function(req, res, next) {
//   // ログインせずに投稿一覧を見に来たら、ログイン画面へリダイレクトします。
//   if(req.session.login === undefined){
//     res.redirect('users/login');
//     return;
//   }
//   let page = parseInt(req.params.page);
//   if(page < 1 ||page ===undefined){
//     page =1;
//   }
//   // 非同期処理のデータベースからのメッセージ取得を同期的に行います。(async await)これで、投稿メッセージの全件を取得します。(await必須)
//   let allmessages = await getAllmessages(page);

//   let viewdatas={
//     title:'メモ全件表示',
//     login:{name:req.session.login.name},
//     allmessages:allmessages.rows,
//     formdata:null,
//     site_msg:'下のフォームでメッセージを残せます。',
//     maxcount:allmessages.count,
//     nowpage:page,
//     maxpage:Math.ceil(allmessages.count/PER_PAGE)};
//   res.render('index',viewdatas);
// });

// マークデータ全件表示ページを表示する(ログインしているなら。)
router.get('/', async function(req, res, next) {
  // ログインせずに投稿一覧を見に来たら、ログイン画面へリダイレクトします。
  if(req.session.login === undefined){
    res.redirect('/users/login');
    return;
  }
  // 最初の全件表示は1ページ目を表示する
  let page=1;
  
  // 全マークダウンデータ取得(ページング考慮)
  let allmarks = await getAllmarksPaging(page);
  let viewdatas={
    title:'マークダウン全件表示',
    login:{name:req.session.login.name}, 
    allmarks:allmarks.rows,
    formdata:null,
    site_msg:'下のフォームでマークダウンで記事を残せます。',
    maxcount:allmarks.count,
    nowpage:page,
    maxpage:Math.ceil(allmarks.count/PER_PAGE)
  };
  res.render('mark/marktop',viewdatas);
  
});
router.post('/destroy/:id', async function(req, res, next) {
  // ログインせずに投稿一覧を見に来たら、ログイン画面へリダイレクトします。
  if(req.session.login === undefined){
    res.redirect('/users/login');
    return;
  }
  let paramsid = parseInt(req.params.id);
  if(paramsid < 1 ||paramsid ===undefined){
    res.redirect('/mark');
    return;
  }
  // 削除開始
  await db.Markdatas.destroy({where:{id:paramsid}})
  .then(()=>{
    console.log("destroyed-markdata---- id = ",paramsid);
    res.redirect('/mark');
  })
  .catch((err)=>{
    let errmsgs='';
    // 削除に失敗した場合はエラーメッセージを返します。
    console.log('/////markdata-save err//////');
    for(var i=0;i < err.errors.length;i++){
      errmsgs+=err.errors[i].message;
      errmsgs+='<br>';
    }
    console.log('errmsgs=',errmsgs);
    let viewdatas={
      title:'マークダウン全件表示',
      login:{name:req.session.login.name}, 
      allmarks:allmarks.rows,
      formdata:null,
      site_msg:'マークダウンの消去に失敗しました。<br>エラー<br>'+errmsgs,
      maxcount:allmarks.count,
      nowpage:page,
      maxpage:Math.ceil(allmarks.count/PER_PAGE)
    };
    res.render('mark/marktop',viewdatas);
  });
  
 
  
});

router.get('/:page', async function(req, res, next) {
  // ログインせずに投稿一覧を見に来たら、ログイン画面へリダイレクトします。
  if(req.session.login === undefined){
    res.redirect('/users/login');
    return;
  }
  let page = parseInt(req.params.page);
  if(page < 1 ||page ===undefined){
    page =1;
  }
  
  // 全マークダウンデータ取得(ページング考慮)
  let allmarks = await getAllmarksPaging(page);
  
  let viewdatas={
    title:'マークダウン全件表示',
    login:{name:req.session.login.name}, 
    allmarks:allmarks.rows,
    formdata:null,
    site_msg:'下のフォームでマークダウンで記事を残せます。',
    maxcount:allmarks.count,
    nowpage:page,
    maxpage:Math.ceil(allmarks.count/PER_PAGE)
  };
  res.render('mark/marktop',viewdatas);
  
});
// フォームの直接入力値から、mak記事を保存します。
router.post('/',async function(req,res,next){
  // /のフォーム(name属性=msg)の内容を取得
  let new_marktitle =req.body.marktitle;
  let new_markcontent =req.body.markcontent;
  let savedata = {title:new_marktitle,content:new_markcontent,user_id:req.session.login.id};

  // 取得した内容をDBに保存する
  db.Markdatas.create(savedata)
  .then(()=>{
    // 保存に成功した場合は/へリダイレクトします。
    console.log('markdowndata-saved savedata=',savedata);
    res.redirect('/mark');
    return;
  })
  .catch(async(err)=>{
    // 保存に失敗した場合は「index.pug」をrenderします。(一度入力した内容をフォームに渡しておきます。)
    let errmsgs='';
    console.log('/////markdata-save err//////');
    for(var i=0;i < err.errors.length;i++){
      errmsgs+=err.errors[i].message;
      errmsgs+='<br>';
    }
    console.log('errmsgs=',errmsgs);
    let allmessages = await db.Message.findAll({order:[['createdAt','DESC']],include:[{model:db.User,required:false}]});
    res.render('index', { title: 'メモ全件表示',site_msg:'保存に失敗しました<br>'+errmsgs,login:{name:req.session.login.name}, allmessages:allmessages});
    return;
  });
});
// テキストファイル、mdファイルの内容を読み取り記事にします。
// upload.single('filename')で指定しているので、Viewのenctype="multipart/form-data"になっているform内のinputタグのname要素="filename"になっているところからのファイルをreq.fileで使えるようになる。またアプリの最上位階層にuploadsフォルダが出現し、そこにアップロードされる。
/*
router.post('/c_file',upload.single('filename'), async function(req,res,next){
  // 同期処理版
  try {
    const buff = fs.readFileSync("./uploads/"+req.file.filename, "utf8");
    // console.log('buff= ',buff);
    // メッセージを保存します。(フォームに直接入力する部分と同じ)
    let new_marktitle =req.body.marktitle;
    let new_markcontent =buff;
    let savedata = {title:new_marktitle,content:new_markcontent,user_id:req.session.login.id};
    // アップロードしたファイルを削除します。
    deleteUploadedfile(req.file.filename);
    // 取得した内容をDBに保存する
    let savedmsg =await createMarkdata(savedata);
    console.log('savemsg.saveresult =',savedmsg.saveresult);
    if (savedmsg.saveresult === 'success'){
      res.redirect('/mark/show/'+savedmsg.savedataid);
    }else{
      let allmessages = await db.Message.findAll({order:[['createdAt','DESC']],include:[{model:db.User,required:false}]});
      res.render('index', { title: 'メモ全件表示',site_msg:'保存に失敗しました<br>'+savedmsg.errmsgs,formdata:new_msg,login:{name:req.session.login.name}, allmessages:allmessages,formdata:new_msg});
    }
  }
  catch(e) {
    console.log('error= ',e.message);
  }
  
});
*/
// テキスト、mdファイルを読み、/mark/newのmarknew.pugに渡して、内容を表示。createするか確認してもらいます。
router.post('/c_file',upload.single('filename'), async function(req,res,next){
  // ログインせずに見に来たら、ログイン画面へリダイレクトします。
  if(req.session.login === undefined){
    res.redirect('/users/login');
    return;
  }
  // 同期処理版
  try {
    const buff = fs.readFileSync("./uploads/"+req.file.filename, "utf8");
    // console.log('buff= ',buff);
    // メッセージを保存します。(フォームに直接入力する部分と同じ)
    let new_marktitle =req.body.marktitle;
    let new_markcontent =buff;
    let rendered_new_markcontent=markdown.render(buff);
    let formdata={new_marktitle:new_marktitle,new_markcontent:new_markcontent};
    // アップロードしたファイルを削除します。
    deleteUploadedfile(req.file.filename);
    // ビューのsubmitボタンのアクション先と、表示内容を設定します。
    let submit_act=[{actref:"/mark/new_conf",str:"この内容で再確認する"},{actref:"/mark/create",str:"この内容で記事を登録する"}];
    res.render('mark/marknew', { title: 'マークダウンの新規作成',site_msg:'この内容で作成しますか？',formdata:formdata,rendered_new_markcontent:rendered_new_markcontent,login:{name:req.session.login.name},submit_act:submit_act});
  }catch(e) {
    console.log('error= ',e.message);
    res.redirect('/mark/');
  }
  
});
// テキストファイル読み込み後のビューmark_new.pugのフォームの内容を受けて再度、mark_new.pugをrenderする。
router.post('/new_conf', function(req,res,next){
  // ログインせずに見に来たら、ログイン画面へリダイレクトします。
  if(req.session.login === undefined){
    res.redirect('/users/login');
    return;
  }
  let new_marktitle =req.body.marktitle;
  let new_markcontent =req.body.markcontent;
  let rendered_new_markcontent=markdown.render(new_markcontent);
  formdata={new_marktitle:new_marktitle,new_markcontent:new_markcontent};
  // ビューのsubmitボタンのアクション先と、表示内容を設定します。
  let submit_act=[{actref:"/mark/new_conf",str:"この内容で再確認する"},{actref:"/mark/create",str:"この内容で記事を登録する"}];
  res.render('mark/marknew', { title: 'マークダウンの新規作成',site_msg:'この内容で作成しますか？',formdata:formdata,rendered_new_markcontent:rendered_new_markcontent,login:{name:req.session.login.name},submit_act:submit_act});
});
// マークダウンの更新用ページ表示
router.get('/edit/:id',async function(req,res,next){
  // ログインせずに投稿一覧を見に来たら、ログイン画面へリダイレクトします。
  if(req.session.login === undefined){
    res.redirect('/users/login');
    return;
  }
  // :idが1以上の数値でないなら、リダイレクト
  let mark_id = parseInt(req.params.id);
  if(mark_id < 1 ||mark_id ===undefined){
    res.redirect('/mark');
    return;
  }
  
  // マークダウンデータ取得(1件のみ、Markdatasのidで検索)
  let mark = await getMark(mark_id);
  // ログイン者と記事作成者のidが一致しない場合リダイレクト
  if(req.session.login.id !== mark.user_id){
    res.redirect('/mark');
    return;
  }
  let new_marktitle =mark.title;
  let new_markcontent =mark.content;
  let rendered_new_markcontent=markdown.render(new_markcontent);
  formdata={new_marktitle:new_marktitle,new_markcontent:new_markcontent};
  
  // ビューのsubmitボタンのアクション先と、表示内容を設定します。
  let submit_act=[{actref:"/mark/edit_conf/"+mark.id,str:"この内容で再確認する",method:"post"},{actref:"/mark/update"+mark.id,str:"この内容で記事を更新する",method:"post" }];
  res.render('mark/marknew', { title: 'マークダウンの更新',site_msg:'この内容で更新しますか？',formdata:formdata,rendered_new_markcontent:rendered_new_markcontent,login:{name:req.session.login.name},submit_act:submit_act});
});
router.post('/edit_conf/:id',function(req,res,next){
  // ログインせずに見に来たら、ログイン画面へリダイレクトします。
  if(req.session.login === undefined){
    res.redirect('/users/login');
    return;
  }
  // :idが1以上の数値でないなら、リダイレクト
  let mark_id = parseInt(req.params.id);
  if(mark_id < 1 ||mark_id ===undefined){
    res.redirect('/mark');
    return;
  }
  
  let new_marktitle =req.body.marktitle;
  let new_markcontent =req.body.markcontent;
  let rendered_new_markcontent=markdown.render(new_markcontent);
  formdata={new_marktitle:new_marktitle,new_markcontent:new_markcontent};
  // ビューのsubmitボタンのアクション先と、表示内容を設定します。
  let submit_act=[{actref:"/mark/edit_conf/"+mark_id,str:"この内容で再確認する",method:"post"},{actref:"/mark/update/"+mark_id,str:"この内容で記事を更新する",method:"post" }];
  res.render('mark/marknew', { title: 'マークダウンの更新',site_msg:'この内容で更新しますか？',formdata:formdata,rendered_new_markcontent:rendered_new_markcontent,login:{name:req.session.login.name},submit_act:submit_act});
});
// マークダウンの内容をフォームの内容で更新します。
router.post('/update/:id',async function(req,res,next){
  // ログインせずに見に来たら、ログイン画面へリダイレクトします。
  if(req.session.login === undefined){
    res.redirect('/users/login');
    return;
  }
  // :idが1以上の数値でないなら、リダイレクト
  let mark_id = parseInt(req.params.id);
  if(mark_id < 1 ||mark_id ===undefined){
    res.redirect('/mark');
    return;
  }
  
  let new_marktitle =req.body.marktitle;
  let new_markcontent =req.body.markcontent;
  // マークダウンを更新します。
  await db.Markdatas.update({title:new_marktitle,content:new_markcontent},{where:{id:mark_id}})
  .then((done)=>{
    console.log("updated-markdata---- id = ",mark_id);
    res.redirect('/mark/show/'+mark_id);
  })
  .catch((err)=>{
    let errmsgs='';
    // 削除に失敗した場合はエラーメッセージを返します。
    console.log('/////markdata-save err//////');
    for(var i=0;i < err.errors.length;i++){
      errmsgs+=err.errors[i].message;
      errmsgs+='<br>';
    }
    console.log('errmsgs=',errmsgs);
    let viewdatas={
      title:'マークダウン全件表示',
      login:{name:req.session.login.name}, 
      allmarks:allmarks.rows,
      formdata:null,
      site_msg:'マークダウンの消去に失敗しました。<br>エラー<br>'+errmsgs,
      maxcount:allmarks.count,
      nowpage:page,
      maxpage:Math.ceil(allmarks.count/PER_PAGE)
    };
    res.render('mark/marktop',viewdatas);
  });
});
// フォームの内容でマークダウン記事を登録(create)します。
router.post('/create', async function(req,res,next){
  let new_marktitle =req.body.marktitle;
  let new_markcontent =req.body.markcontent;
  let rendered_new_markcontent=markdown.render(new_markcontent);
  try{
    // Markdataモデルに保存するデータを作ります。
    let savedata = {title:new_marktitle,content:new_markcontent,user_id:req.session.login.id};    
    // 取得した内容をDBに保存する。
    let savedmsg =await createMarkdata(savedata);
    console.log('savemsg.saveresult =',savedmsg.saveresult);
    // 保存ができたなら、その記事のshowへ移動します。
    if (savedmsg.saveresult === 'success'){
      // 戻り値savedmsgには保存できたならsaveresultプロパティがtrueに、savedataidが記事のidになっています。
      res.redirect('/mark/show/'+savedmsg.savedataid);
    }else{
      let allmessages = await db.Message.findAll({order:[['createdAt','DESC']],include:[{model:db.User,required:false}]});
      res.render('index', { title: 'メモ全件表示',site_msg:'保存に失敗しました<br>'+savedmsg.errmsgs,formdata:new_msg,login:{name:req.session.login.name}, allmessages:allmessages,formdata:new_msg});
    }
  }catch(e) {
    console.log('error= ',e.message);
    res.redirect('/mark/');
  }
  
});

// マークダウン検索用アクション
router.post('/search',async function(req,res,next){
  // /markの検索用フォーム(name属性=searchtitleとsearchcontent)の内容を取得し、文字列化後' 'で区切って配列化。空だった場合はnullにする
  
  let search_marktitle_arr =req.body.searchtitle ? (req.body.searchtitle.toString()).split(' '): null;
  let search_markcontent_arr =req.body.searchcontent ? (req.body.searchcontent.toString()).split(' '): null;
  let search_marktitle_andregstr='';
  let search_markcontent_andregstr='';
  // 検索用フォームのタイトルの方が空だった場合を除き、正規表現検索用文字列を作成
  if(search_marktitle_arr !== null){
    for(let i=0;i<search_marktitle_arr.length;i++){
      // 検索用フォームの文字列が「文字列1 文字列2」だったなら、「.*文字列1.*文字列2」となるようにする
      search_marktitle_andregstr+=('.*'+search_marktitle_arr[i]);
    }
  }
  // 検索用フォームのコンテンツの方も同上
  if(search_markcontent_arr !== null){
    for(let i=0;i<search_markcontent_arr.length;i++){
      search_markcontent_andregstr+=('.*'+search_markcontent_arr[i]);
    }
  }

  let searchmarks;
  
  // 正規表現を用いてmarkdataを検索
  if((search_marktitle_andregstr !== '')&&(search_markcontent_andregstr !== '')){
    // タイトル欄 かつ コンテンツ欄 となる検索結果の表示 (もちろん双方とも' 'でのand検索可能。そのための[Op.regexp])
    searchmarks = await db.Markdatas.findAndCountAll({
      where:{
        title:{
          [Op.regexp]:search_marktitle_andregstr
        },
        content:{
          [Op.regexp]:search_markcontent_andregstr
        }
      }
    });
  }else if((search_marktitle_andregstr === '')&&(search_markcontent_andregstr === '')){
    // タイトル欄 、コンテンツ欄 ともに空の場合 = 検索しない
    searchmarks=null;
  }else if(search_marktitle_andregstr === ''){
    // コンテンツ欄のみの場合
    console.log('case search_content only regmode');
    searchmarks = await db.Markdatas.findAndCountAll({
      where:{
        content:{
          [Op.regexp]:search_markcontent_andregstr
        }
      }
    });
  }else if(search_markcontent_andregstr === ''){
    // タイトル欄のみの場合
    console.log('case search_title only regmode');
    searchmarks = await db.Markdatas.findAndCountAll({
      where:{
        title:{
          [Op.regexp]:search_marktitle_andregstr
        }
      }
    });
  }
 
  console.log('searchmarks = ',searchmarks);
});
// /mark/showにアクセスされたなら、/markへリダレクト
router.get('/show', async function(req, res, next) {
  // ログインせずに投稿一覧を見に来たら、ログイン画面へリダイレクトします。
  if(req.session.login === undefined){
    res.redirect('/users/login');
    return;
  }
  res.redirect('/mark/');
});
// マーク1件詳細表示ページを表示する(ログインしているなら。)
router.get('/show/:id', async function(req, res, next) {
  // ログインせずに投稿一覧を見に来たら、ログイン画面へリダイレクトします。
  if(req.session.login === undefined){
    res.redirect('/users/login');
    return;
  }
  // :idが1以上の数値でないなら、1にする
  let mark_id = parseInt(req.params.id);
  if(mark_id < 1 ||mark_id ===undefined){
    mark_id =1;
  }
  
  // マークダウンデータ取得(1件のみ、Markdatasのidで検索)
  let mark = await getMark(mark_id);
  // マークデータ全件取得
  let allmarks = await getAllmarks();
  // createdAtの降順に取得したマークダウン全件(=allmarks)のうち、1件(=mark)より新しいidと古いidを取得(オブジェクトになってる)
  let markpages_obj = searchIndexOfAllmarks(allmarks,mark);
  
  let viewdatas={
    title:'マークダウン詳細表示',
    login:{name:req.session.login.name}, 
    markdata:mark,
    renderd_content:markdown.render(mark.content),
    site_msg:'マークダウンデータの詳細を表示します',
    markpages_obj:markpages_obj
    // maxcount: allmarks.count,
    // nowpage:page,
    // maxpage:Math.ceil(allmarks.count/PER_PAGE)
  };
  res.render('mark/markshow',viewdatas);
  
});

// https://stackoverflow.com/questions/34268597/sequelize-js-find-by-id-and-return-result
// (上のページを参考に)非同期な全件検索をページングを考慮し、同期的に行います。'(async await必須) 
async function getAllmarksPaging(page){
  // limit = 1ページに表示するメッセージ件数
  // offset = 全投稿件数中、何件目からlimit分取得するかの開始位置
  return await db.Markdatas.findAndCountAll({
    limit: PER_PAGE,
    offset: PER_PAGE * (parseInt(page) - 1),
    order:[['createdAt','DESC']],
    include:[{model:db.User,required:false}]});
}
// ページングなしの全マークダウン数を取得
async function getAllmarks(){
  let allmarks = await db.Markdatas.findAndCountAll({
    order:[['createdAt','DESC']],
    include:[{model:db.User,required:false}]});
  
  //もしmarkdatasテーブルにデータがない場合、0件とします。 
  if(allmarks === null){
    allmarks.count = 0;
  }
  return allmarks;
}

async function getMark(id){
  // limit = 1ページに表示するメッセージ件数
  // offset = 全投稿件数中、何件目からlimit分取得するかの開始位置
  return await db.Markdatas.findByPk(id);
}
// createdAtの降順に取得したマークダウン全件(=allmarks)のうち、1件(=mark)より新しいidと古いidを取得し、オブジェクトとして返す
function searchIndexOfAllmarks(allmarks,mark){
  let nowindex,nowid,newerid,olderid;
  let older_title,newer_title;
  // console.log('mark.id=',mark.id);
  for(var i=0;i < allmarks.rows.length;i++){
    if(allmarks.rows[i].id ===mark.id){
      nowid=mark.id;
      nowindex=i;
      if(nowindex !==allmarks.rows.length-1){
        // olderid = nowid+1;
        olderid = allmarks.rows[nowindex+1].id;
        older_title =allmarks.rows[nowindex+1].title;
      }else{
        olderid = null;
        older_title=null;
      }

      if(nowindex !== 0){
        // newerid =nowid -1;
        newerid =allmarks.rows[nowindex -1].id;
        newer_title=allmarks.rows[nowindex -1].title;
      }else{
        newerid = null;
        newer_title=null;
      }
    }
  }
  // console.log('nowid=',nowid,' newerid=',newerid,'olderid=',olderid);
  return {nowid:nowid,newerid:newerid,newer_title:newer_title,olderid:olderid,older_title:older_title};
}
async function deleteUploadedfile(filename){
  // 引数のファイル名のファイルを./uploadsフォルダから削除します。(後にprivateメソッドかしましょう) https://www.gesource.jp/weblog/?p=8216
  try {
    await fs.unlinkSync('./uploads/'+String(filename));
    // console.log('削除しました。');
  } catch (error) {
    throw error;
  }
}
async function createMarkdata(savedata){
  let saveflg;
  let savedataid;
  let errmsgs='';
  // ここのセーブできた場合、できなかった場合で結果を返したいならcreateもawaitにしないとだめ。でないとsaveflgが決まらないまま、下の行へ続行される。
  await db.Markdatas.create(savedata)
    .then((done)=>{
      // 保存に成功した場合フラグを立てます。
      console.log('markdata-saved savedata=',savedata);
      console.log('markdata-saved done=',done);
      // 保存が実行された場合、そのMarkdatasのidを取得する。saveflgもたてる。
      savedataid=done.dataValues.id;
      saveflg=true;
    })
    .catch((err)=>{
      // 保存に失敗した場合はエラーメッセージを返します。
      console.log('/////markdata-save err//////');
      for(var i=0;i < err.errors.length;i++){
        errmsgs+=err.errors[i].message;
        errmsgs+='<br>';
      }
      console.log('errmsgs=',errmsgs);
      saveflg=false;
      
    });
    if(saveflg===true){
      return {saveresult:'success',savedataid:savedataid};
    }else if(saveflg===false){
      return {saveresult:'false',errmsgs:errmsgs};
    }else{
      // saveflgがtrueでもfalseでもなかった場合です。create(非同期)を同期で(awaitで)実施できてない場合、flgがundefindになりここに落ちる。
      console.log('createMarkdata methods is error-- saveflg=',saveflg);
    }
}
module.exports = router;
