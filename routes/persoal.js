const e = require('express');
var express = require('express');
const { del } = require('express/lib/application');
var router = express.Router();
var conn = require('../mysql');

// query await 寫法

let query = function (sql, values) {
  return new Promise((resolve, reject) => {
    conn.query(sql, values, function (err, rows) {
      if (err) {
        reject(err)
      } else {
        resolve(rows)
      }
    })
  })
}

// 個人頁面 API

router.get('/personal/:id', function (req, res) {
  async function getData() {
    let sql = "SELECT `email`, `api_selfie`, `lastName`, `firstName`, `place`, `personal_banner` FROM `member` WHERE `id` = ?";
    if (isNaN(+req.params.id)) {
      res.send('error');
    } else {
      let personalInfo = await query(sql, [req.params.id]);
      if (personalInfo[0]) {
        sql = "SELECT `followed_email` FROM `member_follow` WHERE `member_email`= ?";
        let followers = await query(sql, [personalInfo[0].email]);
        res.send({ ...personalInfo[0], followers });
      } else {
        res.send('User Not Found')
      }
    }
  }
  getData();
});

// --- 上傳 Personal Banner ---

router.post('/personal/personal/bannner/change', async function (req, res) {
  let sql = "UPDATE `member` SET `personal_banner` = ? WHERE id = ?";
  let result = await query(sql, [req.body.url, req.body.id])
  // console.log(result)
  res.send('ok');
})

// --- 上傳 Personal Profile ---

router.post('/personal/personal/profile/change', async function (req, res) {
  let sql = "UPDATE `member` SET `api_selfie` = ? WHERE id = ?";
  let result = await query(sql, [req.body.url, req.body.id]);
  res.send('ok');
})

// --- 利用 email 尋找頭貼 ---

router.get('/personal/followed/headshot/:email', async function (req, res) {
  let sql = "SELECT `api_selfie`, `firstName`, `lastName`, `id` FROM `member` WHERE `email`= ?";
  let result = await query(sql, req.params.email);
  res.send(result[0]);
})

// --- 瀏覽使用者追蹤清單 [ GET ] ---

router.get('/personal/followed/list/:id', async function (req, res) {
  let sql = "SELECT mf.`followed_email` FROM `member_follow` mf WHERE mf.`member_email`= (SELECT m.`email`  FROM `member` m WHERE m.`id` = ?)";
  let result = await query(sql, [req.params.id]);
  // console.log(result);
  res.send(result);
})

// --- 登入中使用者的追蹤清單 [ GET ] / [ POST ] / [ DELETE ] ---

router.get('/personal/current_user/:id', async function (req, res) {
  async function getData() {
    let sql = "SELECT mf.`member_email` FROM `member_follow` mf WHERE mf.`followed_email`= (SELECT m.`email` FROM `member` m WHERE `id` = ?)";
    let userFollowed = await query(sql, [req.params.id]);
    res.send(userFollowed);
  }
  getData();
})

router.post('/personal/current_user/followed_add', function (req, res) {
  let postData = async () => {
    let sql = "INSERT INTO `member_follow` (`member_email`, `followed_email`) VALUES (?,?)"
    let result = await query(sql, [req.body.followEamil, req.body.currentUserEmail])
    res.send('ok');
  }
  postData();
})

router.delete('/personal/current_user/followed_add', function (req, res) {
  let deleteDate = async () => {
    let sql = "DELETE FROM `member_follow` WHERE `member_email` = ? AND `followed_email` = ?"
    let result = await query(sql, [req.body.followEamil, req.body.currentUserEmail])
    res.send('ok');
  }
  deleteDate();
})

// 嚮導評價 API [ GET ]

router.get('/personal/guide/review/:id', async function (req, res) {
  async function getData() {
    // 取得 email
    let sql = "SELECT `email` FROM `member` WHERE id = ?";
    let email = await query(sql, [req.params.id]);
    // 取得未評價的訂單記錄
    sql = "SELECT `reservation_number`, `reservation_date`, `guide_email`, `confirmed` FROM `guide_member_reservation` WHERE `reservation_date` < now() AND `member_email` = ? AND `evaluated` = false AND `confirmed` = true ";
    let reservation = await query(sql, [email[0].email]);
    // 取得未評價的嚮導資料
    let guideArr = [];
    for (i = 0; i < reservation.length; i++) {
      sql = "SELECT `id`, `api_selfie`, `firstName`, `lastName` from `member` WHERE `email` = ?";
      let guide = await query(sql, [reservation[i].guide_email]);
      // 講兩份資料合併
      guideArr.push({ ...guide[0], ...reservation[i] });
    }
    res.send(guideArr);
  }
  getData();

});

