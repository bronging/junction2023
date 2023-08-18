const express = require('express');
const app = express();
const port = 3000;
const jwt = require('jsonwebtoken');
const uuid4 = require('uuid4');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
require('dotenv').config()

//DB 연결 
const mysql = require('mysql2')
const connection = mysql.createConnection(process.env.DATABASE_URL)
console.log('Connecte to PlanetScale!');
connection.query("SET time_zone='Asia/Seoul';")

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }))

app.post('/user/register', (req, res) => {

	console.log(req.body);
	const user_id = req.body.user_id;
	
	var sql = `SELECT id FROM user WHERE user_id='${user_id}'`;
	connection.query(sql, function(err, result) {
		if(err) throw err;

		if(result.length != 0) {
			return res.json({
				registerSuccess: false, 
				message: '이미 존재하는 아이디입니다.',
			})
		}
	})

	const user_address = req.body.user_address;
	const user_phone_number = req.body.user_phone_number;
	const is_owner = req.body.is_owner;
	const user_uuid = uuid4();

	bcrypt.genSalt(process.env.SALT_ROUND, function(err, salt) {
		if(err){
			console.log(err); 
			return 
		}

		bcrypt.hash(req.body.user_password, salt, function(err, hash) {
			if(err) {
				console.log(err); 
				return 
			}
			var sql = `INSERT INTO user (user_uuid, user_id, user_password, user_address, user_phone_number, is_owner) VALUES (?, ?, ?, ?, ?, ?)`
			var values = [user_uuid, user_id, hash, user_address, user_phone_number, is_owner];

			connection.query(sql, values, function(err) {
				if(err) {
					console.log(err); 
					return 
				}
		
				console.log(`유저 한 명 추가되었습니다`); 
				return res.status(200).json({
					registerSuccess: true,
				})
			})
		})
	})
})

/**
 * description: 로그인 요청 함수. 
 */
app.post('/user/loginProc', (req, res) => {
	const user_id = req.body.user_id;

	var sql = `SELECT * FROM user WHERE user_id='${user_id}'; `

	connection.query(sql, function(err, result) {
		if(err) {
			console.log(err);
			return ;
		};

		// id 존재하지 않음. login 실패
		if(result.length == 0) {
			
			return res.status(400)
				.json({
					loginSuccess: false, 
					errcode: 1,
					message: "존재하지 않는 아이디입니다.",
				})
		}
		

		// 비밀번호 일치 확인 
		bcrypt.compare('' + req.body.user_password, result[0].user_password, function(err, isMatch){
			if(err) return res.status(400)

			//login 성공 
			if(isMatch) {
				const key = process.env.SECRET_KEY;
				const token = jwt.sign( 
					{ user_id: user_id },
					key, 
					{ expiresIn: "24h" }
				)

				return res.status(200).json( {
					loginSuccess: true,
					token: token,
					message: "로그인 성공"
				})
			}
			

			return res.status(400).json({
				loginSuccess: false, 
				errcode: 2,
				message: "비밀번호가 틀렸습니다.",
			})
		})
		
	})
})


app.listen(port, ()=> {
	console.log(`express app listening port ${port}`)
})