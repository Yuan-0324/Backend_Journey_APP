var express = require('express');
var router = express.Router();
var conn = require('../mysql');


//filter 地點 時間 類型 室內外 排序

//取得詳細資料
//渲染活動列表
//update event
router.get('/event/show', function (req, res) {
    conn.query('select * from event ORDER BY eventID DESC', [],
        function (err, rows) {
            res.send(JSON.stringify(rows))
        })
})
// or `address` LIKE "%?%" or `introduction` Like "%?%"
//渲染搜尋結果
router.post('/event/activityList/Search',function(req,res){
    console.log(req.body.ActivitySearchContent.ActivitySearchInputLocation);
    conn.query('SELECT * FROM `event` WHERE `title` LIKE ? or `introduction` like ? or  `address` LIKE ? ',[req.body.ActivitySearchContent.ActivitySearchInputValue,req.body.ActivitySearchContent.ActivitySearchInputValue,req.body.ActivitySearchContent.ActivitySearchInputLocation],
    function(err,row){
        res.send(JSON.stringify(row))
    }
    )
})
// router.post('/event/activityIntroduce', async function (req, res) {
//     if (req.body.關鍵字 == '') {
//         123 = '';
//     } else {
//         123 = 'and (欄位1 like ? or 欄位2 like ? or 欄位3 like ?)';
//     };

//     let sql = `select 活動需要的資訊 from 表格 WHERE 地點 = ? ${123} `;
//     let result = await query(sql, [req.body.地點, req.body.關鍵字]);
//     res.send(result);
// })


router.get("/event/activityIntroduceContent/:id", function (req, res) {
    conn.query("SELECT * FROM `event` a JOIN member b where a.eventID = ? and a.post_email=b.email",
        // conn.query("select * from event where eventID = ?", 
        [req.params.id],
        function (err, rows) {
            res.send(JSON.stringify(rows));
        }
    )
})
//各分頁內容
// router.get("/activityIntroduce/:id", function (req, res) {
//     conn.query("SELECT * FROM `event` a JOIN member b where a.eventID = ? and a.post_email=b.email", 
//         [req.params.id],
//         function (err, rows) {
//             res.send( JSON.stringify(rows[0]) );
//         }
//     )
// })
//

//創辦活動資料傳入後端
router.post('/event/conduct', function (req, res) {
    conn.query('select * from member where id = ? ', [req.body.postNewEvent.post_email], function (err, row) {
        // console.log(row[0].email);

        let user_ID=row[0].id;
        // console.log(req.body.postNewEvent.post_email);
        let userEmail = row[0].email;

        // console.log(userEmail);
        conn.query('INSERT INTO `event`(user_ID, `post_email`,  `title`,`introduction`,`date`,`time`,`location`,`address`,`kind`,`people_limit`,indoor,`content`,`precaution`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [   user_ID,
            userEmail, 
            req.body.postNewEvent.title,
            req.body.postNewEvent.introduce,
            req.body.postNewEvent.date,
            req.body.postNewEvent.time,
            req.body.postNewEvent.location,
            req.body.postNewEvent.address,
            req.body.postNewEvent.kind,
            req.body.postNewEvent.Num,
            req.body.postNewEvent.indoor,
            req.body.postNewEvent.content,
            req.body.postNewEvent.precaution], function (err, row) {   
                console.log(row);
                console.log(row.insertId);
                   let nowEventNum =row.insertId.toString()
                   res.send(nowEventNum)
                // conn.query('INSERT INTO (`user_ID`)VALUES (?)',[user_ID],function (err, row){
                // //    console.log(row.insertId);
                // //    let nowEventNum =row.insertId.toString()
                // //    res.send(nowEventNum)   
                // console.log(row);
                // })
    })   
})
})



//送出邀請成功
router.post('/event/activityIntroduce/invite', function (req, res) {
    conn.query('select * from member where id = ? ', [req.body.sendID.user_gmail], function (err, row) {
        let userEmail = row[0].email;
        conn.query('INSERT INTO `event_apply_member`( `eventID`,  `apply_member_email`) VALUES (?,?)',
        [    
            req.body.sendID.eventID,
            userEmail 
           ], function (err, row) {   
            console.log(req.body.sendID.eventID);
            console.log(typeof req.body.sendID.eventID);
            console.log(userEmail);
            console.log(typeof userEmail);
            console.log("OK");
                })
    })   
})
// })

module.exports = router;

//成功傳入後端版

//創辦活動資料傳入後端
// router.post('/event/conduct', function (req, res) {

//     conn.query('select email from member where id = ? ', [req.body.postNewEvent.post_email], function (err, row) {
//         // console.log(row[0].email);
       
//         let user_ID=row[0]
//         let userEmail = row[0].email;
//         console.log(req.body.postNewEvent.title);
//         console.log(row[0]);
//         console.log(user_ID);
//         // console.log(typeof req.body.postNewEvent.post_datetime);
//         conn.query('INSERT INTO `event`(`user_ID`,`post_email`,  `title`,`introduction`,`date`,`time`,`address`,`kind`,`people_limit`,indoor,`content`,`precaution`) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
//         [user_ID,userEmail, req.body.postNewEvent.title,
//                         req.body.postNewEvent.introduce,
//                         req.body.postNewEvent.date,
//                         req.body.postNewEvent.time,
//                         req.body.postNewEvent.address,
//                         req.body.postNewEvent.kind,
//                         req.body.postNewEvent.Num,
//                         req.body.postNewEvent.indoor,
//                         req.body.postNewEvent.content,
//                         req.body.postNewEvent.precaution], function (err, row) {
//                    console.log(row.insertId);
//                    let nowEventNum =row.insertId.toString()
//                    res.send(nowEventNum)

//                 })
//     })
   
// })
//成功上傳版底部


// conn.query('select email from member where id = ? ', [req.body.postNewEvent.post_email], function (err, row) {
//     console.log(row[0].email);
//     let userEmail = row[0].email;
//     console.log(req.body.postNewEvent.title);
//     console.log(req.body.postNewEvent.introduce);
//     console.log(req.body.postNewEvent.date);
//     console.log(req.body.postNewEvent.time);
//     console.log(req.body.postNewEvent.address);
//     console.log(req.body.postNewEvent.kind);
//     console.log(req.body.postNewEvent.Num);
//     console.log(req.body.postNewEvent.indoor);
//     console.log(req.body.postNewEvent.content);
//     console.log(req.body.postNewEvent.precaution);
//     // console.log(typeof req.body.postNewEvent.post_datetime);
//     conn.query('INSERT INTO `event`(`post_email`,  `title`,`introduction`,`date`,`time`,`address`,`kind`,`people_limit`,indoor,`content`,`precaution`) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
//         [userEmail, req.body.postNewEvent.title,
//             req.body.postNewEvent.introduce,
//             req.body.postNewEvent.date,
//             req.body.postNewEvent.time,
//             req.body.postNewEvent.address,
//             req.body.postNewEvent.kind,
//             req.body.postNewEvent.Num,
//             req.body.postNewEvent.indoor,
//             req.body.postNewEvent.content,
//             req.body.postNewEvent.precaution], function (err, row) {
//                 res.send('ok');
//             })
// })

//成功上傳版底部