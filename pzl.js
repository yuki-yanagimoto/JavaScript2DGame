
//起動時の処理
function setup(){
    //setFPS(60);
    canvasSize(1200,960);
    loadImg(0,"image/bg.png");
    var BLOCK = ["tako", "kame", "kurage", "iruka", "uni", "ika"];
    for(var i=0; i<6; i++)loadImg(1+i,"image/"+BLOCK[i]+".png");
    loadImg(7, "image/title.png");
    for(var i = 0;i < 4;i++)loadImg(8+i,"image/mgirl"+i+".png");
    loadSound(0, "sound/Pops_05.mp3");
    loadSound(1, "sound/maou_se_onepoint16.mp3");//消えるときの音
    //loadSound(1, "sound/maou_se_onepoint12.m4a");//消えるときの音
    loadSound(2, "sound/maou_se_onepoint27.mp3");//上にせりあがる
    loadSound(3, "sound/maou_se_onepoint04.mp3");//ゲームオーバー

    clrBlock();

}


var idx = 0;
var tmr = 0;
var block=[1,2,3,1,2,3];//プレイヤーが動かすブロック+次のブロック

var dropSpd = 30;//落下速度

var gameProc = 0;//処理の流れを管理
var gameTime = 30*90;//時間の進行を管理

var score = 0;
var hisco = 0;
var col = 4;//blockの種類
var rensa = 1;//連鎖回数
var rensaCount=1;//表示用連鎖数
var points = 0;//ブロックを消した時の得点
var eftime = 0;//ブロックを消す演出時間
var extend = 0;//エクステンドタイム
var upTime = 180;//上にせり出す時間、難易度
var upTimeCount = 0;//上にせり出す時間管理

function initVar(){
    col = 4;//blockの種類
    spaceCount = 0;//スペースを押した回数
    dropSpd = 45;//最初の落下速度

    block[0] = 1;//現在のブロック
    block[1] = 2;
    block[2] = 3;
    block[3] = 2;//次のブロック
    block[4] = 3;
    block[5] = 4;

    upTime = 180;//上にせり出す時間、難易度
    upTimeCount = 0;//上にせり出す時間管理
    gameProc = 0;//処理の進行を管理
    gameTime = 30*60*2//タイム
    score = 0;

    seGameoverCount = 0;
}

function mainloop() {
    tmr++;
    drawPzl();
    drawEffect();
    switch(idx){
        case 0://タイトル画面
            drawImgC(7,480,400);//タイトルロゴ
            if(tmr%40 < 20)fText("[← or →] TO START.",480,680,80,"pink");
            if(key[37] > 0 || key[39] > 0 || key[32] > 0  || tapC > 0){
                clrMap();
                initVar();
                clrBlock();
                playBgm(0);
                idx = 1;
                tmr = 0;
            }
            if(tmr==1){
                hisco = loadHighScore();
            }
        break;
        
        case 1://ゲームをプレイ
            if(tmr == 1)
            {
                //音量の初期値設定
                let vol = parseFloat(volumeSlider.value);
                for (let i = 0; i < soundfile.length; i++) 
                {
                    if (soundfile[i]) {
                        soundfile[i].volume = vol;
                    }
                }
            }
            if(procPzl() <= 0){
                stopBgm();
                idx = 2;
                tmr = 0;
            }
        break;

        case 2://ゲームオーバー
            fText("GAME OVER",480,420,100,"violet");
            fText("Thank you for Playing!!",520,520,80,"violet");
            fText("Your Score is ",240,620,70,"red");
            fText(score +" !!",820,620,80,RAINBOW[tmr%8]);

            seGameoverCount++;
            if(seGameoverCount==1){
                playSE(3);
                saveHighScore();
            }
            if(tmr > 30*5){
                idx = 0;
            }
        break;

        case 3://ポーズ中
            fText("PAUSE",480,420,100,"green");
            fText("back to game = [s]",480,500,100,"green");
            if(key[83] > 0){
                //key[83]++;
                //if(key[83]%10==0){
                    idx = 1;
                //}
            }
        break;
    }
}

const HIGH_SCORE_KEY = "highscore";

// ハイスコアを保存（現スコアがハイスコアより高ければ更新）
function saveHighScore() {
  const currentHigh = loadHighScore();
  if (hisco > currentHigh) {
    localStorage.setItem(HIGH_SCORE_KEY, hisco);
  }
}

