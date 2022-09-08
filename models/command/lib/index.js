'use strict';
const semver = require('semver');
const colors = require('colors/safe');
const LOWEST_NODE_VERSION = '12.0.0';

class Command {
    constructor(argv) {
        if (!argv) {
            throw new Error('参数不能为空！');
        }

        if (!Array.isArray(argv)) {
            throw new Error('参数必须为数组！');
        }

        if (argv.length < 1) {
            throw new Error('参数列表为空！');
        }

        this._argv = argv;
        let runner = new Promise((resolve, reject) => {
            let chain = Promise.resolve();
            // 1. 检查node版本
            chain = chain.then(() => this.checkNodeVersion());
            // 2. 初始化参数
            chain = chain.then(() => this.initArgs());
            // 
            chain = chain.then(() => this.init());
            chain = chain.then(() => this.exec());

            // 监听异常
            chain.catch(err => {
                console.log(err.message);
            })
        })
    }

    initArgs() {
        this._cmd = this._argv[this._argv.length - 1];
        this._argv = this._argv.slice(0, this._argv.length - 1);
    }

    checkNodeVersion() {
        // 1. 获取当前node版本号
        const currentVersion = process.version
        const lowestVersion = LOWEST_NODE_VERSION;
        // 2. 比对最低版本号
        if (!semver.gte(currentVersion, lowestVersion)) {
            throw new Error(colors.red(`yzm-cli 需要安装 v${lowestVersion} 以上版本的 Node.js`));
        }
    }

    init() {
        throw new Error('init必须实现');
    }

    exec() {
        throw new Error('exec必须实现');
    }
}


module.exports = Command;

