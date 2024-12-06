const nodemailer = require('nodemailer');

// Cấu hình transporter cho Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail', // Bạn có thể sử dụng dịch vụ email khác
    auth: {
        user: 'ngophuc2911@gmail.com', // Thay bằng email của bạn
        pass: 'mzds lnnv hywg zaqh'   // Thay bằng mật khẩu email của bạn
    }
});

module.exports = transporter;