// ハイスコアを読み込む
function loadHighScore() {
    var n = parseInt(localStorage.getItem(HIGH_SCORE_KEY));
    if(isNaN(n)){n = 0;}
    return n;
}

function procPzl() {//ゲーム中の処理を行う関数
    var c, i, n, x, y;
    movePlayer();
    switch(gameProc) {
        case 0://ブロックの移動
            gameTime--;//(仮)
            upTimeCount++;
            ofsY += scroll;
            
            for(var i=1;i <= 6;i++){//横方向を捜査
                var c = masu[1][i];
                if(c > 0&&masu[2][i]==0){
                    gameProc=2;//ブロックを落とすへ
                    rensa=1;
                    return;
                }
            }
            
            if(upTimeCount%upTime == 0){//180Fに一回せりあがる 
                gameProc=1;//ブロック下から追加へ
                rensa=1;
            }        
        break;

        case 1://下からブロックの追加
            injectBlock();
        break;

        case 2://下のマスが空いているブロックを落とす
            dropBlock();
        break;

        case 3://ブロックが揃ったかの判定
            blocksAligned(c,x,y);
        break;

        case 4://ブロックを消す処理
            deleteBlock(x,y);
        break;
    }
    return gameTime;
}

//X方向6マス、Y方向10マス→判定用にX方向1+6+1=8、Y方向10+1+1=12マス
var masu = new Array(12);//マス目
var kesu = new Array(12);//ブロックを消す判定で使う配列
for(var y=0; y<=12; y++) {//二次元配列の作成
    masu[y] = new Array(7);
    kesu[y] = new Array(7);
}

function clrBlock(){//ブロック初期化
    var x , y;
    for(y=0;y<=11;y++){
        for(x=0;x<=7;x++){
            masu[y][x] = -1;//全体を-1で埋める
        }
    }
    for(y=0;y<=11;y++){
        for(x=1;x<=6;x++){
            masu[y][x] = 0;
            kesu[y][x] = 0;
        }
    }
    for(x=1;x<=6;x++){
        rndInjection();
    }
}

mapdata = new Array(2);
for(var i = 0; i < mapdata.length; i++)mapdata[i] = new Array(8);

function clrMap(){
    var x , y;
    for(y=0;y<=1;y++){
        for(x=0;x<=8;x++){
            mapdata[y][x] = -1;//全体を-1で埋める
        }
    }
    for(y=0;y<=1;y++){
        for(x=1;x<=6;x++){
            mapdata[y][x] = 0;
        }
    }
}

function rndBlock(){//テスト用
    for(y=1;y<=11;y++){
        for(x=1;x<=6;x++){
            masu[y][x] = rnd(6)+1;
        }
    }
}

const SIZE = 80;


//プレイヤーキャラを管理する変数
var plX = 95, plY = 80;
var plXp = 0;
var plYp = 0;
var plDir = 0;
var plAni = 0;
var MG_ANIMA = [0, 0, 1, 1, 0, 0, 2, 2];//魔法少女のアニメパタン
var setBlock = 0;

var spaceCount = 0;
var ofsY = 0;//ブロックずらす用
const scroll = (SIZE/upTime);//1フレームでどれだけずらすか

function movePlayer(){
    //X軸方向の移動
    if(key[37] > 0) {
        if(plXp > 1){plXp -= 8;}
        else if(plXp > -24){plXp -= 2;}
        plDir = -1;
        plAni++;//アニメーション変数を増やす
    }
    else if(key[39] > 0) {
        if(plXp < -1){plXp += 8;}
        else if(plXp < 24){plXp += 2;}
        plDir = 1;
        plAni++;
    }
    else {
        plXp = int(plXp * 0.7);
    }
    //壁にめり込まない限りX座標を変化させる
    var lr = Math.sign(plXp);
    var loop = Math.abs(plXp);
    while(loop > 0){
        if(chkWall(plX+lr,plY) != 0){
            plXp = 0;
            break;
        }
        plX += lr;
        loop--;
    }

    if(key[38]==1&&gameProc!=4&&isTopRowEmpty()){
        key[38]++;
        rensa=1;
        playSE(2);
        gameProc=1;//せり出す
    }

    if(key[65] > 0){//pause
        key[65]++;
        if(key[65] % 5==0 )idx = 3;
    }

    setBlock = int((plX+40)/SIZE);
    if(key[32] == 1){//スペース
        key[32]++;
        if(masu[1][setBlock] == 0){//masu[1段目]の自分の下のブロックが空の時
            masu[1][setBlock] = block[0];
            plDir = 0;

            //連打したらペナルティで色が増える
            spaceCount++;
            if(checkPenalty()){
                if(col ==4)col=5;
                else if(col ==5)col=6;
            }

            //新しい置くブロックを作る。
            for(var i = 0; i <= 5;i++){
                block[i] = block[i+1];
            }
            block[3] = rnd(col)+1;
            if(gameProc == 0){
                for(var i=1;i <= 6;i++){//横方向を捜査
                    var c = masu[1][i];
                    if(c > 0){
                        gameProc=2;//ブロックを落とすへ
                        rensa=1;
                        return;
                    }
                }
            }
        }
        
    }
}

