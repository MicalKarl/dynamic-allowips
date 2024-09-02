const subcfg = require('./subcfg.json')
const fs = require('fs')
const config = require('./config')
const _ = require('lodash')
const { exec } = require('child_process');
const toChinaTimeString = require('./timeUtil').toChinaTimeString
const sendEmail = require('./emailUtil').sendEmail
const emailCredentials = require('./.emailAuth.json')
const ipmgr = require('./IPPortAllowManager')

const sscfgkey = 'sscfg'

function setSSCfg(cfg) {
    if (typeof (cfg) == 'object') {
        config.set(sscfgkey, cfg)
    }
}

function serializeSnapSSCfg(cfg) {
    if (typeof (cfg) != 'object') {
        return
    }
    fs.writeFile(subcfg.snapSSDefaultcfg, JSON.stringify(cfg, null, 2), (err) => {
        if (err) {
            console.error('fatal! snap ss cfg write failed', err)
        }
    })
}

let started = undefined
function startUpdate() {
    if (started != undefined) {
        return
    }

    started = true

    fs.watchFile(subcfg.snapSSDefaultcfg, (curr, prev) => {
        if (curr.mtime != prev.mtime) {
            exec(subcfg.ssRestartCmd)
            const logStr = `try to restart snap ss at ${toChinaTimeString(new Date())}`
            console.log(logStr)
            sendEmail(emailCredentials.adminEmail, subcfg.emails, 'SNAP SS MAY CHANGED', logStr)
        }
    })

    config.on('load', () => {
        fs.readFile(subcfg.snapSSDefaultcfg, 'utf-8', (err, data) => {
            if (err) {
                console.error('read snap ss cfg error', err)
                return
            }

            let cfg = getSSCfg()
            if (!_.isEqual(cfg, JSON.parse(data))) {
                serializeSnapSSCfg(cfg)
            }

            updateSSIPPort()
        })
    })

    let snapSSCfg = undefined
    try {
        snapSSCfg = JSON.parse(fs.readFileSync(subcfg.snapSSDefaultcfg, 'utf-8'))
    } catch (err) {
        console.error('init config ss cfg error:', err)
    }
    if (getSSCfg() == undefined) {
        setSSCfg(snapSSCfg)
    } else {
        if (!_.isEqual(getSSCfg(), snapSSCfg)) {
            config.saveConfig()
        }
        updateSSIPPort()
    }

    const intervalMs = subcfg.interval * 3600 * 1000
    const keyRefreshTime = 'ssRefreshTime'
    setInterval(() => {
        let now = Date.now()
        if (now - (config.get(keyRefreshTime) || 0) <= intervalMs) {
            return
        }

        config.set(keyRefreshTime, now)
        updateSSPort(getRandomIntExcluding(getSSMinPort(), getSSMaxPort(), getCurSSPort()))
        exec(subcfg.ssBlake3Cmd, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing command: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`Error output: ${stderr}`);
                return;
            }
            let s = (stdout || '').toString().trim()
            if (s.length > 0) {
                updateSSPassword(s)
            }
        });

    }, 10000)

    const secsCheck = 1800
    setInterval(() => {
        checkSnapServiceStatus(subcfg.snapSSServiceName, () => {
            console.error(`snap ss has down for ${secsCheck} secs`)
            sendEmail(emailCredentials.adminEmail, subcfg.emails, 'SERVICE FAILED', `${subcfg.snapSSServiceName} has been down for long!`)
        })
    }, secsCheck * 1000)
}

function checkSnapServiceStatus(serviceName, inactCb) {
    exec('snap services', (error, stdout, stderr) => {
        if (error) {
            console.error('error snap cmd', error);
            return;
        }

        try {
            const services = stdout.split('\n').slice(1); // Skip the header line
            const serviceStatus = services.find(service => service.includes(serviceName));

            if (serviceStatus) {
                const isActive = serviceStatus.includes('active');
                if (!isActive) {
                    inactCb()
                }
            } else {
                console.error('no snap service:', serviceName)
            }
        } catch (err) {
            console.error('error ocurrs when explain cmd result', err)
        }
    });
}

function getSSCfg() {
    return config.get(sscfgkey)
}

function getSSMinPort() {
    return config.get('ssMinPort')
}

function getSSMaxPort() {
    return config.get('ssMaxPort')
}

function getCurSSPort() {
    return getSSCfg().server_port
}

function updateSSPort(port) {
    if (port < getSSMinPort() || port > getSSMaxPort()) {
        console.error('invalid port to update', port)
        return
    }

    let changed = false
    let cfg = getSSCfg()
    if (cfg) {
        changed = cfg.server_port != port
        cfg.server_port = port
    }
    if (changed) {
        console.log('update ss port to', port)
        config.set(sscfgkey, cfg)
    }
}

function updateSSIPPort() {
    ipmgr.getOpenPorts().forEach((port) => {
        const curPort = getCurSSPort()
        if (curPort != port) {
            ipmgr.removePort(port)
        }
    })
}

function updateSSPassword(password) {
    let changed = false
    let cfg = getSSCfg()
    if (cfg) {
        changed = cfg.password != password
        cfg.password = password
    }
    if (changed) {
        console.log('update ss password to', password)
        config.set(sscfgkey, cfg)
    }
}

function getRandomIntExcluding(min, max, exclude) {
    if (min > max) {
        throw new Error('min should be less than max');
    }

    let randomInt;
    do {
        randomInt = Math.floor(Math.random() * (max - min + 1)) + min;
    } while (randomInt === exclude);

    return randomInt;
}

function addIP(ip) {
    ipmgr.addIPPort(ip, getCurSSPort())
}

module.exports = {
    startUpdate,
    addIP
}