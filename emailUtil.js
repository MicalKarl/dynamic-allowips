const emailCredentials = require('./.emailAuth.json')
const { exec } = require('child_process');

function sendEmail(from, toEmails, subject, content, html) {
    const data = {
        from : from,
        to: toEmails,
        subject: subject,
        text: content,
        html: html
    }
    const curlCmd = `
        curl -X POST 'https://api.resend.com/emails' \
        -H 'Authorization: Bearer ${emailCredentials.apiKey}' \
        -H 'Content-Type: application/json' \
        -d '${JSON.stringify(data)}'
    `.trim()
    console.log('try send email by curl', curlCmd)
    exec(curlCmd, (err, stdout, stderr) => {
        if (err) {
            console.error('curl send email error:', from, '=>', toEmails, subject, content, html, err)
            return
        }

        console.log('curl send email with ouput', from, '=>', toEmails, subject, content, html, 'output:', stdout)
    })

}

module.exports = {
    sendEmail
}