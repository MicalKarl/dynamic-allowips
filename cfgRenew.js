const fs = require('fs')
const path = require('path')

// @todo replace with db restore
function renewSS(cfgPath, newPass, cb) {
    let tmpPath = cfgPath + ".tmp";
    try {
        if (fs.existsSync(tmpPath)) {
            fs.copyFileSync(tmpPath, cfgPath)
        }
        fs.copyFileSync(cfgPath, tmpPath, fs.constants.COPYFILE_FICLONE)
        let data = fs.readFileSync(tmpPath, 'utf-8')
        let cfgJson = JSON.parse(data)
        cfgJson.password = newPass
        fs.writeFileSync(cfgPath, JSON.stringify(cfgJson, null, 2))
    } catch (err) {
        if (fs.existsSync(tmpPath)) {
            fs.copyFileSync(tmpPath, cfgPath)
        }
        console.error(err)
    } finally {
        if (fs.existsSync(tmpPath)) {
            fs.rmSync(tmpPath)
        }
        cb()
    }
}

module.exports = {
    renewSS
}