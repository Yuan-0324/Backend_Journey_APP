var express = require('express');
var router = express.Router();
var conn = require('../mysql');

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

//guideSearch
//熱門嚮導(按點擊率)
router.get(`/guideSearch/guidePopular`, function (req, res) {
    // conn.query(`select g.guide_id, (CASE WHEN g.level=1 THEN 'Lv1.菜鳥嚮導' WHEN g.level=2 THEN 'Lv2.在地嚮導' WHEN g.level=3 THEN 'Lv3.進階嚮導' WHEN g.level=4 THEN 'Lv4.高級嚮導' WHEN g.level=5 THEN 'Lv5.資深嚮導' WHEN g.level=6 THEN 'Lv6.頂尖嚮導' END) level, g.avg_star, g.location, concat(m.lastName, m.firstName)guide_name, m.api_selfie, s.viewpoint from guide g join member m using (email) join guide_suggest s using (email) where g.avg_star>=4 order by g.ctr desc limit 8`, [],
    //     function (err, row) {
    //         res.send(JSON.stringify(row));
    //     });

    conn.query(`select g.guide_id, (CASE WHEN g.level=1 THEN 'Lv1.菜鳥嚮導' WHEN g.level=2 THEN 'Lv2.在地嚮導' WHEN g.level=3 THEN 'Lv3.進階嚮導' WHEN g.level=4 THEN 'Lv4.高級嚮導' WHEN g.level=5 THEN 'Lv5.資深嚮導' WHEN g.level=6 THEN 'Lv6.頂尖嚮導' END) level, g.avg_star, g.location, concat(m.lastName, m.firstName)guide_name, m.api_selfie, s.viewpoint from guide g join member m using (email) join guide_suggest s using (email) order by g.ctr desc limit 8`, [],
        function (err, row) {
            res.send(JSON.stringify(row));
        });
});

//搜尋嚮導
router.post('/guideSearch/searchResults', async function (req, res) {
    //判斷性別
    if (req.body.acceptGender == '不限') {
        gender = '';
    } else if (req.body.acceptGender == '男') {
        gender = 'AND (g.sex_limit = "男" OR g.sex_limit = "不限")';
    } else {
        gender = 'AND (g.sex_limit = "女" OR g.sex_limit = "不限")';
    };
    //判斷交通
    if (req.body.transportation == '不限') {
        vehicle = '';
    } else if (req.body.transportation == '汽車') {
        vehicle = 'AND g.vehicle = "汽車"';
    } else if (req.body.transportation == '機車') {
        vehicle = 'AND g.vehicle = "機車"';
    } else {
        vehicle = 'AND g.vehicle = "大眾交通"';
    };
    //判斷日期
    if (req.body.dateValue == null) {
        date = '';
    } else {
        date = 'AND g.email = ANY(SELECT a.email from guide_avaliable_date a where a.date = ?)'
    }
    let sql = `select g.guide_id, CASE g.level WHEN 1 THEN 'Lv1.菜鳥嚮導' WHEN 2 THEN 'Lv2.在地嚮導' WHEN 3 THEN 'Lv3.進階嚮導' WHEN 4 THEN 'Lv4.高級嚮導' WHEN 5 THEN 'Lv5.資深嚮導' WHEN 6 THEN 'Lv6.頂尖嚮導' END 'level', g.avg_star, g.location, concat(m.lastName, m.firstName)guide_name, m.api_selfie, s.viewpoint from guide g join member m using (email) join guide_suggest s using (email) WHERE g.num_limit >= ? AND g.location = ? ${gender} ${vehicle} ${date}`;
    let result = await query(sql, [req.body.acceptNum, req.body.cityValue, req.body.dateValue]);
    res.send(result);
})

//點擊率
router.put(`/guideSearch/guideClick/:gId`, function (req, res) {
    conn.query(`UPDATE guide SET ctr = (ctr+1) WHERE guide.guide_id = ${req.params.gId}`, [],
        function (err, row) {
            res.send('');
        });
});

