const IpAllowObject = require("./IpAllowObject")
const path = require('path')
const fs = require('fs')
const { setInterval } = require("timers/promises")


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

    refresh() {
        this.Objects.forEach((o) => {
            o.update(Date.now())
        })
    }

    serialize() {
        this.Objects.forEach((o) => {
            this.serializeA(o)
        })
    }

    serializeA(o) {
        let IpObjPath = getSerializePath(o.port)
        fs.writeFile(IpObjPath, JSON.stringify(o), 'utf-8', (err) => {
            if (err) {
                console.error(`serialize ${o} to ${IpObjPath} failed: ${err}`);
            }
        })
    }

    init() {
        this.serialize()
        this.Objects.clear()
        fs.readdir(getIpObjectRootDir(), (err, files) => {
            if(err) {
                return console.error(err)
            }

            files.forEach( (file) => {
                if (!file.match("%d-ipobj.json")) {
                    return
                }
                const IpObjPath = getSerializePath(getIpObjectRootDir(), file)
                console.log("loading ip allow object:", IpObjPath)
                fs.readFile(IpObjPath, (err, data) => {
                    if (err) {
                        console.error(`err occurs when read file ${IpObjPath}: ${err}`);
                    }

                    try {
                        const json = JSON.parse(data);
                        let o = new IpAllowObject(json.port, json.data)
                        this.Objects.set(json.port, o);
                        o.update(Date.now(), true)
                        console.log("load complete for ip allow object:", IpObjPath)
                    } catch (err) {
                        console.error(`err occurs when read file ${IpObjPath}: ${err}`);
                    }
                })
            })
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

setInterval(()=> {
    mgr.refresh()
}, 5000)

module.exports = mgr