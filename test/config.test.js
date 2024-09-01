const config = require('../config')
const _ = require('lodash')

let changemap = {}
config.on('update', (k, v) => {
    changemap[k] == true
})
config.set(5, 6)

test('config test', () => {
    expect(config.get(5)).toBe(6)
    config.set(6, undefined)
    expect(config.get(6)).toBe(undefined)
    config.set(7, {a: [1, 2, 3]})
    let x = {a: [1, 2]}
    x.a.push(3)
    expect(_.isEqual(config.get(7),x )).toBe(true)
    config.set(5, undefined)
    config.set(6, undefined)
    config.set(7, undefined)
    config.set(x, 6)
    expect(config.get(x)).toBe(undefined)
})

config.safeExit()
