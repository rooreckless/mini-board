var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var bodyParser = require('body-parser');
var session = require('express-session');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var homeRouter = require('./routes/home');
var markRouter = require('./routes/mark');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
// 相対パスの基準をプロジェクトルートに設定(pugでincludeするときもこれを基準に相対パスで呼ぶ)
app.locals.basedir = __dirname;

app.use(logger('dev'));
// bodyparserのミドルウェア
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
// cookieParserのミドルウェア
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
// express-sessionのミドルウェア
app.use(session({
  secret: 'keyborad cat',
  resave: false,
  saveUninitialized:false,
  // cookieの保存時間を1時間に設定。それを超えると、アクセスしてきたブラウザに関するsessionの値が消えます。
  cookie:{maxAge:60*60*1000}
}));

// ルーティング
app.use('/index', indexRouter);
app.use('/users', usersRouter);
app.use('/mark', markRouter);
app.use('/home', homeRouter);

// 「/」にアクセスされた場合、ログインしているかどうかでリダイレクトします。
app.get('/', function(req, res, next) {
  // ログインせずに投稿一覧を見に来たら、ログイン画面へリダイレクトします。
  if(req.session.login === undefined){
    res.redirect('users/login');
    return;
  }
  res.redirect('index/');
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
