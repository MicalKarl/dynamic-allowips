const fs = require('fs')

function generateSSLink(method, password, server, port) {
    const config = `${method}:${password}@${server}:${port}`;
    const base64Config = Buffer.from(config).toString('base64');
    return `ss://${base64Config}`;
}

function getSSSubscription(subServer, cfgPath) {
    try {
        const data = fs.readFileSync(cfgPath, 'utf-8');
        const jsonData = JSON.parse(data);
        return generateSSLink(jsonData.method, jsonData.password, subServer, jsonData.server_port)
    } catch (err) {
        console.error("getSSSubscription error:", cfgPath, err)
    }
}

module.exports = {
    getSSSubscription
}