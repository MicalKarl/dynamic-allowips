const { exec } = require('child_process');
const net = require('net');

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
        let validIps = new Set();
        for (const ip in this.data) {
            if (t >= this.data[ip] * 1000) {
                delete this.data[ip];
                console.log(`ip ${ip} expire at ${Date(t)}`);
            } else {
                validIps.add(ip);
            }
        }

        const cmdListIps = 'ufw status';
        exec(cmdListIps, (err, stdout, stderr) => {
            let curIpSet = new Set();
            if (!err && !stderr) {
                stdout.split('\n').forEach((line)=>{
                    const items = line.trim().split(/\s+/);
                    if(items.length == 3 && items[0] == this.port && items[1] == 'ALLOW' && net.isIP(items[2]) !== 0)
                    {
                        curIpSet.add(items[2]);
                    }
                });
                
                let cmd = 'true';
                [...validIps].filter(ip => !(curIpSet.has(ip))).forEach((ip)=>{
                    cmd += ' && ' + this.formAddIp(ip);
                });
                [...curIpSet].filter(ip => !(validIps.has(ip))).forEach((ip) => {
                    cmd += ' && ' + this.formRemoveIp(ip);
                })

                if(cmd != 'true' || force)
                {
                    this._execCmdAndLog(`${cmd} && ufw reload`);
                }
            } 
            if(err || stderr)
            {
                console.error(`list ip cmd <${cmdListIps}> err: ${err} - ${stderr}`);
            }
        })
    }

    toJSON() {
        return {
            port: this.port,
            data: this.data
        };
    }

    toTimeJson(){
        let nd = {};
        for (const ip in this.data)
        {
            nd[ip] = new Date(this.data[ip] * 1000);
        }
        return {
            port: this.port,
            data: nd
        };
    }

    formAddIp(ip)
    {
        return `ufw allow from ${ip} to any port ${this.port}`;
    }

    formRemoveIp(ip)
    {
        return `ufw delete allow from ${ip} to any port ${this.port}`;
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