'use strict';

const Command = require('@yzm-cli2/command');
const log = require('@yzm-cli2/log');
const Git = require('@yzm-cli2/git');
const fse = require('fs-extra');
const path = require('path');
const fs = require('fs');



class PublishCommand extends Command {
    init() { 
        // 处理参数
        log.verbose('publish----', this._argv, this._cmd);
        this.options = {
            refreshServer: this._cmd.refreshServer,
            refreshToken: this._cmd.refreshToken,
            refreshOwner: this._cmd.refreshOwner,
            buildCmd: this._cmd.buildCmd
        }
    }

    async exec() {
        try {
            const startTime = new Date().getTime();
            // 1 初始化
            this.prepare();
            // 2 git flow
            const git = new Git(this.projectInfo, this.options);
            await git.prepare(); // 自动化提交准备
            await git.commit(); // 代码自动化提交
            await git.publish(); // 代码云构建+云发布
            const endTime = new Date().getTime();
            log.info('本次发布耗时：', Math.floor((endTime - startTime) / 1000) + '秒');
        } catch (e) {

        }
    }

    prepare() {
        // 确认项目是否为npm项目
        const projectPath = process.cwd();
        const pkgPath = path.resolve(projectPath, 'package.json');
        log.verbose('package.json', pkgPath);
        if (!fs.existsSync(pkgPath)) {
            throw new Error('package.json不存在');
        }

        // 确认是否包含name, version,,build命令
        const pkg = fse.readJSONSync(pkgPath);
        const { name, version, scripts } = pkg;

        if (!name || !version || !scripts || !scripts.build) {
            throw new Error('package.json信息不全，请检查是否存在name,version和scripts（需提供build命令）');
        }
        this.projectInfo = { name, version, dir: projectPath };
        log.verbose('projectInfo-----', this.projectInfo);
    }
}

function init(argv) {
    return new PublishCommand(argv);
}

module.exports = init;
module.exports.PublishCommand = PublishCommand;