//一番上の列の1‐6が空かどうか
function isTopRowEmpty(){
    y=2;
    for(x=1;x<=6;x++){
        if(masu[y][x]>0){return false;}
    }
    return true;
}

// ペナルティをチェックする関数
function checkPenalty() {
    if (spaceCount >= 24) { // スペースバーが24回以上押された場合
        console.log("ペナルティ発生！"); // ここでペナルティを処理するコードを追加する
        resetSpaceBarCount();
        return true;
    } else {
        setTimeout(resetSpaceBarCount, 12000); // 12秒後にスペースバーカウントをリセットする
    }
}

// スペースバーカウントをリセットする関数
function resetSpaceBarCount() {
    spaceCount = 0;
}

var CXP = [-28,  27, -28, 27];//┬四隅の座標の定義
var CYP = [-36, -36,  35, 35];//┘
var WALL = [0, -1, -1, 0, 0, 0, 0];//チップが壁かを定義(1が壁)
function chkWall(cx, cy) {//壁があるかを調べる関数
    var c = 0;
    if(cx < 80 || 6*SIZE < cx) c++;//ステージの左端と右端
    for(var i=0; i<4; i++) {//四隅を調べる
        var x = int((cx+CXP[i])/SIZE);
        var y = int((cy+CYP[i])/SIZE);
        if(0 <= x && x <=149 && 0<=y && y<=9) {
            if(WALL[mapdata[y][x]] == -1) c++;
        }
    }
    return c;
}

var frame = 0;
var setPrev=0;
function drawPzl(){//ゲーム画面を描画する関数
    var x ,y;
    drawImg(0,0,0);//背景描画
    
    let shakeX;
    if(gameProc==0){
        shakeX = getRandomInt(-10, 10); // x座標のランダムオフセット
    }
    for(y = 0;y <= 10; y++){//パズル部分
        for(x = 1;x <= 6; x++){
            if(masu[y][x]>0){
                if(masu[1][x]>0&&idx==1&&gameProc==0&&key[32] <= 1){//一番上の行が埋まっていて、通常進行の時
                    drawImgS(masu[y][x],(SIZE*x)+shakeX,((SIZE*y)+80)-ofsY,80,80);//揺れる
                }
                else{
                    drawImgS(masu[y][x],SIZE*x,((SIZE*y)+80)-ofsY,80,80);
                }
            }
        }
    }

    setAlp(50);
    for(x = 1;x <= 6; x++){
        if(masu[11][x]>0){
            if(masu[1][x]>0&&idx==1&&gameProc==0&&key[32] <= 1){//一番上の行が埋まっていて、通常進行の時
                drawImgS(masu[y][x],(SIZE*x)+shakeX,((SIZE*y)+80)-ofsY,80,80);//揺れる
            }
            else{
                drawImgS(masu[y][x],SIZE*x,((SIZE*y)+80)-ofsY,80,80);
            }
        }
    }
    setAlp(100);

    //プレイヤーキャラ描画
    if(plDir == -1) drawImgLR(9+MG_ANIMA[plAni%8],plX, plY);//左向き
    if(plDir == 0) drawImg(8, plX, plY);//正面向き
    if(plDir == 1) drawImg(9+MG_ANIMA[plAni%8],plX, plY);//右向き
    //プレイヤーが持っているブロック
    drawImgS(block[0],plX-15, plY-80,80,80);
    //何処に置くかの視覚化    
    for(y=1;y<=11;y++){
        if(masu[y][setBlock]!=0){
            setPrev = y;
            break;
        }
    }
    setAlp(50);
    drawImgS(block[0],(setBlock*SIZE), (setPrev*SIZE)-ofsY,80,80);
    setAlp(100);

    //UI部分
    if(gameProc!=4){
        fTextN("TIME\n"+gameTime,800,280,70,60,"white");
        fTextN("PAUSE=[a]",800,420,70,60,"white");
    }
    fTextN("SCORE\n"+score,800,680,70,60,"white");
    fTextN("HI-SC\n"+hisco, 800, 840, 70, 60, "white");
    for(x=1; x<=3; x++) drawImgS(block[x], 630+80*x, 50,110,100);//ネクストツモ
    frame++;
    sRect(630+80, 50, 100, 100, RAINBOW[frame%8]);
    

    if(gameProc == 4){//消す処理
        const kijunY = 240;
        const kijunX = 800;
        fText("基礎点!10x " +n,kijunX,kijunY+60,50,RAINBOW[tmr%8]);//基礎点
        fText("カラー! x"+col,kijunX,kijunY+60*2,50,RAINBOW[tmr%8]);//種類ボーナス
        if(rensaCount<8){
            fText("連鎖!   x"+rensaCount,kijunX,kijunY+60*3,50,RAINBOW[tmr%8]);//連鎖
        }else{
            fText("連鎖!   x8+",kijunX,kijunY+60*3,50,RAINBOW[tmr%8]);//連鎖
        }
        fText(points+"pts‼",kijunX,kijunY+60*4,50,RAINBOW[tmr%8]);//得点
        if(extend > 0)fText("TIME+"+extend+"!",320,kijunY+60*5,50,RAINBOW[tmr%8]);
    }

}

