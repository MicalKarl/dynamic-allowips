const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
const ssAddIP = require('./ssupdater').addIP
const ipmgr = require('./IPPortAllowManager')

ipmgr.init()
require('./ssupdater').startUpdate()

function getRealIp(req) {
    return req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection.remoteAddress || req.ip;
}

function addIp(req) {
    const clientIp = getRealIp(req);
    ssAddIP(clientIp)
    return clientIp;
}

app.get('/addip', (req, res) => {
    const clientIp = addIp(req)
    res.send(`add ip ${clientIp}`);
});

app.get('/fastaddip', async (req, res) => {
    addIp(req);
    res.status(204).end();
});

app.get('/allips', (req, res) => {
    res.json(ipmgr.getTimeJson());
});

const subCfgJson = require("./subcfg.json")
const { getSSSubscription, revSSClashSubscription } = require("./sub");

app.get('/sub/:apiKey', async (req, res) => {
    const key = req.params.apiKey
    if (key == undefined || key != subCfgJson.apiKey) {
        return res.status(403)
    }

    if (req.query.type == 'clash') {
        return revSSClashSubscription(res, subCfgJson.server, subCfgJson.sscfgs[0], subCfgJson.ssClashTempPath)
    }

    let ssLinks = []
    subCfgJson.sscfgs.forEach((p) => {
        ssLinks.push(getSSSubscription(subCfgJson.server, p))
    })
    addIp(req)
    return res.send(ssLinks.join("\n"))
})


const PORT = 2233;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


