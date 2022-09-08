'use strict';

module.exports = core;
const semver = require('semver');
const path = require('path');
const colors = require('colors/safe');
const rootCheck = require('root-check');
const userHome = require('user-home');
const pathExists = require('path-exists').sync;
// require 支持的类型 .js/.json/.node
// .js -> module.exports/exports
// .json -> JSON.parse
// .node -> C++ process.dlopen
// 其他所有文件 会以.js文件处理
const pkg = require('../package.json');
const commander = require('commander');
const log = require('@yzm-cli2/log');
const init = require('@yzm-cli2/init');
const constant = require('./const');
const exec = require('@yzm-cli2/exec');

let args = null;
let config = null;
const program = new commander.Command();

async function core() {
    try {
        await prepare();
        registerCommand();
    } catch (e) {
        log.error(e.message);
    }
}

async function prepare() {
    checkPkgVersion();
    // checkNodeVersion();  在多进程models/command/lib/index.js 调用
    checkRoot();
    checkUserHome();
    // 不需要做参数解析了 commander做了
    // checkInputArgs();
    checkEnv();
    await checkGlobalUpdate();
}

/**
 * 注册命令
 */
function registerCommand() {
    program
        .name(Object.keys(pkg.bin)[0])
        .usage('<command> [options]')
        .version(pkg.version)
        .option('-d, --debug', '是否开启debug模式', false)
        .option('-tp, --targetPath <targetPath>', '是否指定本地调试文件路径', '');

    // 注册init命令 并交个exec去处理
    program
        .command('init [projectName]')
        .option('-f, --force', '是否强制初始化项目')
        .action(exec);

    program
        .command('publish')
        .option('--buildCmd', '构建命令', 'npm run build')
        .option('--refreshServer', '强制更新远程Git仓库')
        .option('--refreshToken', '强制更新远程仓库token')
        .option('--refreshOwner', '强制更新远程仓库类型')
        
        .action(exec);

    // 开启debug模式
    program.on('option:debug', function () {
        // console.log(program)
        // if(program.debug) {
        //     console.log(1)
        process.env.LOG_LEVEL = 'verbose';
        // } else {
        //     process.env.LOG_LEVEL = 'info';
        // }
        log.level = process.env.LOG_LEVEL;
        log.verbose('开启debug--------------- verbose-------');
    });

    // 指定targetPath
    program.on('option:targetPath', function () {
        process.env.CLI_TARGET_PATH = program.targetPath;
    });

    // 对未知命令监听
    program.on('command:*', function (obj) {
        const availableCommands = program.commands.map(cmd => cmd.name());
        console.log(colors.red('未知的命令：' + obj[0]));
        if (availableCommands.length > 0) {
            console.log(colors.red('可用命令：' + availableCommands.join(',')));
        }
    })

    if (process.argv.length < 3) {
        program.outputHelp();
    }

    program.parse(process.argv);
}

/**
 * 检查脚手架版本更新
 */
async function checkGlobalUpdate() {
    // 1. 获取当前版本号和模块名
    const currentVersion = pkg.version;
    const npmName = pkg.name;
    // 2. 调用npm API，获取所有版本号
    const { getNpmSemverVersion } = require('@yzm-cli2/get-npm-info');
    const lastVersion = await getNpmSemverVersion(currentVersion, npmName);
    // TODO 版本排序错误 取出的是最小的版本号
    if (lastVersion && semver.gt(lastVersion, currentVersion)) {
        log.warn('更新提示：', colors.yellow(`请手动更新 ${npmName}, 当前版本：${currentVersion}, 最新版本：${lastVersion} 
        更新命令：npm install -g ${npmName}`))
    }
    // 3. 提取所有版本号，比对那些版本号大于当前版本号
    // 4. 获取最新版本号，提示用户更新到该版本
}

/**
 * 检查环境变量
 */
function checkEnv() {
    const dotenv = require('dotenv');
    const dotenvPath = path.resolve(userHome, '.env');
    if (pathExists(dotenvPath)) {
        dotenv.config({
            path: dotenvPath
        });
    }

    createDefaultConfig();

    log.verbose('环境变量', process.env.CLI_HOME_PATH);
}

/**
 * 创建默认配置
 */
function createDefaultConfig() {
    const cliConfig = {
        home: userHome,
    };
    if (process.env.CLI_HOME) {
        cliConfig['cliHome'] = path.join(userHome, process.env.CLI_HOME);
    } else {
        cliConfig['cliHome'] = path.join(userHome, constant.DEFAULT_CLI_HOME);
    }
    process.env.CLI_HOME_PATH = cliConfig.cliHome;
}

/**
 * 检查输入的参数
 */
// function checkInputArgs() {
//     const minimist = require('minimist');
//     args = minimist(process.argv.slice(2))
//     checkArgs();
// }

// function checkArgs() {
//     if (args.debug) {
//         process.env.LOG_LEVEL = 'verbose';
//     } else {
//         process.env.LOG_LEVEL = 'info';
//     }
//     log.level = process.env.LOG_LEVEL;
// }

function checkUserHome() {
    if (!userHome) {
        throw new Error(colors.red('当前登录主用户不存在！'));
    }
}

// 检查root账户
function checkRoot() {
    rootCheck();
}

function checkNodeVersion() {
    // 1. 获取当前node版本号
    const currentVersion = process.version
    const lowestVersion = constant.LOWEST_NODE_VERSION;
    // 2. 比对最低版本号
    if (!semver.gte(currentVersion, lowestVersion)) {
        throw new Error(colors.red(`yzming-cli 需要安装 v${lowestVersion} 以上版本的 Node.js`));
    }
}

function checkPkgVersion() {
    log.notice('cli', pkg.version);
}