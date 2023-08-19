const jwt = require('jsonwebtoken');
require('dotenv').config()


const auth = (req, res, next) => {
    const key = process.env.SECRET_KEY;

    try{
        req.decoded = jwt.verify(req.headers.authorization.split('Bearer ')[1], key);
        return next(); //인증 성공
    }catch (error) {

        // 토큰의 유효시간 경과 
        if(error.name === "TokenExpiredError") {
            return res.status(419).json({
                code: 419,
                message: "토큰이 만료되었습니다."
            })
        }

        // 토큰 비밀키가 일치하지 않는 경우 
        if(error.name === 'JsonWebTokenError') {
            console.log(error.name);
            return res.status(401).json({
                code: 401, 
                message: "유효하지 않은 토큰입니다."
            })
        }
    }
}

module.exports = auth;