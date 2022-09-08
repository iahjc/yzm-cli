'use strict';

const Command = require('@yzm-cli2/command');
const fs = require('fs');
const path = require('path');
const semver = require('semver');
const ejs = require('ejs');
const inquirer = require('inquirer');
const fse = require('fs-extra');
const userHome = require('user-home');
const log = require('@yzm-cli2/log');
const Package = require('@yzm-cli2/package');
const { spinnerStart, sleep, exec, execAsync } = require('@yzm-cli2/utils');

const TYPE_PROJECT = 'project';
const TYPE_COMPONENT = 'component';
const TEMPLATE_TYPE_NORMAL = 'normal';
const TEMPLATE_TYPE_CUSTOM = 'custom';
const getProjectTemplate = require('./getProjectTemplate');

const WHITE_COMMAND = ['npm', 'cnpm'];


class InitCommand extends Command {

    init() {
        this.projectName = this._argv[0] || '';
        this.force = !!this._cmd.force;
    }

    async exec() {
        try {
            // 1. 准备阶段
            const projectInfo = await this.prepare();
            this.projectInfo = projectInfo;
            // 2. 下载模版
            await this.downloadTemplate();
            // 3. 安装模版
            await this.installTemplate();
        } catch (e) {
            console.error(e.message);
        }
    }


    async prepare() {
        // 0 判断项目模版是否存在
        // const template = await getProjectTemplate();
        const template = [
            {
                "name": "vue-element-admin",
                "npmName": "yzming-cli-template-vue-element-admin",
                "version": "1.0.0",
                "tag": ["project"]
            },
            {
                "name": "vue3",
                "npmName": "yzming-cli-template-vue3",
                "version": "1.0.1",
                "type": "normal",
                "installCommand": "npm install",
                "startCommand": "npm run serve",
                "tag": ["project"],
                "ignore": [
                    "**/public/**"
                ]
            },
            {
                "name": "yzming-cli-template-components",
                "npmName": "yzming-cli-template-components",
                "version": "1.0.1",
                "type": "normal",
                "installCommand": "npm install --registry=https://registry.npm.taobao.org",
                "startCommand": "npm run serve",
                "tag": ["component"],
                "ignore": [
                    "**/public/**","**.png"
                ]
            }
        ]
        if (!template || template.length === 0) {
            throw new Error('项目模版不存在！');
        }

        this.template = template;
        const localPath = process.cwd();
        // 1. 判断当前目录是否为空
        if (!this.isDirEmpty(localPath)) {
            let ifContinue = false;
            if (!this.force) {
                ifContinue = (await inquirer.prompt({
                    type: 'confirm',
                    name: 'ifContinue',
                    default: false,
                    message: '当前文件夹不为空，是否继续创建项目？'
                })).ifContinue;

                if (!ifContinue) {
                    return;
                }
            }

            if (ifContinue || this.force) {
                // 给用户做二次确认
                const { confirmDelete } = await inquirer.prompt({
                    type: 'confirm',
                    name: 'confirmDelete',
                    default: false,
                    message: '是否确认清空当前目录下的文件？'
                });
                if (confirmDelete) {
                    // 清空当前目录
                    fse.emptyDirSync(localPath);
                }
            }
        }

        return this.getProjectInfo();
    }

    /**
     * 下载模板
     */
    async downloadTemplate() {
        const { projectTemplate } = this.projectInfo;
        const templateInfo = this.template.find(item => item.npmName === projectTemplate);
        const targetPath = path.resolve(userHome, '.yzming-cli-dev', 'template');
        const storeDir = path.resolve(userHome, '.yzming-cli-dev', 'template', 'node_modules');
        const { npmName, version } = templateInfo;
        this.templateInfo = templateInfo;
        const templateNpm = new Package({
            targetPath,
            storeDir,
            packageName: npmName,
            packageVersion: version
        });

        log.verbose('pck', templateNpm);

        if (! await templateNpm.exists()) {
            const spinner = spinnerStart('正在下载模版.....');
            await sleep();
            try {
                await templateNpm.install();
            } catch (e) {
                throw e;
            } finally {
                spinner.stop(true);
                if (await templateNpm.exists()) {
                    log.success('下载模版成功！');
                }
                this.templateNpm = templateNpm;
            }
        } else {
            const spinner = spinnerStart('正在更新模块.....');
            await sleep();
            try {
                await templateNpm.update();
            } catch (e) {
                throw e;
            } finally {
                spinner.stop(true);
                if (await templateNpm.exists()) {
                    log.success('更新模版成功！');
                }
                this.templateNpm = templateNpm;
            }

        }
    }

