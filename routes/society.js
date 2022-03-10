const { promise, reject } = require('bcrypt/promises');
const express = require('express');
const { getDefaultFlags } = require('mysql/lib/ConnectionConfig');
const router = express.Router();
const multer = require('multer');

// --------------- 資料庫連接 ---------------
const conn = require('../mysql');

let query = function (sql, values) {
  return new Promise((resolve, reject) => {
    conn.query(sql, values, function (err, rows) {
        // console.log("ok1");
        if (err) {
            reject(err)
        } else {
            resolve(rows)
        }
    })
  })
}

//搜尋人random
router.post('/search/random',async function(req,res){
  let getSearchMember = "Select * From ( SELECT id, api_selfie, lastName, firstName, CASE WHEN email in (SELECT b.member_email FROM `member` a join `member_follow` b WHERE a.email = b.followed_email and a.id = ?) THEN 1 ELSE 0 END AS followed from member c where concat(firstName,lastName) like ? ) e Where e.id!=1 ORDER BY RAND() LIMIT 10";
  let result = await query(getSearchMember,[req.body.id, '%%']);
  res.send(result);
})

//社團random  
router.post('/search/grouprand',async function(req,res){
  let getSearchMember = "Select * From (SELECT societyID, bg_pic, society_name, CASE WHEN societyID in (SELECT societyID FROM `society_member_right` a join member b WHERE a.member_email = b.email and id = ?) THEN 1 ELSE 0 END AS attended from society where concat(society_name) like ?)e ORDER BY RAND() LIMIT 10";
  let result = await query(getSearchMember,[req.body.id, '%%']);
  try {
    result.map((elm,idx)=>{
      if(elm.bg_pic!=null){
        elm.bg_pic = Buffer.from(elm.bg_pic).toString('base64') 
      }  
    })
    res.send(result);
  } catch(err) {
    next(err.sqlMessage || err);
  }
})

//搜尋人 selfie lastName firstName followed
router.post('/search/member',async function(req,res){
  let getSearchMember = "SELECT id, api_selfie, lastName, firstName, CASE WHEN email  in (SELECT b.followed_email FROM `member` a join `member_follow` b WHERE a.email = b.member_email and a.id = ?) THEN 1 ELSE 0 END AS followed from member c where concat(firstName,lastName) like ? ";
  let result = await query(getSearchMember,[req.body.id, req.body.typeInto]);
  res.send(result);
})

// 搜尋社團
router.post('/search/group',async function(req,res){
  let getSearchMember = "SELECT societyID, bg_pic, society_name, CASE WHEN societyID  in (SELECT societyID FROM `society_member_right` a join member b WHERE a.member_email = b.email and id = ?) THEN 1 ELSE 0 END AS attended from society where concat(society_name) like ? ";
  let result = await query(getSearchMember,[req.body.id, req.body.typeInto]);
  try {
    result.map((elm,idx)=>{
      if(elm.bg_pic!=null){
        elm.bg_pic = Buffer.from(elm.bg_pic).toString('base64') 
      }  
    })
    res.send(result);
  } catch(err) {
    next(err.sqlMessage || err);
  }
})

// 有follow的人的貼文
router.post('/followed/article', async function(req, res) {
    let getFollowedArticle = "SELECT e.`id`, e.`articleID`, e.`api_selfie`, e.`datetime`, e.`lastName`, e.`firstName`, e.`content`, `likeNum`  from ( select `id`, `articleID`, `api_selfie`, `datetime`,`lastName`,`firstName`,`content`,`like_num` FROM member a join article b join member_follow c where a.email = b.post_email and b.post_email = c.member_email and c.followed_email = (SELECT email FROM member WHERE id =?) ORDER BY `articleID` DESC LIMIT ?, 10)e left join (SELECT articleID, count(member_email) likeNum from article_likes group by articleID) d on d.articleID = e.articleID"
    let limitArticleNum = req.body.callTime * 2;
    let result = await query(getFollowedArticle,[req.body.id,limitArticleNum]);
  res.send(result) 
})

