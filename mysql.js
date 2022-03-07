var mysql = require("mysql");
var conn;

function connectDatabase() {
    if (!conn) {
        conn = mysql.createConnection({
            user: "root",
            password: "root",
            host: "localhost",
            port: 3306,
            database: "journeyDB_PRO"
        });
        conn.connect(function (err) {
            if (err) {
                console.log('資料庫連線失敗');
            } else {
                console.log('資料庫連線成功');
            }
        });
    }
    return conn;
}

module.exports = connectDatabase();