    /**
     * 获取项目信息
     */
    async getProjectInfo() {
        function isValidName(v) {
            return (/^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/).test(v);
        }

        let projectInfo = {};
        let isProjectNameValid = false;
        if (isValidName(this.projectName)) {
            isProjectNameValid = true;
            projectInfo.projectName = this.projectName;
        }

       

        // 1. 选择创建项目或组件
        const { type } = await inquirer.prompt({
            type: 'list',
            name: 'type',
            message: '请选择初始化类型',
            default: TYPE_PROJECT,
            choices: [{
                name: '项目',
                value: TYPE_PROJECT
            }, {
                name: '组件',
                value: TYPE_COMPONENT
            }]
        });

        this.template = this.template.filter(template => {
            return template.tag.includes(type);
        });

        log.verbose('模板数据', this.template);

        const title = type === TYPE_PROJECT ? '项目' : '组件';
        // 2. 获取项目的基本信息 
        const projectNamePrompt = {
            type: 'input',
            name: 'projectName',
            message: `请输入${title}名称`,
            default: '',
            validate: function (v) {
                // 1. 输入的首字符和尾字符必须为英文字符
                // 2. 尾字符必须为英文或数字，不能为字符
                // 3. 字符仅允许“-_”
                const done = this.async();
                setTimeout(function () {
                    if (!isValidName(v)) {
                        done(`请输入合法的${title}名称`);
                        return;
                    }
                    done(null, true);
                }, 0);
                return typeof v === 'string';
            },
            filter: function (v) {
                return v;
            }
        };

        const projectPrompt = [];
        if (!isProjectNameValid) {
            projectPrompt.push(projectNamePrompt);
        }

        projectPrompt.push(
            {
                type: 'input',
                name: 'projectVersion',
                message: `请输入${title}版本号`,
                default: '1.0.0',
                validate: function (v) {
                    return !!semver.valid(v);
                },
                filter: function (v) {
                    if (!!semver.valid(v)) {
                        return semver.valid(v);
                    } else {
                        return v;
                    }
                }
            },
            {
                type: 'list',
                name: 'projectTemplate',
                message: `请选择${title}模版`,
                choices: this.createTemplateChoice()
            });

        if (type === TYPE_PROJECT) {
            const project = await inquirer.prompt(projectPrompt);
            projectInfo = {
                ...projectInfo,
                type,
                ...project
            };
            log.verbose('projectInfo:', projectInfo);
        } else if (type === TYPE_COMPONENT) {
            const descriptionPrompt = {
                type: 'input',
                name: 'componentDescription',
                message: '请输入组件描述信息',
                default: '',
                validate: function (v) {
                    const done = this.async();
                    setTimeout(function () {
                        if (!v) {
                            done('请输入组件描述信息');
                            return;
                        }
                        done(null, true);
                    }, 0);
                }
            }
            projectPrompt.push(descriptionPrompt);
            // 获取组件基本信息
            const component = await inquirer.prompt(projectPrompt);
            projectInfo = {
                ...projectInfo,
                type,
                ...component
            };
        }

        // 生成className
        if (projectInfo.projectName) {
            projectInfo.name = projectInfo.projectName;
            projectInfo.className = require('kebab-case')(projectInfo.projectName).replace(/^-/, '');
            console.log(projectInfo);
        }

        if (projectInfo.projectVersion) {
            projectInfo.version = projectInfo.projectVersion;
        }

        if (projectInfo.componentDescription) {
            projectInfo.description = projectInfo.componentDescription;
        }

        // return 项目的基本信息（object）
        return projectInfo;
    }