// Post Reviews Stars

router.post('/personal/reviews/stars/', async function (req, res) {
  let sql = "INSERT INTO `guide_comment` (`star`, `content`, `reservation_number`) VALUES (?,?,?)";
  let result = await query(sql, [req.body.star, req.body.content, req.body.reservation_number])
  sql = "UPDATE `guide_member_reservation` SET `evaluated` = true WHERE `reservation_number` = ?";
  let done = await query(sql, [req.body.reservation_number]);
  res.send('ok')

})


// 我的活動 API [ 完成 ]

router.get('/personal/activity/:id', async function (req, res) {
  let sql = "SELECT e.`eventID`, e.`title`, e.`introduction`, e.`date` as evt_date, e.`time` as evt_time, e.`location` FROM `event` e WHERE e.`post_email` = (SELECT m.`email` FROM `member` m WHERE id = ?)";
  let evt = await query(sql, [req.params.id]);
  sql = "SELECT `api_pic` FROM `event_pic` WHERE `eventID` = ?";
  let eventList = []

  for (i = 0; i < evt.length; i++) {

    let evtPic = await query(sql, [evt[i].eventID]);

    let eventDate = evt[i].evt_date;
    let eventTime = evt[i].evt_time;

    eventList = [...eventList, { ...evtPic[0], ...evt[i], eventDate, eventTime }];
  }

  res.send(eventList);
})

// 我的文章列表 API [ 完成 ]

router.get('/personal/article_list/:id', async function (req, res) {
  let sql = "SELECT a.`articleID`, a.`datetime`, a.`content`, a.`post_email`, a.`num_share` FROM `article` a WHERE a.`post_email` = (SELECT m.`email` FROM member m WHERE id = ?) AND a.`societyID` = 0 ORDER BY a.`datetime` DESC";
  let articles = await query(sql, [req.params.id]);
  let articleList = [];
  sql = "SELECT `member_email` FROM `article_likes` WHERE `articleID` = ?";
  innerSQL = "SELECT `id`, `firstName`, `lastName`, `api_selfie` FROM `member` WHERE `email` = ?"
  for (let i = 0; i < articles.length; i++) {
    let articleLikeMember = await query(sql, [articles[i].articleID]);
    articleLikeMember = articleLikeMember.map(follow => follow.member_email)

    // let newMemberList = [];
    // for (let k = 0; k < articleLikeMember.length; k++) {
    //   let memberDetail = await query(innerSQL, [articleLikeMember[k]])
    //   newMemberList = [...newMemberList, {email:articleLikeMember[k], firstName: memberDetail[0].firstName, lastName: memberDetail[0].lastName, api_selfie: memberDetail[0].api_selfie}]
    // }
    // articleList = [...articleList, { ...articles[i], member_email: [...newMemberList], like_nums: newMemberList.length }]

    articleList = [...articleList, { ...articles[i], member_email: [...articleLikeMember], like_nums: articleLikeMember.length }]
  }
  res.send(articleList);
})

// 我的文章回覆 [ 完成 ]

router.get('/personal/article/detail/info/:id', async function (req, res) {
  let sql = "SELECT `articleID`, `messageID`, `son_messageID`, `reply_email`, `content`, `datetime` FROM `article_message` WHERE `articleID` = ? ORDER BY `datetime` DESC";
  let result = await query(sql, [req.params.id]);
  res.send(result)
})

// 文章回覆的使用者資訊 [ 未完成 ]

router.get('/personal/comment/user/:email', async function (req, res) {
  let sql = " SELECT `id`, `firstName`, `lastName`, `api_selfie` FROM `member` WHERE `email` = ? "
  let result = await query(sql, [req.params.email]);
  res.send(result);
})

// 文章父留言

router.post('/personal/article/father/comments', async function (req, res) {
  let sql = "INSERT INTO `article_message` (`articleID`, `reply_email`, `content`, `datetime`) VALUES (?,?,?,?)";
  let preContent = `<pre>${req.body.content}</pre>`
  let result = await query(sql, [req.body.articleID, req.body.reply_email, preContent, req.body.datetime]);
  // console.log(req.body);
  res.send('ok')
})

// 文章子留言

router.post('/personal/article/son/comments', async function (req, res) {
  let sql = "INSERT INTO `article_message` (`articleID`, `son_messageID`, `reply_email`, `content`, `datetime`) VALUES (?,?,?,?,?)";
  let preContent = `<pre>${req.body.content}</pre>`
  let result = await query(sql, [req.body.articleID, req.body.son_messageID, req.body.reply_email, preContent, req.body.datetime]);
  res.send('ok');
})

