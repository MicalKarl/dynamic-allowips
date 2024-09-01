const {sendEmail} = require('../emailUtil')
const emailCredentials = require('../.emailAuth.json')
const subcfg = require('../subcfg.json')

// sendEmail(emailCredentials.adminEmail, subcfg.emails, 'test', 'a test content')

test('test email', () => {
    expect(1).toBe(1)
})