const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
const IpAllowObject = require('./IpAllowObject');

const SSPORT = 3333;

const IpObjPath = path.join(__dirname, `${SSPORT}-ipobj.json`);

function loadIpObject() {
    let ret = undefined;
    try {
        data = fs.readFileSync(IpObjPath, 'utf-8');
        const json = JSON.parse(data);
        ret = new IpAllowObject(json.port, json.data);
    } catch (err) {
        console.error(`err occurs when read file ${IpObjPath}: ${err}`);
    }

    return ret;
}

function updateIp(force = false) {
    try {
        ipDataObj.update(Date.now(), force);
    } catch (err) {
        console.error(`err update ip data ${err}`);
    }
}

let ipDataObj = loadIpObject();
if (!ipDataObj) {
    ipDataObj = new IpAllowObject(SSPORT);
}
updateIp(true);

const serializeTimer = setInterval(() => {
    fs.writeFile(IpObjPath, JSON.stringify(ipDataObj), 'utf-8', (err) => {
        if (err) {
            console.error(`serialize ${ipDataObj} to ${IpObjPath} failed: ${err}`);
        }
    })
}, 5000);

const updateTimer = setInterval(() => {
    updateIp();
}, 5000);


function getRealIp(req) {
    return req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection.remoteAddress || req.ip;
}

function addIp(req) {
    const clientIp = getRealIp(req);
    ipDataObj.add(clientIp);
    updateIp();
    return clientIp;
}

app.get('/addip', (req, res) => {
    const clientIp = addIp(req)
    res.send(`add ip ${clientIp}`);
});

app.get('/fastaddip', async (req, res) => {
    const clientIp = addIp(req);
    // log anyway
    console.log(`[fast] try add ip ${clientIp} at ${new Date()}`);
    res.status(204).end();
});

app.get('/allips', (req, res) => {
    res.json(ipDataObj.toTimeJson());
});

const subCfgJson = require("./subcfg.json")
const { getSSSubscription } = require("./sub");
const { execOnce } = require('./shellBackend');
const { renewSS } = require('./cfgRenew');

app.get('/sub/:apiKey', async (req, res) => {
    const key = req.params.apiKey
    if (key == undefined || key != subCfgJson.apiKey) {
        return res.status(403)
    }

    let ssLinks = []
    subCfgJson.sscfgs.forEach((p) => {
        ssLinks.push(getSSSubscription(subCfgJson.server, p))
    })
    addIp(req)
    return res.send(ssLinks.join("\n"))
})


function updateSSCfg() {
    const { exec } = require('child_process');
    exec(subCfgJson.ssBlake3Cmd, (error, stdout, stderr) => {
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
            renewSS(subCfgJson.sscfgs[0], s, () => {
                execOnce('systemctl restart snap.shadowsocks-rust.ssserver-daemon.service')
            })
        }
    });
}

setInterval(() => {
    updateSSCfg()
}, 3600 * 1000 * subCfgJson.interval);
updateSSCfg()

// const {sendEmail} = require('./emailUtil')

// app.get('/email', (req, res) => {
//     sendEmail(subCfgJson.server, res, subCfgJson.emails[0], "test", "test")    
// })

const PORT = 2233;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


