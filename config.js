// config.js
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

const _ = require('lodash')

class Config extends EventEmitter {
    constructor() {
        super();
        this.config = {};
        this.loadConfig();
        this.watchConfig();
    }

    loadConfig() {
        try {
            const rawData = fs.readFileSync(getConfigPath());
            this.config = JSON.parse(rawData);
            this.emit('load')
        } catch (err) {
            console.error("err ocurrs when loading config:", err)
            throw new Error("err ocurrs when loading config");
        }
    }

    watchConfig() {
        fs.watchFile(getConfigPath(), (curr, prev) => {
            if (curr.mtime !== prev.mtime) {
                console.log('Config file changed. Reloading...');
                this.loadConfig();
                console.log('Config loaded!')
            }
        });
    }

    get(key) {
        let v = this.config[key]
        if (typeof (v) == 'object') {
            return _.cloneDeep(v)
        }

        return v
    }

    set(key, value) {
        if (key == undefined || typeof (key) == 'object') {
            return
        }

        if (value == this.config) {
            console.error('should not set value for inner prop conifg')
            return
        }

        let oldv = this.config[key]
        this.config[key] = value;
        if (!_.isEqual(oldv, value)) {
            this.saveConfig();
            if (value == undefined) {
                console.log('remove key', key, 'from the config!')
            } else if (oldv == undefined) {
                console.log('add new key', key, 'with', value, 'to the config!')
            }
            this.emit("update", key, value)
        }
    }

    // Optional: Save the updated config back to the file
    saveConfig() {
        try {
            fs.writeFileSync(getConfigPath(), JSON.stringify(this.config, null, 2));
        } catch (err) {
            console.error('err ouccrs when saving config', err)
        }
    }

    safeExit() {
        fs.unwatchFile(getConfigPath())
        this.saveConfig()
    }
}

function getConfigPath() {
    return path.join(__dirname, 'config.json');
}

module.exports = new Config();
