const IpAllowObject = require("./IpAllowObject")
const path = require('path')
const fs = require('fs')
const { setInterval } = require("timers/promises")
const { exec } = require("child_process")


/**
 * @property {Map<number, IpAllowObject>} Objects
 */
class IPPortAllowManager {
    constructor() {
        this.Objects = new Map()
    }

    addIPPort(ip, port) {
        if (port <= 1024 || port >= 65536) {
            return false
        }

        if (!(port in this.Objects)) {
            this.Objects.set(port, new IpAllowObject(port))
        }

        let o = this.Objects.get(port)
        o.add(ip)
        o.update(Date.now())
        this.serializeA(o)
        return true
    }

    removePort(port) {
        if (port <= 1024 || port >= 65536) {
            return
        }

        let o = this.Objects.get(port)
        if (o) {
            o.clear()
            this.serializeA(o)
            this.Objects.delete(port)
            try {
                fs.rmSync(getSerializePath(port))
                const delCmd = `for i in $(ufw status numbered |(grep '] ${port}[[:space:]]'|awk -F"[][]" '{print $2}') | tac); do ufw --force delete $i; done; ufw reload`
                exec(delCmd, (err, stdout, stderr) => {
                    if(err) {
                        console.error(`err exec ufw del cmd`, cmd, err)
                        return
                    }

                    console.log(`del cmd result`, delCmd, stdout)
                    if(stderr && stderr.length > 0) {
                        console.error(`err output of del cmd`, delCmd, stderr)
                    }
                })
            } catch (err) {
                console.error('immgr rm port file failed', port)
            }
        }
    }

    getOpenPorts() {
        let ports = [];
        this.Objects.forEach(o => {
            ports.push(o.port)
        })
        return ports
    }

    refresh() {
        this.Objects.forEach((o) => {
            if (o.update(Date.now())) {
                this.serializeA(o)
            }
        })
    }

    serialize() {
        this.Objects.forEach((o) => {
            this.serializeA(o)
        })
    }

    serializeA(o) {
        let IpObjPath = getSerializePath(o.port)
        try {
            fs.writeFileSync(IpObjPath, JSON.stringify(o), 'utf-8')
        } catch (err) {
            console.error(`serialize ${o} to ${IpObjPath} failed: ${err}`);
        }
    }

    init() {
        this.serialize()
        this.Objects.clear()
        let files = fs.readdirSync(getIpObjectRootDir())
        const regex = /^[0-9]+\-ipobj\.json$/
        files.forEach((file) => {
            if (!file.match(regex)) {
                return
            }
            const IpObjPath = path.join(getIpObjectRootDir(), file)
            try {
                const json = JSON.parse(fs.readFileSync(IpObjPath));
                let o = new IpAllowObject(json.port, json.data)
                this.Objects.set(json.port, o);
                o.update(Date.now(), true)
            } catch (err) {
                console.error(`err occurs when loading ${IpObjPath}: ${err}`);
            }
        })
    }

    getTimeJson(port) {
        let o = this.Objects[port]
        return o ? o.toTimeJson() : "{}";
    }
}

function getSerializePath(port) {
    return path.join(getIpObjectRootDir(), `${port}-ipobj.json`);
}

function getIpObjectRootDir() {
    return path.join(__dirname, ".ipallow")
}

let mgr = new IPPortAllowManager()

setInterval(() => {
    mgr.refresh()
}, 5000)

module.exports = mgr
