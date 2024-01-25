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
    }catch(err)
    {
        console.error(`err occurs when read file ${IpObjPath}: ${err}`);
    }
    
    return ret;
}

function updateIp(force=false)
{
    try{
        ipDataObj.update(Date.now(), force);
    }catch(err)
    {
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
        if(err)
        {
            console.error(`serialize ${ipDataObj} to ${IpObjPath} failed: ${err}`);
        }
    })
}, 5000);

const updateTimer = setInterval(()=>{
   updateIp();
}, 5000);


app.get('/addip', (req, res) => {
    const clientIp = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection.remoteAddress || req.ip;
    ipDataObj.add(clientIp);
    updateIp();
    res.send(`add ip: ${clientIp}`);
});

app.get('/allips', (req, res) => {
    res.json(ipDataObj.toTimeJson());
});


const PORT = 2233;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