// 指定された範囲内でランダムな整数を生成する関数
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


var RAINBOW = ["#ff0000", "#e08000", "#c0e000", "#00ff00", "#00c0e0", "#0040ff", "#8000e0"];
var EFF_MAX = 100;
var effX = new Array(EFF_MAX);
var effY = new Array(EFF_MAX);
var effT = new Array(EFF_MAX);
var effN = 0;
for(var i = 0;i<EFF_MAX;i++) {
    effT[i]=0;
}

function setEffect(x,y){
    effX[effN] = x;
    effY[effN] = y;
    effT[effN] = 20;
    effN = (effN+1)%EFF_MAX;
}

function deleteAllEffect(){
    for(var i = 0;i<EFF_MAX;i++){
        if(effT[i]>0){
            effT[i]=0;
        }
    }
}

function drawEffect(){
    lineW(20);
    for(var i = 0;i<EFF_MAX;i++){
        if(effT[i]>0){
            setAlp(effT[i]*5);
            sCir(effX[i],effY[i],110-effT[i]*5,RAINBOW[(effT[i]+0)%8]);
            sCir(effX[i],effY[i], 90-effT[i]*4,RAINBOW[(effT[i]+1)%8]);
            sCir(effX[i],effY[i], 70-effT[i]*3,RAINBOW[(effT[i]+2)%8]);
            effT[i]--;
        }
    }
    setAlp(100);
    lineW(1);
}

function dropBlock(){//ブロックを落とす
    var c = 0;//落としたブロックがあるか
    for(y=11; y>=0; y--) {//【重要】下から上に向かって調べる
        for(x=1; x<=7; x++) {
            if(masu[y][x]>0 && masu[y+1][x]==0) {//ブロックのある下のマスが空
                masu[y+1][x] = masu[y][x];
                masu[y][x] = 0;
                c = 1;
            }
        }
    }
    if(c == 0) gameProc = 3;//全て落としたら、揃ったか確認する
}


