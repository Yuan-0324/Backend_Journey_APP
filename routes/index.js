const express = require('express');
const router = express.Router();
const conn = require('../mysql');//資料庫連接
const jwt = require('jsonwebtoken');
const config = require('../config/token');
const bcrypt = require('bcrypt');//加解密
//備註:promise postman 無法用，要用時res.send要改成resolve


//--------------- Context---------------
router.post('/context', function (req, res) {
  // console.log(req.body);

  //字串處理
  // let catchEmail = JSON.stringify(req.body);
  // let email = catchEmail.substring(2, catchEmail.length - 5);
  // console.log(email);
  // `lastName`, `firstName`, `birthday`, `id`, `email`, `place`
  // 'SELECT m.`lastName`, m.`firstName`, m.`birthday`, m.`id`, m.`email`, m.`place`, m.`interested`, g.`guide_id` FROM `member` m JOIN guide g USING (email) WHERE email =?'
  conn.query('SELECT m.`member_is_guide`, m.`api_selfie`, m.`lastName`, m.`firstName`, m.`birthday`, m.`id`, m.`email`, m.`place`, m.`interested` FROM `member` m WHERE email =?',
    [req.body.email],
    function (err, row) {
      // console.log(row);
      res.send(JSON.stringify(row));
      // console.log(row);
    })
})


//---------------localstorage有紀錄，重新GET資料 /relog---------------

//備註:localstorage有資料紀錄，每次開起要將資料重新get
//優先取selfie，selfie沒有才取api_selfie
router.post("/relog", function (req, res) {
  // new promise((resolve, reject)=>{
  conn.query('SELECT `selfie`, `api_selfie`, `lastName`, `firstName`, `place` FROM `member` WHERE email = ?',
    [req.body.email], function (err, row) {
      res.send(row)
    })
  // })
});


//--------------- POST---------------

//--------------- 手動註冊/member/signup---------------

router.post('/member/signup', function (req, res) {
  // new promise((resolve, reject)=>{
  //-----加密處理-----
  // const saltRounds = 10;
  // var myPassword = req.body.password;// 使用者密碼
  // let myHash = '$2a$10$fok18OT0R/cWoR0a.VsjjuuYZV.XrfdYd5CpDWrYkhi1F0i8ABp6e';// 加密後密碼
  // bcrypt.genSalt(saltRounds, function (err, salt) {
  //   bcrypt.hash(myPassword, salt, function (err, hash) {
  //     console.log(typeof hash);
  //     myPassword = hash;
  //     console.log(myPassword);
  //   });
  // });
  console.log(req.body);
  conn.query('INSERT INTO `member`(`email`, `password`,`lastName`,`firstName`,`place`,`birthday`,`phone`,`interested`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [req.body.email, req.body.password, req.body.lastName, req.body.firstName, req.body.place, req.body.birthday, req.body.phone, req.body.interested],
    function (err, row) {
      res.send('註冊成功');
    }
  )
  // })
});

//--------------- Google Facebook註冊/api/signup ---------------

//備註:`place`資料 login api 沒有提供，要另外抓近來在post到後端
router.post("/api/signup", function (req, res) {
  // new promise((resolve, reject)=>{
  console.log(req.body);
  conn.query('INSERT INTO `member`(`email`, `lastName`, `firstName`) VALUES (?, ?, ?)',
    [req.body.email, req.body.lastName, req.body.firstName],
    function (err, row) {
      res.send('註冊成功');
    }
  )
  // })
});

//--------------- 登入/member/login ---------------

//--------------- Token Check ---------------
router.post('/member/login/token', function (req, res) {
  let catchToken = JSON.stringify(req.body);
  let firstToken = catchToken.substring(0, catchToken.length - 5);
  let token = firstToken.substring(2);
  // console.log(token);
  jwt.verify(token, config.jwtKey, (err, decoded) => {
    if (err) {
      res.send(err);
    } else {
      res.send('ok');
    }

  })
})

