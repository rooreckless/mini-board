const { src, dest, watch } = require("gulp");
const sass = require("gulp-sass");
const pug = require("gulp-pug");
const sassGlob = require("gulp-sass-glob");
// linuxコマンドをgulpで実行する場合必要(child_process);
const ps = require('child_process').exec;



// Sassをコンパイルする(src()にあるように、「/src/scss」 にある全scssファイルを対象とするため、src/scssディレクトリを作成してください。scssを保存すると、sassGlob()で 「@import "variables/**";」のようにscssに書いておけば、variablesディレクトリ内のscssを全部インポートした状態でdest()の中にコンパイルしてくれます。)
const compileSass = () =>
   src("src/scss/**/*.scss")
   .pipe(sassGlob())
   .pipe(
       sass({
           outputStyle: "expanded"
       })
   )
   .pipe(dest("public/stylesheets"));

// Sassファイルを監視
const watchSassFiles = () => 
  watch("src/scss/**/*.scss", compileSass);

// pugをコンパイルする(現在使用していません)
// const compilePug = () =>
//    src("src/pug/**/*.pug")
//    .pipe(
//        pug({
//            pretty: true
//        })
//    )
//    .pipe(dest("views"));

// pugファイルを監視(現在使用していません)
// const watchPugFiles = () =>
//    watch("src/pug/**/*.pug", compilePug);


// コマンド実行テスト用(現在使用していません)
// const runnpmstart = () =>{
//   const command = "npm restart";
//   ps(command,function(err,stdout,stderr){
//     console.log(stdout);
//     console.log("----runnpmstart----");
//   });
// };

// npx gulpで実行される関数
exports.default = () =>
   watchSassFiles();
// watchPugFiles();