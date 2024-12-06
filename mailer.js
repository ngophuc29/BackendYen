const nodemailer = require('nodemailer');

// Cấu hình transporter cho Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail', // Bạn có thể sử dụng dịch vụ email khác
    auth: {
        user: process.env.EMAIL_USER, // Thay bằng email của bạn
        pass: process.env.EMAIL_PASSWORD   // Thay bằng mật khẩu email của bạn
    }
});

module.exports = transporter;