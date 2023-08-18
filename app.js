const express = require('express');
const app = express();
const port = 3000;
const jwt = require('jsonwebtoken');
const uuid4 = require('uuid4');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const auth = require('./middleware/authMiddleware');

require('dotenv').config()

//DB 연결 
const mysql = require('mysql2')
const connection = mysql.createConnection(process.env.DATABASE_URL)
console.log('Connecte to PlanetScale!');
connection.query("SET time_zone='Asia/Seoul';")

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }))

//회원가입 요청 
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

//로그인 요청 
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
					{ user_uuid: result[0].user_uuid },
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


//회원 정보 반환 
app.get('/user', auth, (req, res) => {
	var sql = `SELECT id, user_uuid, user_id, is_owner, user_address, user_phone_number  FROM user WHERE user_uuid=?;`
	connection.query(sql, req.decoded.user_uuid, function(err, result) {
		if(err) {
			console.log(err);
			return res.status(400)
		}

		return res.status(200).send(result[0]);
	})
})

//유저의 메뉴 리스트 반환 
app.get('/user/menu', auth, (req, res) => {

	var sql = `SELECT menu_list FROM user_menu WHERE user_uuid=?;`
	connection.query(sql, req.decoded.user_uuid, function(err, result) {
		if(err) {
			console.log(err);
			return res.status(400)
		}

		return res.status(200).send(result);
	})
})

//메뉴 리스트 저장 요청
app.post('/user/menu', auth, (req, res) => {
	var sql = `INSERT INTO user_menu (user_uuid, menu_list) VALUES (?, ?);`
	var values = [req.decoded.user_uuid, req.body.menu_list];

	connection.query(sql, values, function(err) {
		if(err) {
			return res.status(400).json({
				err: err, 
				menuReg: false,
			})
		}
		return res.status(200).json({
			menuReg: true,
		})
	})
})

//모든 가게 정보 반환  
app.get('/store', (req, res) => {
	var sql = `SELECT * FROM store;`

	connection.query(sql, function(err, result) { 
		if(err) {
			return res.status(400);
		}
		return res.status(200).send(result);
	})
})

//가게 추가 
app.post('/store', (req, res) => {
	console.log(req.body);
	var sql = `INSERT INTO store (store_uuid, store_name, store_address, store_call_number, category, photo, regular_count) VALUES (?,?,?,?,?,?,?);`
	const store_uuid = uuid4();

	var values = [store_uuid, req.body.store_name, req.body.store_address, 
		req.body.store_call_number, req.body.category, req.body.photo, req.body.regular_count];
	connection.query(sql, values, function(err) {
		if(err) return res.status(400)
		return res.status(200)
	})
})

//특정 카테고리에 해당하는 가게 반환
app.get('/store/:category', (req, res) => {
	const category = req.params.category;
	var sql = `SELECT * FROM store WHERE category=?;`

	connection.query(sql, category, function(err, result) {
		if(err) return res.status(400);
		return res.status(200).send(result)
	})
})

//가게 이름 검색 결과 반환 



app.listen(port, ()=> {
	console.log(`Kiwee app listening port ${port}`)
})