// JoinGuide-----------------------------------
router.post('/guideJoin', async function (req, res) {

    console.log(req.body);

    //基本資料
    let sql1 = 'insert into `guide`(`email`, `introduction`, `location`, `num_limit`, `sex_limit`, `vehicle`) values (?, ?, ?, ?, ?, ?)';
    await query(sql1, [req.body.guideEmail, req.body.introduction, req.body.cityValue, req.body.countNum, req.body.acceptGender, req.body.transportation]);

    //推薦景點、餐廳
    let sql2 = 'insert into `guide_suggest`(`email`, `viewpoint`, `restaurant`) values (?, ?, ?)';
    await query(sql2, [req.body.guideEmail, req.body.viewpoint, req.body.restaurant]);

    //照片
    let sql3 = 'insert into `guide_pic`(`guide_email`, `Img1`, `Img2`, `Img3`, `Img4`) values (?, ?, ?, ?, ?)';
    await query(sql3, [req.body.guideEmail, req.body.guideImg[0], req.body.guideImg[1], req.body.guideImg[2], req.body.guideImg[3]]);

    //修改是否為嚮導
    let sql4 = 'UPDATE member SET member_is_guide = 1 WHERE email = ?';
    await query(sql4, [req.body.guideEmail]);

    //接待日期
    async function postData() {
        let dateArray = req.body.dateArray;
        for (let i = 0; i < dateArray.length; i++) {
            let sql5 = 'insert into `guide_avaliable_date`(`email`, `date`) values (?, ?)';
            await query(sql5, [req.body.guideEmail, dateArray[i]]);
        }
        res.send('');
    }
    postData();

});


//guidePersonal--------------------------------

//topIntroduction
router.get(`/guidePersonal/topIntroduction/:gId`, function (req, res) {
    conn.query(`select g.level, g.avg_star, g.introduction, g.location, concat(m.lastName, m.firstName)guide_name, m.api_selfie from guide g join member m using (email) where g.guide_id = ${req.params.gId}`, [],
        function (err, row) {
            let result1 = row;
            conn.query(`select count(commentID)commentNum from guide_comment where reservation_number = ANY(select reservation_number from guide_member_reservation where guide_email = (select email from guide where guide_id = ${req.params.gId}))`, [],
                function (err, row) {
                    const result = { ...result1[0], ...row[0] }
                    res.send(result);
                });
        });
});

//aboutMe
router.get(`/guidePersonal/aboutMe/:gId`, function (req, res) {
    conn.query(`select g.num_limit, g.sex_limit, g.vehicle, m.interested, s.viewpoint, s.restaurant from guide g join member m using (email) join guide_suggest s using (email) where g.guide_id = ${req.params.gId}`, [],
        function (err, row) {
            res.send(JSON.stringify(row));
        });
});

//calendar
//撈取嚮導可預約日期
router.get(`/guidePersonal/calendar/:gId`, function (req, res) {
    conn.query(`select a.date from guide_avaliable_date a where a.email = (select g.email from guide g where g.guide_id = ${req.params.gId}) and a.date > now()`, [],
        function (err, row) {
            res.send(JSON.stringify(row));
        });
});
//刪除已被預約的日期
router.delete(`/guidePersonal/calendar/deleteDate/:gId`, function (req, res) {
    conn.query(`delete from guide_avaliable_date where date = '${req.body.changeDate}' and email = (select email from guide where guide_id = ${req.params.gId});`, [],
        function (err, row) {
            if (!err) {
                res.send('刪除成功');
            } else {
                res.send(`刪除預約 : ${err}`);
            }
        });
});
//加入預約清單
router.post(`/guidePersonal/calendar/reservation/:gId`, function (req, res) {
    conn.query(`INSERT INTO guide_member_reservation ( guide_email, member_email, reservation_date ) SELECT email, ?, ? FROM guide WHERE guide_id = ${req.params.gId}`,
        [req.body.memberEmail, req.body.reservationDate],
        function (err, row) {
            if (!err) {
                res.send('預約成功');
            } else {
                res.send(`預約 : ${err}`);
            }
        });
});

