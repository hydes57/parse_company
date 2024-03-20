const { mkdirp } = require('mkdirp')
const cproc = require('child_process')

exports.mkdir = async (dir) => {
    try {
        await mkdirp(dir)
    } catch(e) {
        console.log(e)
    }
}

exports.mv = async(src, des) => {
    try {
        await cproc.exec(`mv "${src}" "${des}"`, (e, _, __) => !!!e)
    } catch(e) {
        console.log(e)
    }
}

exports.rm = async(src) => {
    try {
        await cproc.exec(`rm ${src}`, (e, _, __) => !!!e)
    } catch(e) {
        console.log(e)
    }
}

exports.sleep = (duration) => {
    return new Promise((resolve) => { setTimeout(() => { resolve() }, duration) })
}