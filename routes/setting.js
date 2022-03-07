const express = require('express');
const router = express.Router();
const conn = require('../mysql');//資料庫連接
const bcrypt = require('bcrypt');//加解密

//--------------- 一般設定/general/get取值渲染、Context取值 ---------------

router.post('/general/get', function (req, res) {
    // console.log(req.body);
    //字串處理
    let catchEmail = JSON.stringify(req.body);
    let email = catchEmail.substring(2, catchEmail.length - 5);
    // console.log(email);

    conn.query('SELECT `lastName`,`firstName`,`birthday`,`id`,`email`,`place` FROM member WHERE email =' + `'${email}'`,
        [],
        function (err, row) {
            // console.log(row);
            res.send(JSON.stringify(row));
        })
})

//--------------- 嚮導設定/guide/get 取值渲染 ---------------

router.post('/guide/getData', function (req, res) {
    // console.log(req.body);
    //字串處理
    let catchEmail = JSON.stringify(req.body);
    let firstEmail = catchEmail.substring(0, catchEmail.length - 5);
    let email = firstEmail.substring(2);
    // console.log(email);
    conn.query('SELECT g.`introduction`, g.`location`, g.`num_limit`, g.`sex_limit`, g.`vehicle`,s.`viewpoint`,s.`restaurant` FROM `guide` g JOIN guide_suggest s USING (email) WHERE email =' + `'${email}'`,
        [req.body.email],
        function (err, row) {
            // console.log(row);
            res.send(JSON.stringify(row));
        })

})

router.post('/guide/judge', function (req, res) {
    console.log(req.body);
    conn.query('SELECT `member_is_guide` FROM member WHERE email = ?'),
        [req.body.email],
        function (err, row) {
            res.send(row)
            // if () {
            //     res.send('此用戶不是嚮導')
            // }
        }
})

//--------------- 嚮導設定/guide/set 修改嚮導資訊 ---------------

//自我介紹
router.put('/guide/setIntro', function (req, res) {
    // new promise((resolve, reject)=>{
    // console.log(req.body);
    conn.query('UPDATE `guide` SET `introduction` = ?WHERE email =?',
        [req.body.intro, req.body.email],
        function (err, row) {
            res.send('設定成功');
        })
    // })
})

//接待人數
router.put('/guide/setNum', function (req, res) {
    // new promise((resolve, reject)=>{
    // console.log(req.body);
    conn.query('UPDATE `guide` SET `num_limit`=? WHERE email =?',
        [req.body.num, req.body.email],
        function (err, row) {
            res.send('設定成功');
        })
    // })
})

//接待性別
router.put('/guide/setGender', function (req, res) {
    // new promise((resolve, reject)=>{
    // console.log(req.body);
    conn.query('UPDATE `guide` SET `sex_limit`=? WHERE email =?',
        [req.body.gender, req.body.email],
        function (err, row) {
            res.send('設定成功');
        })
    // })
})

//交通工具
router.put('/guide/setTrans', function (req, res) {
    // new promise((resolve, reject)=>{
    // console.log(req.body);
    conn.query('UPDATE `guide` SET `vehicle`=? WHERE email =?',
        [req.body.trans, req.body.email],
        function (err, row) {
            res.send('設定成功');
        })
    // })
})

//嚮導城市
router.put('/guide/setCity', function (req, res) {
    // new promise((resolve, reject)=>{
    // console.log(req.body);
    conn.query('UPDATE `guide` SET `location`=? WHERE email =?',
        [req.body.city, req.body.email],
        function (err, row) {
            res.send('設定成功');
        })
    // })
})

//推薦景點
router.put('/guide/setRecomman', function (req, res) {
    // new promise((resolve, reject)=>{
    // console.log(req.body);
    conn.query('UPDATE `guide_suggest` SET `viewpoint`=? WHERE email =?',
        [req.body.recomman, req.body.email],
        function (err, row) {
            res.send('設定成功');
        })
    // })
})

//推薦餐廳
router.put('/guide/setRestaurant', function (req, res) {
    // new promise((resolve, reject)=>{
    // console.log(req.body);
    conn.query('UPDATE `guide_suggest` SET `restaurant`=? WHERE email =?',
        [req.body.restaurant, req.body.email],
        function (err, row) {
            res.send('設定成功');
        })
    // })
})


//--------------- 一般設定/general/set 修改個人資訊 ---------------

//名字
router.put('/general/setName', function (req, res) {
    // new promise((resolve, reject)=>{
    // console.log(req.body);
    conn.query('UPDATE `member` SET `lastName` = ?, `firstName` = ?WHERE email = ?',
        [req.body.lastName, req.body.firstName, req.body.email],
        function (err, row) {
            res.send('設定成功');
        })
    // })
})

//email
router.put('/general/setEmail', function (req, res) {
    // new promise((resolve, reject)=>{
    // console.log(req.body);
    conn.query('UPDATE `member` SET `email` = ? WHERE id = ?',
        [req.body.email, req.body.userId],
        function (err, row) {
            res.send('設定成功');
        })
    // })
})

//居住地
router.put('/general/setPlace', function (req, res) {
    // new promise((resolve, reject)=>{
    // console.log(req.body);
    conn.query('UPDATE `member` SET `place` = ? WHERE `member`.`email` = ?',
        [req.body.place, req.body.email],
        function (err, row) {
            // console.log(row);
            res.send('設定成功');
        })
    // })
})

//birthday
router.put('/general/setBirthday', function (req, res) {
    // new promise((resolve, reject)=>{
    console.log(req.body);
    conn.query('UPDATE `member` SET `birthday` = ? WHERE `member`.`email` = ?',
        [req.body.birthday, req.body.email],
        function (err, row) {
            // console.log(row);
            res.send('設定成功');
        })
    // })
})

//--------------- 用戶安全/safety/set ---------------

//備註:資料結構{email: , password: , newPassword}，email從localstorage取
router.post('/safety/set', function (req, res) {
    // new promise((resolve, reject)=>{
    conn.query('SELECT `password` FROM `member` WHERE email = ?',
        [req.body.email], function (err, row) {
            //-----解密處理-----
            const hashPassword = row[0].password; // 資料庫加密後的密碼
            const userPassword = req.body.password; // 使用者登入輸入的密碼
            bcrypt.compare(userPassword, hashPassword, function (err, res) {
                if (hashPassword == userPassword) {
                    conn.query('UPDATE `member` SET `password` = ? WHERE email = ?',
                        [req.body.newPassword, req.body.email], function (err, row) {
                            res.send('設定成功');
                        })
                } else {
                    res.send('您輸入的密碼有誤!');
                }
            })
        })
    // })
})

//---------------忘記密碼---------------

//--------------- 隱私設定/privacy/block ---------------
router.post('/privacy/block', function (req, res) {
    // new promise((resolve, reject)=>{
    conn.query('UPDATE `member` SET `lastName` = ?, `firstName` = ?,`place` = ? WHERE email = ?',
        [req.body.lastName, req.body.firstName, req.body.place, req.body.email],
        function (err, row) {
            res.send('設定成功');
        })
    // })
})

//---------------  ---------------
//put 姓名 信箱 位置 密碼

//put  封鎖名單

module.exports = router;
