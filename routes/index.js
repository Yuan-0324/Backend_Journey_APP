const express = require('express');
const router = express.Router();
const conn = require('../mysql');//資料庫連接
var URL = require('url');
var Client = require("node-rest-client").Client;
var client = new Client();
const jwt = require('jsonwebtoken');
const config = require('../config/token');
const bcrypt = require('bcrypt');//加解密
//備註:promise postman 無法用，要用時res.send要改成resolve


let query = function (sql, values) {
  return new Promise((resolve, reject) => {
    conn.query(sql, values, function (err, rows) {
      if (err) {
        // console.log(err);
      } else {
        resolve(rows);
      }
    })
  })
}

//--------------- Context---------------
router.post('/context', function (req, res) {
  let context = async () => {
    let sql = 'SELECT m.`member_is_guide`, m.`api_selfie`, m.`lastName`, m.`firstName`, m.`birthday`, m.`id`, m.`email`, m.`place`, m.`interested` FROM `member` m WHERE email =?';
    let result = await query(sql, req.body.email);
    res.send(result);
  }
  context();
})

// function apple(){
//   let myHash = bcrypt.hashSync(`123123`, 10);
//   console.log(myHash);
// }
// apple();

//--------------- 手動註冊/member/signup---------------
router.post('/member/signup', function (req, res) {
  let sign_up = async () => {
    let myHash = bcrypt.hashSync(req.body.password, 10);
    let sql = 'INSERT INTO `member`(`email`, `password`,`lastName`,`firstName`,`place`,`birthday`,`phone`,`interested`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    let result = await query(sql, [req.body.email, myHash, req.body.lastName, req.body.firstName, req.body.place, req.body.birthday, req.body.phone, req.body.interested]);
    res.send("註冊成功");
  }
  sign_up();
});

//--------------- Google Facebook註冊/api/signup ---------------
router.post("/api/signup", function (req, res) {
  let api_sign_up = async () => {
    let sql = 'INSERT INTO `member`(`email`, `lastName`, `firstName`) VALUES (?, ?, ?)';
    let result = await query(sql, [req.body.email, req.body.lastName, req.body.firstName])
    res.send('註冊成功');
  }
  api_sign_up();
});

//--------------- 驗證Token ---------------
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

//--------------- 一般登入/member/login ---------------

//備註:取到的個人資料存到localStorage 做為每頁選染用
router.post('/member/login', function (req, res) {
  let login = async () => {
    let sql = 'SELECT password FROM member WHERE email = ?';
    let result = await query(sql, req.body.email)
    if (result.length == 0) {
      res.send('信箱尚未被註冊');
    }
    else {
      // console.log(req.body.password);
      // console.log(result[0].password);
      let verify = bcrypt.compareSync(req.body.password, result[0].password)
      if (verify) {
        let payload = {
          "iss": 'Journey Server',
          "sub": 'Login',
          "jti": 'Login Token'
        };
        let token = jwt.sign(payload, config.jwtKey, { expiresIn: '7d' });
        let sql = 'SELECT m.`member_is_guide`, m.`api_selfie`, m.`lastName`, m.`firstName`, m.`birthday`, m.`id`, m.`email`, m.`place`, m.`interested` FROM `member` m WHERE email =?';
        let result = await query(sql, req.body.email)
          .then((row) => {
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
          .catch((err) => {
            console.log(err);
          })
      } else {
        res.send('密碼錯誤');
      }
    }
  }
  login();
})

//--------------- Line登入 ---------------
router.post('/lineapi/login', function (req, res) {
  // console.log(req.body);
  const CLIENT_SECRET = 'c985b34cdd358c9b39d6fbb5b233c927';
  const CLIENT_ID = '1656960165';

  const data = {
    grant_type: 'authorization_code',
    code: req.body.code,
    redirect_uri: 'http://localhost:3000/',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET
  }

  const args = {
    data: data,
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  }
  client.post("https://api.line.me/oauth2/v2.1/token", args, function (data, row) {
    // console.log(data);
    try {
      let payload = {
        "iss": 'Journey Server',
        "sub": 'Login',
        "jti": 'Login Token'
      };
      var token = jwt.sign(payload, config.jwtKey, { expiresIn: '7d' });
    } catch (err) {
      // err
      console.log(err);
    }

    const data2 = {
      id_token: data.id_token,
      client_id: CLIENT_ID,
      // access_token: data.access_token
    }
    const arg2 = {
      data: data2,
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    }
    // console.log(token);
    client.post("https://api.line.me/oauth2/v2.1/verify", arg2, function (data, row) {
      // console.log(data);
      let totalData = {
        data: data,
        token: token
      }
      try {
        res.status(200).send(totalData);
      } catch (error) {
        console.log(error);
      }
    });
  })

})






//--------------- Google Facebook登入/api/login ---------------

//備註:以回傳的email找到資料庫，取個人帳戶設定的資料，個人資料存到 localstorage 做為每頁選染用
router.post("/api/login", function (req, res) {
  let api_login = async () => {
    let sql = 'SELECT m.`api_selfie`, m.`lastName`, m.`firstName`, m.`birthday`, m.`id`, m.`email`, m.`place`, m.`interested` FROM `member` m WHERE email =?';
    let result = query(sql, req.body.email)
      .then((row) => {
        if (row.length == 0) {
          res.send('信箱尚未被註冊');
        }
        else {
          let payload = {
            "iss": 'Journey Server',
            "sub": 'Login',
            "jti": 'Login Token'
          };
          let token = jwt.sign(payload, config.jwtKey, { expiresIn: '7d' });
          let sql = 'SELECT `member_is_guide`, `id`,`email`, `api_selfie`, `lastName`, `firstName`, `place` FROM member WHERE email = ?';
          let result = async () => {
            query(sql, req.body.email)
              .then((row) => {
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
              .catch((err) => {
                console.log(err);
              })
          }
          result();
        }
      })
      .catch((err) => {
        console.log(err);
      })
  }
  api_login();
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
