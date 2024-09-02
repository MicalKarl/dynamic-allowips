const net = require('net');
const { toChinaTimeString } = require('./timeUtil');
const { execOnce } = require('./shellBackend');

class IpAllowObject {
    constructor(port, data = {}) {
        this.port = port;
        this.data = data;   // ip => expire timestamp (seconds)
    }

    add(ip) {
        const expTime = Date.now() / 1000 + 24 * 3600;
        this.data[ip] = expTime;
    }

    clear() {
        this.data = {}
        this.update(Date.now(), true)
    }

    update(t, force = false) {
        let changed = false
        let validIps = new Set();
        for (const ip in this.data) {
            if (t >= this.data[ip] * 1000) {
                delete this.data[ip];
                changed = true
            } else {
                validIps.add(ip);
            }
        }

        execOnce('ufw status', (data) => {
            if (data) {
                let curIpSet = new Set();
                data.toString().split('\n').forEach((line) => {
                    const items = line.trim().split(/\s+/);
                    if (items.length == 3 && items[0] == this.port && items[1] == 'ALLOW' && net.isIP(items[2]) !== 0) {
                        curIpSet.add(items[2]);
                    }
                });

                let cmd = 'true';
                [...validIps].filter(ip => !(curIpSet.has(ip))).forEach((ip) => {
                    cmd += ' && ' + this.formAddIp(ip);
                });
                [...curIpSet].filter(ip => !(validIps.has(ip))).forEach((ip) => {
                    cmd += ' && ' + this.formRemoveIp(ip);
                })

                if (cmd != 'true' || force) {
                    execOnce(`${cmd} && ufw reload`, undefined, true);
                }
            }
        });
        return changed
    }

    toJSON() {
        return {
            port: this.port,
            data: this.data
        };
    }

    toTimeJson() {
        let nd = {};
        for (const ip in this.data) {
            nd[ip] = toChinaTimeString(new Date(this.data[ip] * 1000));
        }
        return {
            port: this.port,
            data: nd
        };
    }

    formAddIp(ip) {
        return `ufw allow from ${ip} to any port ${this.port}`;
    }

    formRemoveIp(ip) {
        return `ufw delete allow from ${ip} to any port ${this.port}`;
    }
};

module.exports = IpAllowObject;