// 按讚確認 加入

router.post('/personal/article/like/count', async function (req, res) {
  let sql = "INSERT INTO `article_likes` (`articleID`, `member_email`) VALUES (?,?)";
  let result = await query(sql, [req.body.articleID, req.body.email]);
  res.send(result);
})

// 按讚 取消

router.delete('/personal/article/like/count/delete', async function (req, res) {
  let sql = "DELETE FROM `article_likes` WHERE `articleID` = ? AND `member_email` = ?";
  let result = await query(sql, [req.body.articleID, req.body.email]);
  res.send(result);
})

// ------ 通知 GET 總集 --------

// 發送 嚮導 
router.post('/personal/invitation/reply/guide/send/', async function (req, res) {
  let sql = "SELECT rn.`reservation_number`, rn.`reservation_date`, rn.`order_date`, rn.`confirmed`, g.`location`, m.`firstName`, m.`lastName`, m.`api_selfie` FROM `guide_member_reservation` rn JOIN `guide` g ON (rn.`guide_email` = g.`email`) JOIN `member` m ON (rn.`guide_email` = m.`email`) WHERE rn.`member_email` = ? AND rn.`reservation_date` > now() AND rn.`confirmed` IS NULL";
  let result = await query(sql, [req.body.email])
  res.send(result);
})
// 收到 嚮導 

// 發送 活動
router.post('/personal/invitation/reply/activity/send', async function (req, res) {
  let sql = "SELECT eam.`eventID`, eam.`confirmed`, eam.`apply_date`, e.`post_email`, e.`date` AS `evt_date`, e.`title` AS `evt_name`, e.`location`, m.`firstName`, m.`lastName`, m.`api_selfie` FROM `event` e JOIN `event_apply_member` eam USING ( `eventID` ) JOIN `member` m ON (e.`post_email` = m.`email`) WHERE eam.`apply_member_email` = ? AND eam.`confirmed` IS NULL";
  let result = await query(sql, [req.body.email]);
  res.send(result);
})
// 收到 活動

// 發送 社團
router.post('/personal/invitation/reply/society/send', async function (req, res) {
  let sql = "SELECT smr.`societyID`, smr.`confirmed_join`, smr.`apply_date`, s.`society_name`, s.`selfie` FROM `society_member_right` smr JOIN `society` s USING (`societyID`) WHERE smr.`member_email` = ? AND smr.`confirmed_join` IS NULL";
  let result = await query(sql, [req.body.email]);
  res.send(result);
})
// 收到 社團

// ------ 通知 POST 總集 --------

// 發送 嚮導 [ 取消 ]
router.delete('/personal/invitation/reply/guide/cancel', async function (req, res) {
  let sql = "DELETE FROM `guide_member_reservation` WHERE `reservation_number` = ? AND `member_email` = ?";
  let result = await query(sql, [req.body.reservation_number, req.body.email]);
  res.send('ok');
})
// 發送 活動 [ 取消 ]
router.delete('/personal/invitation/reply/activity/cancel', async function (req, res) {
  let sql = "DELETE FROM `event_apply_member` WHERE `eventID` = ? AND `apply_member_email` = ?";
  let result = await query(sql, [req.body.eventID, req.body.email]);
  res.send('ok');
})
// 發送 社團 [ 取消 ]
router.delete('/personal/invitation/reply/society/cancel', async function (req, res) {
  let sql = "DELETE FROM `society_member_right` WHERE `societyID` = ? AND `member_email` = ?";
  let result = await query(sql, [req.body.societyID, req.body.email]);
  res.send('ok')
})
// 收到 嚮導 [ 接受 / 拒絕 ]

// 收到 活動 [ 接受 / 拒絕 ]

// 收到 社團 [ 接受 / 拒絕 ]



// --- Chat Hisdtory ---

router.get('/personal/chat/room/history/:roomID', async function (req, res) {
  let sql = "SELECT * FROM `message_arr` WHERE `room_num` = ?";
  let result = await query(sql, [req.params.roomID]);
  res.send(result);
})

router.post('/personal/chat/room/add', async function (req, res) {
  let sql = "INSERT INTO `message_arr` (`room_num`, `sender`, `receiver`, `message`) VALUES (?,?,?,?)";
  let result = await query(sql, [req.body.room_num, req.body.sender, req.body.receiver, req.body.message]);
  res.send(result);
  // console.log(result);
  console.log(req.body)
})

module.exports = router;
