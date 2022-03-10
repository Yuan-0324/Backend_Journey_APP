var express = require('express');
var router = express.Router();
var conn = require('../mysql');

//將sql合併成一個陣列，再傳入前端
const query = function (sql, values) {
    return new Promise((resolve, reject) => {
        conn.query(sql, values, function (err, rows) {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        })
    })
}


//filter 地點 時間 類型 室內外 排序

//取得詳細資料
//渲染活動列表
//update event
router.get('/event/show', function (req, res) {
    conn.query('select * from event ORDER BY post_datetime ', [],
        function (err, rows) {
            res.send(JSON.stringify(rows))
        })
})
// or `address` LIKE "%?%" or `introduction` Like "%?%"
//渲染搜尋結果


router.post('/event/activityList/Search', function (req, res) {
    conn.query('SELECT * FROM `event` WHERE `title` LIKE ? or `introduction` like ? or  `address` LIKE ? ', [req.body.ActivitySearchContent.ActivitySearchInputValue, req.body.ActivitySearchContent.ActivitySearchInputValue, req.body.ActivitySearchContent.ActivitySearchInputLocation],
        function (err, row) {
            res.send(JSON.stringify(row))
        }
    )
})

//點擊前往對應頁面
router.get("/event/activityIntroduceContent/:id", function (req, res) {
    conn.query("SELECT * FROM `event` a JOIN member b where a.eventID = ? and a.post_email=b.email",
        // conn.query("select * from event where eventID = ?", 
        [req.params.id],
        function (err, rows) {
            res.send(JSON.stringify(rows));
        }
    )
})
//將既有資料導入
router.post('/event/activityEdit/existingData', function (req, res) {
    conn.query('select * from event where `eventID` =  ? ', [req.body.eventID], function (err, row) {
        console.log(row[0]);
        res.send(JSON.stringify(row[0]))
    })
})
//將修改好的資料回傳後端
router.post('/event/activityEdit/NewData', function (req, res) {
    conn.query(`UPDATE event Set introduction= ? , kind= ?,people_limit=?,indoor= ? ,content= ? where eventID = ? `, 
    [req.body.existingData.introduction,
        req.body.existingData.kind,
        req.body.existingData.people_limit,
        req.body.existingData.indoor,
        req.body.existingData.content,
        req.body.eventID
    ], function (err, row) {
    //    console.log(req.body.existingData.indoor);
    //    console.log( req.body.existingData.content);
    })
})

//創辦活動資料傳入後端
router.post('/event/conduct', function (req, res) {
    conn.query('select * from member where id = ? ', [req.body.postNewEvent.post_email], function (err, row) {
        let user_ID = row[0].id;
        let userEmail = row[0].email;
        conn.query('INSERT INTO `event`(user_ID, `post_email`,  `title`,`introduction`,`date`,`time`,`location`,`address`,`kind`,`people_limit`,indoor,`content`,`precaution`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
            [user_ID,
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
                    let nowEventNum = row.insertId.toString()
                    res.send(nowEventNum)
                })
    })
});
// //送出邀請成功
router.post('/event/activityIntroduce/invite', function (req, res) {
    conn.query('select * from member where id = ? ', [req.body.sendID.user_gmail], function (err, row) {
        let userEmail = row[0].email;
        conn.query('INSERT INTO `event_apply_member`( `eventID`,  `apply_member_email`) VALUES (?,?)',
            [
                req.body.sendID.eventID,
                userEmail
            ], function (err, row) {
                console.log("OK");
            })
    })
})
// })
//顯示參加人數
router.get('/activity/applicants/:eventID', async function (req, res) {
    let sql1 = "select user_ID from event where eventID = ? ";
    let result1 = await query(sql1, [req.params.eventID]);
    let sql2 = "select concat(m.lastName, m.firstName)name, m.id, m.api_selfie from member m join event_apply_member a on (a.apply_member_email = m.email) where a.confirmed = 1 and a.eventID = ? ";
    let result2 = await query(sql2, [req.params.eventID]);
    let results = [result1, result2]
    res.send(results);
})

//編輯活動



module.exports = router;
//成功傳入後端版