    isDirEmpty(localPath) {
        let fileList = fs.readdirSync(localPath);
        fileList = fileList.filter(file => {
            return !file.startsWith('.') && ['node_modules'].indexOf(file) < 0;
        });
        return !fileList || fileList.length <= 0;
    }

   
    /**
     * 安装模板
     */
    async installTemplate() {
        if (this.templateInfo) {
            if (!this.templateInfo.type) {
                this.templateInfo.type = TEMPLATE_TYPE_NORMAL;
            }

            if (this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
                await this.installNormalTemplate();
            } else if (this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
                await this.installCustomTemplate();
            }
        } else {
            throw new Error('项目模版不存在');
        }
    }

    /**
     * 模版渲染 
     */
    async ejsRender(options) {
        let dir = process.cwd();
        let projectInfo = this.projectInfo;
        return new Promise((resolve, reject) => {
            require('glob')('**', {
                cwd: dir,
                ignore: options.ignore || '',
                nodir: true
            }, (err, files) => {
                if (err) {
                    reject(err);
                }
                Promise.all(files.map(file => {
                    const filePath = path.join(dir, file);
                    return new Promise((resolve1, reject1) => {
                        ejs.renderFile(filePath, projectInfo, {}, (err, result) => {
                            if (err) {
                                reject1();
                            } else {
                                // 执行模版写入
                                fse.writeFileSync(filePath, result);
                                resolve1(result);
                            }
                        });
                    });
                })).then(() => {
                    resolve();
                }).catch(err => {
                    reject(err);
                })
            });
        })
    }

    async installNormalTemplate() {
        console.log('安装标准模版');
        // 拷贝模版代码至当前目录
        let spinner = spinnerStart('正在安装模版...');
        try {
            const templatePath = path.resolve(this.templateNpm.cacheFilePath, 'template');
            const targetPath = process.cwd();
            fse.ensureDirSync(templatePath);
            fse.ensureDirSync(targetPath);
            fse.copySync(templatePath, targetPath);
        } catch (e) {
            throw e;
        } finally {
            spinner.stop(true);
            log.success('模版安装成功！');
        }
        const templateIgnore = this.templateInfo.ignore || [];
        const ignore = ['**/node_modules/**', ...templateIgnore];
        // ejs模版渲染
        await this.ejsRender({
            'ignore': ignore
        });

        // 安装依赖
        const { installCommand, startCommand } = this.templateInfo;
        let installRet = '';

        if (installCommand) {
            const installCmd = installCommand.split(' ');
            const cmd = this.checkCommand(installCmd[0]);
            if (!cmd) {
                throw new Error('命令不存在！ [npm, cnpm]', installCommand);
            }
            const args = installCmd.slice(1);
            installRet = await execAsync(cmd, args, {
                stdio: 'inherit',
                cmd: process.cwd()
            });
        }

        if (installRet !== 0) {
            throw new Error('依赖安装过程中失败！');
        }

        // 启动命令执行
        if (startCommand) {
            const startCmd = startCommand.split(' ');
            const cmd = startCmd[0];
            if (!cmd) {
                throw new Error('命令不存在！ [npm, cnpm]', startCommand);
            }
            const args = startCmd.slice(1);
            await execAsync(cmd, args, {
                stdio: 'inherit',
                cmd: process.cwd()
            });
        }
    }

    async installCustomTemplate() {

    }

    checkCommand(cmd) {
        if (WHITE_COMMAND.includes(cmd)) {
            return cmd;
        }
        return null;
    }

    createTemplateChoice() {
        return this.template.map(item => ({
            value: item.npmName,
            name: item.name
        }));
    }
}

function init(args) {
    return new InitCommand(args);
}

module.exports = init;
