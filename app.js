// --------------- 模組導入 ---------------

const express = require('express');
const cors = require("cors"); //不太懂
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io')

// --------------- 未用到 ---------------

// const createError = require('http-errors');
// const path = require('path');
// const logger = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');

// --------------- 開始 express ---------------
var app = express();

// ---------- 0307 connect -----------------

const server = http.createServer(app);


// ------------------------------------------

// app.listen(8000);
// console.log('http://127.0.0.1:8000');

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(session({
    secret: 'key that will sign cookie',
    resave: false,
    saveUninitialized: false,
}));

app.use(bodyParser.json({ limit: "50mb" }));
app.use(express.json({ limit: '2100000kb' }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }));


// -------------- stock.io -----------------

const io = new Server(server, {
    cors: {
        origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
        method: ["GET", "POST"]
    }
});

let users = {};
io.on("connection", socket => {
    // console.log("USER_CONNECT_ID ", socket.id);

    socket.on("disconnect", () => {
        // // console.log(socket.id, " DISCONNECT")
        // // --- 關視窗後把自己移除 ---
        // for (let user in users) {
        //     if (users[user].socketID === socket.id) {
        //         delete users[user];
        //     }
        // }
        // io.emit('all_user', users);
    })



    // --- 取得現在使用者資訊 ---
    socket.on("new_user", uesrname => {
        // console.log('SERVER: ' + JSON.stringify(uesrname));
        users[uesrname.email] = { ...uesrname, socketID: socket.id };
        io.emit('all_user', users);
    })

    socket.on("send_message", msg => {
        // console.log(msg);
        const socketID = msg.receiver.socketID;
        io.to(socketID).emit("new_message", msg);
    })
})

server.listen(8000, () => {
    console.log("Server Start: http://127.0.0.1:8000");
})

// --------------- 資料庫連接 ---------------
// 資料庫已被獨立出一個檔案，沿用下列語法可以到不同檔案使用資料庫
// const conn = require('./mysql');

// --------------- 路由工作分配 ---------------

// 首頁路由 [Amber]
app.use(require('./routes/index'));
// 設定頁面路由 [侑庭]
app.use(require('./routes/setting'));
// 嚮導路由 [Ju]
app.use(require('./routes/guide'));
// 活動路由 [千翔]
app.use(require('./routes/activities'));
// 個人頁面路由 [嘉原]
app.use(require('./routes/persoal'));
// 社群路由 [與諶]
app.use(require('./routes/society'));