//ImgArea
router.get(`/guidePersonal/ImgArea/:gId`, function (req, res) {
    conn.query(`select Img1, Img2, Img3, Img4 from guide_pic where guide_email = (select email from guide where guide_id = ${req.params.gId})`, [],
        function (err, row) {
            res.send(row);
        });
});

//evaluation
router.get(`/guidePersonal/evaluation/:gId`, function (req, res) {
    conn.query(`select c.commentID, concat(m.lastName, m.firstName)evaluator, m.api_selfie, c.star, date_format(c.evaluate_date,"%Y-%m-%d")evaluate_date, c.content from guide_comment c join guide_member_reservation r using (reservation_number) join member m on (m.email = r.member_email) where r.guide_email = (select g.email from guide g where g.guide_id = ${req.params.gId})`, [],
        function (err, row) {
            res.send(JSON.stringify(row));
        });
});

//嚮導設定-日曆
//撈取原有日期
router.get(`/guide/calendar/:gId`, function (req, res) {
    conn.query(`select a.date from guide_avaliable_date a where a.email = (select g.email from guide g where g.guide_id = ${req.params.gId}) and a.date > now()`, [],
        function (err, row) {
            res.send(JSON.stringify(row));
        });
});
//刪除日期
router.post('/guide/calendarChange/delete/:gId', async function (req, res) {
    async function postData() {
        const deleteArr = req.body;
        for (let i = 0; i < deleteArr.length; i++) {
            let sql = `delete from guide_avaliable_date where date = '${deleteArr[i]}' and email = (select email from guide where guide_id = ${req.params.gId})`;
            await query(sql, []);
        };
        res.send('');
    };
    postData();
});
//新增日期
router.post('/guide/calendarChange/add/:email', async function (req, res) {
    async function postData() {
        const addArr = req.body;
        for (let i = 0; i < addArr.length; i++) {
            let sql = `insert into guide_avaliable_date(email, date) values (?, ?)`;
            await query(sql, [req.params.email, addArr[i]]);
        };
        res.send('');
    };
    postData();
});

// 去個人頁面
router.get('/guide/goto/personal/:gId', async function(req, res) {
    let sql = "select m.id from member m join guide g using (email) where g.guide_id = ?";
    let result = await query(sql, [req.params.gId]);
    res.send(result);
})

//撈gid
router.get('/guide/guide_id/:email', async function(req, res) {
    let sql = "select guide_id from guide where email = ?";
    let result = await query(sql, [req.params.email]);
    res.send(result);
})

//個人日曆  
router.get(`/personalCalendar/:email`, async function (req, res) {
    //自己是嚮導
    let sql1 = 'select r.reservation_date, g.location, m.id from guide_member_reservation r join guide g on (g.email = r.guide_email) join member m on (r.member_email = m.email) where r.confirmed = 1 and r.guide_email= ?';
    let result1 = await query(sql1, [req.params.email]);
    //參加別人嚮導
    let sql2 = 'select r.reservation_date, g.location, g.guide_id from guide_member_reservation r join guide g on (g.email = r.guide_email) where r.confirmed = 1 and r.member_email = ?';
    let result2 = await query(sql2, [req.params.email]);
    //活動
    let sql3 = 'select DISTINCT e.location, e.date, e.eventID from event e Join event_apply_member a using (eventID) where post_email = ? or (a.apply_member_email = ? and a.confirmed =1 )';
    let result3 = await query(sql3, [req.params.email, req.params.email]);
    //結合
    let results =[result1, result2, result3]
    res.send(results);
}); 

module.exports = router;