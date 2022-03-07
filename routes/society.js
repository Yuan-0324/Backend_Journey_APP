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
  let getSearchMember = "Select * From ( SELECT id, api_selfie, lastName, firstName, CASE WHEN email in (SELECT b.followed_email FROM `member` a join `member_follow` b WHERE a.email = b.member_email and a.id = ?) THEN 1 ELSE 0 END AS followed from member c where concat(firstName,lastName) like ? ) e Where e.id!=1 ORDER BY RAND() LIMIT 10";
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
    let getFollowedArticle = "SELECT e.`id`, e.`articleID`, e.`api_selfie`, e.`datetime`, e.`lastName`, e.`firstName`, e.`content`, `likeNum`  from ( select `id`, `articleID`, `api_selfie`, `datetime`,`lastName`,`firstName`,`content`,`like_num` FROM member a join article b join member_follow c where a.email = b.post_email and b.post_email = c.followed_email and c.member_email = (SELECT email FROM member WHERE id =?) ORDER BY `articleID` DESC LIMIT ?, 2)e left join (SELECT articleID, count(member_email) likeNum from article_likes group by articleID) d on d.articleID = e.articleID"
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
  let getAllGroup = 'SELECT a.societyID, `bg_pic`, `society_name`, society_num FROM (SELECT a.`societyID`, `bg_pic`, `society_name` FROM society a JOIN (SELECT societyID FROM society_member_right a JOIN member b WHERE a.member_email = b.email and b.id = ?) b WHERE a.societyID = b.societyID) a JOIN (SELECT societyID, count(member_email) society_num from society_member_right GROUP by societyID) b WHERE a.societyID = b.societyID';
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
  let getAllGroup = 'select distinct * from (SELECT g.societyID,i.bg_pic, i.society_name, member_num from (SELECT f.societyID, COUNT(f.member_email) from (SELECT societyID, society_name , c.member_email FROM society_member_right c JOIN (SELECT followed_email from member_follow a join member b where a.member_email = b.email and id = ? ) e WHERE c.member_email = e.followed_email) f group by f.societyID) g join (SELECT societyID, count(member_email) member_num from society_member_right GROUP by societyID) h join society i WHERE g.societyID = h.societyID and h.societyID = i.societyID)j where not exists ( select * from (SELECT a.societyID, `bg_pic`, `society_name`, member_num FROM (SELECT a.`societyID`, `bg_pic`, `society_name` FROM society a JOIN (SELECT societyID FROM society_member_right a JOIN member b WHERE a.member_email = b.email and b.id = ?) b WHERE a.societyID = b.societyID) a JOIN (SELECT societyID, count(member_email) member_num from society_member_right GROUP by societyID) b WHERE a.societyID = b.societyID) k where societyID = j.societyID)';
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
  let getAllGroup = 'SELECT `societyID`, `right` FROM `society_member_right` WHERE societyID = ?';
  let result = await query(getAllGroup,[req.body.societyID]);
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
  let getAllGroup = 'SELECT `id`, `api_selfie`, `lastName`, `firstName`, `appellation`, `right`, `confirmed_join` FROM `society_member_right` a join `member` b WHERE b.email = a.member_email and `societyID`= ?';
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


module.exports = router;