//備註:取到的個人資料存到 localstorage 做為每頁選染用
router.post('/member/login', function (req, res) {
  // console.log(req.body);
  // new promise((resolve, reject)=>{
  conn.query('SELECT password FROM member WHERE email = ?', [req.body.email],
    function (err, row) {
      console.log(JSON.stringify(row));
      if (row == '') {
        res.send('信箱尚未被註冊');
        // console.log('信箱尚未被註冊');
        console.log(row);
      }
      else {
        //-----解密處理-----
        console.log(req.body);
        // console.log(row)
        const hashPassword = row[0].password; // 資料庫加密後的密碼
        const userPassword = req.body.password; // 使用者登入輸入的密碼
        const payload = {
          "iss": 'Journey Server',
          "sub": 'Login',
          "jti": 'Login Token'
        };
        const token = jwt.sign(payload, config.jwtKey, { expiresIn: '7d' });
        // bcrypt.compare(userPassword, hashPassword, function (err, res) {
        if (hashPassword == userPassword) {
          conn.query('SELECT m.`member_is_guide`, m.`api_selfie`, m.`lastName`, m.`firstName`, m.`birthday`, m.`id`, m.`email`, m.`place`, m.`interested` FROM `member` m WHERE email =?',
            [req.body.email], function (err, row) {
              console.log(row);
              res.send({
                message: "登入成功",
                api_selfie: row[0].api_selfie,
                id: row[0].id,
                email: row[0].email,
                lastName: row[0].lastName,
                firstName: row[0].firstName,
                name: row[0].lastName + row[0].firstName,
                place: row[0].place,
                interested: row[0].interested,
                member_is_guide: row[0].member_is_guide,
                token
              });
            })
        } else {
          res.send('密碼錯誤')
        }
        // });
      }
    }
  )
  // })
})

//--------------- Google Facebook登入/api/login ---------------

//備註:以回傳的email找到資料庫，取個人帳戶設定的資料，個人資料存到 localstorage 做為每頁選染用
//如果沒有資料就用api提供的資料
router.post("/api/login", function (req, res) {
  // console.log(req.body);
  // new promise((resolve, reject)=>{
  conn.query('SELECT m.`api_selfie`, m.`lastName`, m.`firstName`, m.`birthday`, m.`id`, m.`email`, m.`place`, m.`interested` FROM `member` m WHERE email =?',
    [req.body.email],
    function (err, row) {
      // console.log(JSON.stringify(row));
      if (row == '') {
        res.send('信箱尚未被註冊');
        // console.log('信箱尚未被註冊');
        // console.log(row);
      } else {
        const payload = {
          "iss": 'Journey Server',
          "sub": 'Login',
          "jti": 'Login Token'
        };
        const token = jwt.sign(payload, config.jwtKey, { expiresIn: '7d' });
        // bcrypt.compare(userPassword, hashPassword, function (err, res) {
        conn.query('SELECT `member_is_guide`, `id`,`email`, `api_selfie`, `lastName`, `firstName`, `place` FROM member WHERE email = ?',
          [req.body.email], function (err, row) {
            console.log(row[0].id);
            // res.send(row[0]);
            res.send({
              message: "登入成功",
              api_selfie: row[0].api_selfie,
              id: row[0].id,
              email: row[0].email,
              lastName: row[0].lastName,
              firstName: row[0].firstName,
              name: row[0].lastName + row[0].firstName,
              place: row[0].place,
              interested: row[0].interested,
              member_is_guide: row[0].member_is_guide,
              token
            });
          })
        // });
      }
    }

  )

  // conn.query('SELECT `selfie`, `lastName`, `firstName`, `place` FROM `member` WHERE `email` = ?',
  //   [req.body.email], function (err, row) {
  //     res.send(row)
  //   })
  // })
});

//--------------- 取嚮導ID ---------------

router.post('/login/guideID', function (req, res) {
  console.log(req.body);
  conn.query("SELECT `guide_id` FROM `guide` WHERE email = ?",
    [req.body.email],
    function (err, row) {
      // console.log(row);
      res.send(row);
    }
  )
})

//--------------- 以下都是ＡＭＢＥＲ ---------------//