var n = 0;//揃ったブロックを数える
function blocksAligned(c,x,y){//揃ったか調べる
    for(y=1; y<=9; y++) {
        for(x=1; x<=6; x++) {
            c = masu[y][x];
            if(c > 0) {
                if(c==masu[y-1][x  ] && c==masu[y+1][x  ]) { kesu[y][x]=1; kesu[y-1][x  ]=1; kesu[y+1][x  ]=1; }//縦に揃っている
                if(c==masu[y  ][x-1] && c==masu[y  ][x+1]) { kesu[y][x]=1; kesu[y  ][x-1]=1; kesu[y  ][x+1]=1; }//横に揃っている
                if(c==masu[y+1][x-1] && c==masu[y-1][x+1]) { kesu[y][x]=1; kesu[y+1][x-1]=1; kesu[y-1][x+1]=1; }//斜め／に揃っている
                if(c==masu[y-1][x-1] && c==masu[y+1][x+1]) { kesu[y][x]=1; kesu[y-1][x-1]=1; kesu[y+1][x+1]=1; }//斜め＼に揃っている
            }
        }
    }
    for(x=1;x<=6;x++){//表示最下段だけの処理
        c = masu[10][x];
        if(c > 0) {
            if(c==masu[y  ][x-1] && c==masu[y  ][x+1]) { kesu[y][x]=1; kesu[y  ][x-1]=1; kesu[y  ][x+1]=1; }//横に揃っている
        }
    }


    n = 0;//揃ったブロックを数える
    for(y=1; y<=10; y++) {
        for(x=1; x<=6; x++) if(kesu[y][x] == 1) {
            n++;
            setEffect((80*x)+40,((80*y)+120)-ofsY);//エフェクト
        }
    }
    //揃った場合のスコア計算
    if(n > 0) {
        playSE(1);
        points = 10*n*col*rensa;//基本点数は消した数
        rensaCount = rensa;
        score += points;
        if(score > hisco)hisco = score;
        extend = 0;
        if(n%5 == 0)extend = upTime*2;//5の倍数の個数を消すとタイムが増える
        gameTime += extend;
        if(rensa >= 8){
            rensa = 8;//8バイが最大
        }else{
            rensa = rensa*2;//連鎖した時、得点が倍々に増える
        }
        
        eftime = 0;
        gameProc = 4;//消す処理へ
    }else{
        if(score > 10000)col = 5;
        if(score > 20000)col = 6;
        block[5] = 1+rnd(col);
        for(x=1;x<=6;x++){
            if(masu[0][x] != 0){
                gameTime=0;//ゲームオーバー
            }else{
                gameProc = 0;//再びブロックの移動へ
            }
        }
    }
}

function deleteBlock(x,y){
    eftime ++;//消えるまでの時間
    if(eftime == 30){
        for(y=1; y<=11; y++) {
            for(x=1; x<=7; x++) {
                if(kesu[y][x] == 1) {
                    kesu[y][x] = 0;
                    masu[y][x] = 0;
                }
            }
        }
        gameProc = 2;//再び落下処理を行う
    }
}

//kesuをリセットする
function kesuReset(){
    for(y=1; y<=11; y++) {
        for(x=1; x<=7; x++) {
            if(kesu[y][x] == 1) {
                kesu[y][x] = 0;
            }
        }
    }
}

function injectBlock(){//下からブロックを追加する
    var x,y;
    ofsY = 0;
    upTimeCount = 0;//上にせり出す時間管理
    kesuReset();
    deleteAllEffect();

    //下からブロックを追加
    for(y=0; y<=10; y++) {
        for(x=1; x<=6; x++) {
            masu[y][x] = masu[y+1][x];
            dropBlock();
        }
    }

    //ブロックを追加した後、０行目が空でないならゲームオーバー
    for(x=1; x<=6; x++) {
        if(masu[0][x] != 0) {
            gameProc=3;
            return;
        }
    }
    rndInjection();
    gameProc = 2;//落とすへ
}

//ランダムでブロックを出すところを工夫する
function rndInjection(){
    y = 11;
    for(x = 1; x <= 6; x++) {
        var usedNumbers = []; // 各ループ内で使用された数字を追跡するための配列をリセット
        do {
            masu[y][x] = 1 + rnd(col);
        } while (isUnderLineAligned() || usedNumbers.includes(masu[y][x]));
        usedNumbers.push(masu[y][x]); // 使用された数字を追加
    }
}

//一番下のラインが揃っているか
function isUnderLineAligned(){
    if(masu[y][x]==masu[y-1][x] && masu[y][x]==masu[y-2][x] ) {
       return true;
    }//縦に揃っている
    if(masu[y][x]==masu[y  ][x-1] && masu[y][x]==masu[y  ][x-2]) {
        return true;
    }//横に揃っている
    if(masu[y][x]==masu[y-1][x+1] && masu[y][x]==masu[y-2][x+2]) {
        return true;
    }//斜め／に揃っている
    if(masu[y][x]==masu[y-1][x-1] && masu[y][x]==masu[y-2][x-2]) {
        return true;
    }//斜め＼に揃っている
    return false;
}