// 有參加的社團的貼文
router.post('/society/article', async function(req, res) {
    let getSocietyArtcle = "SELECT e.`id`, e.`articleID`, e.`api_selfie`, e.`datetime`, e.`lastName`, e.`firstName`, e.`content`, `likeNum`, `society_name` from (select `id`, `articleID`, `api_selfie`, `datetime`,`lastName`,`firstName`,`content`,`like_num`, `society_name` FROM member a join article b join society_member_right e where b.post_email = a.email and b.societyID = e.societyID and (SELECT email FROM member WHERE id = ?)=e.member_email ORDER BY `articleID` DESC LIMIT ?, 1)e left join (SELECT articleID, count(member_email) likeNum from article_likes group by articleID) d on d.articleID = e.articleID" 
    let limitArticleNum = req.body.callTime * 1;
    let result = await query(getSocietyArtcle,[req.body.id,limitArticleNum]);
  res.send(result) 
})

// 新個人PO文
router.post('/newpost/article', async function(req, res) {
  let newPostArtcle = "INSERT INTO `article`(`post_email`, `datetime`, `content`) VALUES ( ?, ?, ?)" 
  let result = await query(newPostArtcle,[req.body.post_email, req.body.datetime, req.body.content]);
  res.send(result) 
})

// 社團新 PO文
router.post('/newpost/article/:id', async function(req, res) {
  let newPostArtcle = "INSERT INTO `article`(`post_email`, `datetime`, `content`, `societyID`) VALUES ( ?, ?, ? ,?)" 
  let result = await query(newPostArtcle,[req.body.post_email, req.body.datetime, req.body.content,req.params.id]);
  res.send(result) 
})

//修改PO文
router.put('/editpost/article', async function(req, res) {
  let editPostArtcle = "UPDATE `article` SET `content` = ? WHERE articleID = ?" 
  let result = await query(editPostArtcle,[req.body.content, req.body.articleID]);
  res.send(result) 
})

// 取社團資訊
router.post('/society/allgroup',async function(req, res){
  let getAllGroup = 'SELECT a.societyID, `bg_pic`, `society_name`, society_num , a.`pic_w` , a.`pic_h`, a.`mTop` , a.`mLeft` FROM (SELECT a.`societyID`, `bg_pic`, `society_name`, a.`pic_w` , a.`pic_h`, a.`mTop` , a.`mLeft` FROM society a JOIN (SELECT societyID FROM society_member_right a JOIN member b WHERE a.member_email = b.email and b.id = 1 and a.confirmed_join=1) b WHERE a.societyID = b.societyID) a JOIN (SELECT societyID, count(member_email) society_num from society_member_right GROUP by societyID) b WHERE a.societyID = b.societyID';
  let result = await query(getAllGroup,[req.body.userId]);
  try {
    result.map((elm,idx)=>{
      if(elm.bg_pic!=null){
        elm.bg_pic = Buffer.from(elm.bg_pic).toString('base64') 
      }  
    })
    res.send(result);
  } catch(err) {
    next(err.sqlMessage || err);
  }
})

// 取推薦社團資訊
router.post('/society/recommendgroup',async function(req, res){
  let getAllGroup = "select distinct * from (SELECT g.societyID,i.bg_pic, i.society_name, society_num from (SELECT f.societyID, COUNT(f.member_email) from (SELECT societyID, society_name , c.member_email FROM society_member_right c JOIN (SELECT a.member_email from member_follow a join member b where a.followed_email = b.email and id = 1 ) e WHERE c.member_email = e.member_email) f group by f.societyID) g join (SELECT societyID, count(member_email) society_num from society_member_right GROUP by societyID) h join society i WHERE g.societyID = h.societyID and h.societyID = i.societyID)j where not exists ( select * from (SELECT a.societyID, `bg_pic`, `society_name`, society_num FROM (SELECT a.`societyID`, `bg_pic`, `society_name` FROM society a JOIN (SELECT societyID FROM society_member_right a JOIN member b WHERE a.member_email = b.email and b.id = 1) b WHERE a.societyID = b.societyID) a JOIN (SELECT societyID, count(member_email) society_num from society_member_right GROUP by societyID) b WHERE a.societyID = b.societyID) k where societyID = j.societyID)";
  let result = await query(getAllGroup,[req.body.userId,req.body.userId]);
    try {
      result.map((elm,idx)=>{
        if(elm.bg_pic!=null){
          elm.bg_pic = Buffer.from(elm.bg_pic).toString('base64') 
        }  
      })
      res.send(result);
    } catch(err) {
      next(err.sqlMessage || err);
    }
});

