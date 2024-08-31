const fs = require('fs')
const yaml = require('js-yaml')

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

function revSSClashSubscription(res, server, cfgPath, clashTempPath) {
    try {
        fs.readFile(cfgPath, (err, data) => {
            if (err) {
                console.error(err)
                res.status(500).end()
                return
            }
            let jsonData = JSON.parse(data)
            let clashJsonData = yaml.load(fs.readFileSync(clashTempPath, 'utf-8'))
            clashJsonData['proxies'][0].password = jsonData.password
            clashJsonData['proxies'][0].port = jsonData.server_port
            clashJsonData['proxies'][0].cipher = jsonData.method
            clashJsonData['proxies'][0].server = server
            res.send(yaml.dump(clashJsonData))
        })
    } catch (err) {
        console.error(err)
        res.status(500).end()
    }
}

module.exports = {
    getSSSubscription,
    revSSClashSubscription
}