//get 雨備
router.get("/home/event/indoor", function (req, res) {
  // console.log(req.body);
  conn.query(
    "SELECT e.eventID, e.title , e.date , e.introduction , e.address , e.ctr, ep.api_pic ,e.indoor FROM `event` e INNER JOIN `event_pic` ep ON e.eventID=ep.eventID WHERE e.indoor='室內';",
    [],
    function (err, row) {
      // console.log(row);
      res.send(JSON.stringify(row));
    }
  );
});
//get 晴天出遊
router.get("/home/event/outdoor", function (req, res) {
  // console.log(req.body);
  conn.query(
    "SELECT e.eventID, e.title , e.date , e.introduction , e.address , e.ctr, ep.api_pic ,e.indoor FROM `event` e INNER JOIN `event_pic` ep ON e.eventID=ep.eventID WHERE e.indoor='室外';",
    [],
    function (err, row) {
      // console.log(row);
      res.send(JSON.stringify(row));
    }
  );
});

//get 活動
router.get("/home/event", function (req, res) {
  conn.query(
    "SELECT e.eventID, e.title , e.date , e.introduction , e.address , e.ctr, ep.api_pic FROM `event` e INNER JOIN `event_pic` ep ON e.eventID=ep.eventID ORDER BY `ctr` DESC;",
    [],
    function (err, row) {
      // console.log(row);
      res.send(JSON.stringify(row));
    }
  );
});

//get 嚮導
router.get("/home/guide", function (req, res) {
  conn.query(
    "select g.guide_id, g.ctr, g.avg_star, (CASE WHEN g.level=1 THEN 'Lv1.菜鳥嚮導' WHEN g.level=2 THEN 'Lv2.在地嚮導' WHEN g.level=3 THEN 'Lv3.進階嚮導' WHEN g.level=4 THEN 'Lv4.高級嚮導' WHEN g.level=5 THEN 'Lv5.資深嚮導' WHEN g.level=6 THEN 'Lv6.頂尖嚮導' END) level, g.location, concat(m.lastName, m.firstName)guide_name, s.viewpoint, m.api_selfie ,gp.Img1 from guide g join member m using (email) join guide_suggest s using (email) join guide_pic gp ON g.email=gp.guide_email where g.avg_star>=4 order by g.ctr desc limit 3;",
    [],
    function (err, row) {
      // console.log(row);
      res.send(JSON.stringify(row));
    }
  );
});

//get 社團
router.get("/home/society", function (req, res) {
  conn.query(
    "SELECT `society_name`,`selfie` FROM `society` ;",
    [],
    function (err, row) {
      // console.log(row);
      res.send(JSON.stringify(row));
    }
  );
});

//社團熱門文章
router.get("/home/society_article", function (req, res) {
  conn.query(
    "SELECT ss.`society_name`,m.`lastName`, m.`firstName`, sa.`content`, sa.`datetime`, sa.`like_num`, m.api_selfie FROM (`article` sa JOIN `society` ss USING (`societyID`)) INNER JOIN `member` m ON sa.post_email=m.email JOIN society s ON s.societyID=sa.societyID ORDER BY `like_num` DESC LIMIT 3",
    [],
    function (err, row) {
      // console.log(row);
      res.send(JSON.stringify(row));
    }
  );
});

//post快速搜尋欄
router.post("/home/search_result", function (req, res) {
  // console.log(req.body.areaResult);
  // console.log(req.body.dateResult);

  if (req.body.radioResult == "event") {
    conn.query(
      "SELECT * FROM `event` e WHERE e.address=? AND e.datetime=?",
      [req.body.areaResult, req.body.dateResult],
      function (err, row) {
        // console.log(row);
        res.send(JSON.stringify(row));
      }
    );
  } else if (req.body.radioResult == "guide") {
    conn.query(
      "select g.guide_id, g.avg_star, g.location, concat(m.lastName, m.firstName)guide_name, s.viewpoint from guide g join member m using (email) join guide_suggest s using (email) WHERE g.location = ? AND g.email = ANY(SELECT a.email from guide_avaliable_date a where a.date = ?);",
      [req.body.areaResult, req.body.dateResult],
      function (err, row) {
        // console.log(row);
        res.send(JSON.stringify(row));
      }
    );
  }
});

//熱門城市
router.post("/home/TrendingCity/city", function (req, res) {
  // console.log(req.body);

  conn.query(
    "SELECT * FROM `event` WHERE address=?;",
    [req.body.city],
    function (err, row) {
      // console.log(row);
      res.send(JSON.stringify(row));
    }
  );
});
module.exports = router;