// 取各社團資料
router.post('/eachsociety/group',async function(req, res){
  let getAllGroup = 'SELECT a.societyID, `bg_pic`, `society_name`, `society_num`, `pic_w`, `pic_h`, `mTop`, `mLeft` FROM (SELECT `societyID`, `bg_pic`, `society_name`, `pic_w`, `pic_h`, `mTop`, `mLeft` FROM society) a JOIN (SELECT societyID, count(member_email) society_num from society_member_right GROUP by societyID) b WHERE a.societyID = b.societyID and a.societyID = ?';
  let result = await query(getAllGroup,[req.body.societyID]);
  try {
    result.map((elm,idx)=>{
      if(elm.bg_pic!=null){
        elm.bg_pic = Buffer.from(elm.bg_pic).toString('base64') 
      }  
    })
    res.send(result);
  } catch(err) {
    next(err.sqlMessage || err);
  }
})


//取各社團Po文
router.post('/eachgroup/article',async function(req, res){
  let getAllGroup = 'SELECT e.`id`, e.`articleID`, e.`api_selfie`, e.`datetime`, e.`lastName`, e.`firstName`, e.`content`, `likeNum`from ( select `id`, `articleID`, `api_selfie`, `datetime`,`lastName`,`firstName`,`content`,`like_num`, `society_name` FROM member a join article b join society e where b.post_email = a.email and b.societyID = e.societyID and b.societyID = ? ORDER by datetime DESC LIMIT ?, 1)e left join (SELECT articleID, count(member_email) likeNum from article_likes group by articleID) d on d.articleID = e.articleID';
  let limitArticleNum = req.body.callTime * 1;
  let result = await query(getAllGroup,[req.body.id, limitArticleNum]);
  res.send(result);
})

// 取得社團片
router.post('/society/bgPic',async function(req, res){
  let getAllGroup = 'SELECT `bg_pic` FROM `society` WHERE societyID = ?';
  let result = await query(getAllGroup,[req.body.id]);
  res.send(result);
})

// 創新社團id
router.post('/create/society',async function(req, res){
  let getAllGroup = 'INSERT INTO `society`(`society_name`, `found_at`) VALUES (?,?)';
  let result = await query(getAllGroup,[req.body.society_name, req.body.found_at]);
  res.send(result);
})

// 各社團權限
router.post('/soceity/right', async function(req, res){
  let getAllGroup = 'SELECT `societyID`, `right`, `confirmed_join`, `be_invited` FROM `society_member_right` a WHERE societyID = ? and (SELECT email from member where id = ?) = a.member_email';
  let result = await query(getAllGroup,[req.body.societyID, req.body.userId]);
  if(result.length==0){
    result.push({right:"0"})
  }
  res.send(result);
})

// 各社團關於
router.post('/group/about', async function(req, res){
  let getAllGroup = 'SELECT `about_society` FROM `society` WHERE societyID = ?';
  let result = await query(getAllGroup,[req.body.id]);
  res.send(result);
})

// 新關於社團PO文
router.put('/newabout/group/:id', async function(req, res) {
  let newPostArtcle = "UPDATE `society` SET `about_society`= ? WHERE societyID =?" 
  let result = await query(newPostArtcle,[req.body.about_society, req.params.id]);
  res.send(result) 
})

// 新創社團第一個成員
router.post('/createsociety/member',async function(req, res){
    let getAllGroup = 'INSERT INTO `society_member_right`(`societyID`, `member_email`, `right`, `confirmed_join`, `society_name`) VALUES (?,(SELECT `email` FROM `member` WHERE id = ?),1,1,(SELECT `society_name` FROM `society` WHERE societyID = ?))';
    let result = await query(getAllGroup,[req.body.societyID, req.body.id,req.body.societyID]);
    res.send(result);
  })

