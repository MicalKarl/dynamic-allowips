const { SMTPServer } = require('smtp-server');

const emailCredentials = require('./.emailAuth.json')

// 创建 SMTP 服务器
const server = new SMTPServer({
    onData(stream, session, callback) {
        let emailData = '';
        stream.on('data', (chunk) => {
            emailData += chunk.toString();
        });
        stream.on('end', () => {
            console.log('Received email:');
            console.log(emailData);
            callback(null, 'Message accepted');
        });
    },
    onAuth(auth, session, callback) {
        // 这里可以添加身份验证逻辑
        // 例如，检查用户名和密码
        if (auth.username === emailCredentials.user && auth.password === emailCredentials.passworld) {
            callback(null, { user: auth.username });
        } else {
            callback(new Error('Invalid username or password'));
        }
    }
});

// 启动 SMTP 服务器
server.listen(587, () => {
    console.log('SMTP server is running on port 587');
});