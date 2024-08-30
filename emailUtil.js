const nodemailer = require('nodemailer');
const emailCredentials = require('./.emailAuth.json')


function makeEmailOption(toEmail, subject, content, html) {
    return {
        from: `admin <admin@${emailCredentials.server}>`, // 发件人
        to: toEmail, // 收件人
        subject: subject, // 邮件主题
        text: subject, // 邮件正文（纯文本）
        html: html // 邮件正文（HTML）
    };
}

function sendEmail(emailServer, res, toEmail, subject, content, html) {
    // 创建一个 SMTP 传输对象
    const transporter = nodemailer.createTransport({
        host: emailServer, // SMTP 服务器地址
        port: 587, // SMTP 端口
        secure: false, // true 为 465，false 为其他端口
        auth: {
            user: emailCredentials.user, // 你的邮箱
            pass: emailCredentials.passworld // 你的邮箱密码
        },
        // no fix here
        tls: {
            rejectUnauthorized: false // 忽略自签名证书错误
        }
    });

    // 发送邮件
    transporter.sendMail(makeEmailOption(toEmail, subject, content, html), (error, info) => {
        if (error) {
            console.error("send email error:", error.message);
            res.status(500).end();
        }

        console.log('Message sent: %s', info.messageId);
        res.send('OK');
    });
}

module.exports = {
    sendEmail
}