// 社團成員
router.post('/group/memberlist',async function(req, res){
  let getAllGroup = 'SELECT `number`, `id`, `api_selfie`, `lastName`, `firstName`, `appellation`, `right`, `confirmed_join`, be_invited FROM `society_member_right` a join `member` b WHERE b.email = a.member_email and `societyID`= ?';
  let result = await query(getAllGroup,[req.body.societyID]);
  res.send(result);
})

// // 新社團成員邀請
// router.post('/member/invited',async function(req, res){
//   let getAllGroup = 'INSERT INTO `society`(`society_name`, `found_at`) VALUES (?,?)';
//   let result = await query(getAllGroup,[req.body.society_name, req.body.found_at]);
//   res.send(result);
// })

// 社團banner上傳 長寬資訊
router.post('/group/bgpic/:id',async function(req, res){
  if(req.params.id !== 0){
    let getAllGroup = 'UPDATE society set pic_w= ? ,pic_h= ? ,mTop=? ,mLeft=? WHERE societyID =?';
    let result = await query(getAllGroup,[req.body.widthPer, req.body.heightPer, req.body.mTop, req.body.mLeft, req.params.id]);
    res.send(result);
  }
})

//存入社團照片 
router.post('/society/media',async function(req, res){
  console.log(req.body.societyID,req.body.url);
    let getAllGroup = 'INSERT INTO `society_media`(`societyID`, `media`) VALUES (?,?)';
    let result = await query(getAllGroup,[req.body.societyID,req.body.url]);
    console.log(result);
    // res.send(result);
})

// 取出社團照片
router.post('/getsociety/media',async function(req, res){
  console.log(req.body.societyID);
    let getAllGroup = 'SELECT * FROM `society_media` WHERE societyID = ?';
    let result = await query(getAllGroup,[req.body.societyID]);
    res.send(result);
})



// 社團banner照片上傳 初始化設定
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,  // 限制 2 MB
  },
  fileFilter (req, file, callback) {  // 限制檔案格式為 image
    if (!file.mimetype.match(/^image/)) {
      callback(new Error().message = '檔案格式錯誤');
    } else {
      callback(null, true);
    }
  }
});

router.post('/eachgroup/bgpic/:id', upload.single('image'), async (req, res, next) => {
  try {
    await conn.query(`UPDATE society SET bg_pic = ? WHERE societyID = ${req.params.id}`, [req.file.buffer] );
    res.send({
      success: true,
      message: '上傳圖片成功'
    });
  } catch (err) {
    next('no ok');
  }
});

