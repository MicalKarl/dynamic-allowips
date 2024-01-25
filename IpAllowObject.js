const { exec } = require('child_process');

class IpAllowObject {
    constructor(port, data = {}) {
        this.port = port;
        this.data = data;   // ip => expire timestamp (seconds)
    }

    add(ip) {
        const expTime = Date.now() / 1000 + 24 * 3600;
        this.data[ip] = expTime;
    }

    update(t, force=false) {
        if(force)
        {
            this._execCmdAndLog('ipset create ss_ips hash:ip');
        }
        let validIps = new Set();
        for (const ip in this.data) {
            if (t >= this.data[ip] * 1000) {
                delete this.data[ip];
                console.log(`ip ${ip} expire at ${Date(t)}`);
            } else {
                validIps.add(ip);
            }
        }

        const cmdListIps = 'sudo ipset list ss_ips'
        exec(cmdListIps, (err, stdout, stderr) => {
            let curIpSet = new Set();
            if (!err && !stderr) {
                let flag = false;
                stdout.split('\n').forEach((line)=>{
                    const trimStr = line.trim();
                    if(flag && trimStr.length > 0)
                    {
                        curIpSet.add(trimStr);
                    }
                    if(trimStr.startsWith('Members:'))
                    {
                        flag = true;
                    }
                });
                
                [...validIps].filter(ip => !(curIpSet.has(ip))).forEach((ip)=>{
                    this._ipSetAdd(ip);
                });
                [...curIpSet].filter(ip => !(validIps.has(ip))).forEach((ip) => {
                    this._ipSetRemove(ip);
                })
            } 
            if(err || stderr)
            {
                console.error(`list ip cmd <${cmdListIps}> err: ${err} - ${stderr}`);
            }
        })

        if(force)
        {
            this._execCmdAndLog('ufw reload');
        }
    }

    toJSON() {
        return {
            port: this.port,
            data: this.data
        };
    }

    _ipSetAdd(ip)
    {
        this._execCmdAndLog(`sudo ipset add ss_ips ${ip}`);
    }

    _ipSetRemove(ip)
    {
        this._execCmdAndLog(`sudo ipset del ss_ips ${ip}`);
    }

    _execCmdAndLog(cmd)
    {
        exec(cmd, (err, stdout, stderr) => {
            if(err || stderr)
            {
                console.error(`exec cmd ${cmd} err: ${err} - ${stderr}`);
            }
            if(stdout)
            {
                console.log(`exec cmd ${cmd} => ${stdout}`);
            }
        });
    }
};

module.exports = IpAllowObject;