// 社團辦活動
router.post('/society/event/:id', async function (req, res) {
  let sql = "SELECT e.`eventID`, e.`title`, e.`introduction`, e.`date` as evt_date, e.`time` as evt_time, e.`location` FROM `event` e WHERE `societyID` = ?";
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

router.get('/article/num',async function (req, res) {
  let getAllGroup = 'SELECT MAX(articleID) articleNum FROM `article`';
  let result = await query(getAllGroup,[]);
  res.send(result);
})

//社團裡搜尋
router.post('/searchin/scoiety',async function(req,res){
  let getSearchMember = "SELECT h.`number`,  g.`id`, g.`api_selfie`, g.`lastName`, g.`firstName`, h.`societyID`, h.`appellation`, h.`confirmed_join`, h.`be_invited` from (SELECT * from((SELECT a.`id`, a.`api_selfie`, a.`lastName`, a.`firstName`, b.`societyID`, b.`appellation`, b.`confirmed_join`, b.`be_invited` from `member` a join `society_member_right` b where a.email = b.member_email) UNION (SELECT a.`id`, a.`api_selfie`, a.`lastName`, a.`firstName`, b.`societyID`, b.`appellation`, b.`confirmed_join`, b.`be_invited` from `member` a left join `society_member_right` b on b.member_email is null))f where concat(f.firstName,'',f.lastName) like ? and societyID is null)g left JOIN (SELECT * from((SELECT a.`id`, a.`api_selfie`, a.`lastName`, a.`firstName`, b.`number`, b.`societyID`, b.`appellation`, b.`confirmed_join`, b.`be_invited` from `member` a join `society_member_right` b where a.email = b.member_email) UNION (SELECT a.`id`, a.`api_selfie`, a.`lastName`, a.`firstName`, b.`number`, b.`societyID`, b.`appellation`, b.`confirmed_join`, b.`be_invited` from `member` a left join `society_member_right` b on b.member_email is null))f where concat(f.firstName,'',f.lastName) like ? and societyID = ?)h ON g.id = h.id";
  let result = await query(getSearchMember,[req.body.typeInto,req.body.typeInto,req.body.societyID]);
  res.send(result);
})

// 邀請加入社團
router.post('/invit/person',async function(req,res){
  let getSearchMember = "INSERT INTO `society_member_right`(`societyID`, `member_email`, `society_name`,`be_invited`) VALUES (?,(SELECT email from member WHERE id = ?),(SELECT society_name FROM society WHERE societyID = ?),1)";
  let result = await query(getSearchMember,[req.body.societyID,req.body.invitedPerson,req.body.societyID]);
  res.send(result);
})

// 取消社團邀請
router.post('/cancel/groupinvited',async function(req,res){
  let getSearchMember = "DELETE FROM `society_member_right` WHERE number = ?";
  let result = await query(getSearchMember,[req.body.giveNum]);
  res.send(result);
})

// 踢出社團
router.post('/kickout/member',async function(req,res){
  let getSearchMember = "DELETE FROM `society_member_right` WHERE number = ?";
  let result = await query(getSearchMember,[req.body.giveNum]);
  res.send(result);
})

// 申請加入社團
router.post('/attendnew/group',async function(req,res){
  let getSearchMember = "INSERT INTO `society_member_right`(`societyID`, `member_email`, `society_name`) VALUES (?,(SELECT email from member where id = ?),(SELECT society_name from society where societyID = ?))";
  let result = await query(getSearchMember,[req.body.societyID,req.body.userId,req.body.societyID]);
  res.send(result);
})

module.exports = router;

// SELECT a.`id`, a.`api_selfie`, a.`lastName`, a.`firstName`, b.`societyID`, b.`appellation`, b.`confirmed_join`, b.`be_invited` from (SELECT `id`, `email`, `api_selfie`, `lastName`, `firstName` FROM `member`)a left join (SELECT `member_email`, `societyID`, `appellation`, `confirmed_join`, `be_invited` FROM `society_member_right`)b on a.email = b.member_email where (societyID is null or societyID = ?) and concat(firstName,lastName) like ?
// SELECT * from((SELECT a.`id`, a.`api_selfie`, a.`lastName`, a.`firstName`, b.`societyID`, b.`appellation`, b.`confirmed_join`, b.`be_invited` from `member` a join `society_member_right` b where a.email = b.member_email) UNION (SELECT a.`id`, a.`api_selfie`, a.`lastName`, a.`firstName`, b.`societyID`, b.`appellation`, b.`confirmed_join`, b.`be_invited` from `member` a left join `society_member_right` b on b.member_email is null))f where concat(f.firstName,f.lastName) like ? and  (societyID is null or societyID = ?)
// SELECT  g.`id`, g.`api_selfie`, g.`lastName`, g.`firstName`, h.`societyID`, g.`appellation`, g.`confirmed_join`, g.`be_invited` from (SELECT * from((SELECT a.`id`, a.`api_selfie`, a.`lastName`, a.`firstName`, b.`societyID`, b.`appellation`, b.`confirmed_join`, b.`be_invited` from `member` a join `society_member_right` b where a.email = b.member_email) UNION (SELECT a.`id`, a.`api_selfie`, a.`lastName`, a.`firstName`, b.`societyID`, b.`appellation`, b.`confirmed_join`, b.`be_invited` from `member` a left join `society_member_right` b on b.member_email is null))f where concat(f.firstName,f.lastName) like ? and societyID is null)g left JOIN (SELECT * from((SELECT a.`id`, a.`api_selfie`, a.`lastName`, a.`firstName`, b.`societyID`, b.`appellation`, b.`confirmed_join`, b.`be_invited` from `member` a join `society_member_right` b where a.email = b.member_email) UNION (SELECT a.`id`, a.`api_selfie`, a.`lastName`, a.`firstName`, b.`societyID`, b.`appellation`, b.`confirmed_join`, b.`be_invited` from `member` a left join `society_member_right` b on b.member_email is null))f where concat(f.firstName,f.lastName) like ? and societyID = ?)h ON g.id = h.id