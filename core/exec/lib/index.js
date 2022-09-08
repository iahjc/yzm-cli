'use strict';
const Package = require('@yzm-cli2/package')
const cp = require('child_process')
const log = require('@yzm-cli2/log')
const path = require('path')

const SETTINGS = {
    init: '@yzm-cli2/init',
    publish: '@yzm-cli2/publish'
};

const CACHE_DIR = 'dependencies/';

/**
 * 脚手架 注册inic命令后 执行exec方法
 */
async function exec() {
    let targetPath = process.env.CLI_TARGET_PATH;
    const homePath = process.env.CLI_HOME_PATH;

    let storeDir = '';
    const cmdObj = arguments[arguments.length - 1];
    // 获取命令行的执行命令 eg：init
    const cmdName = cmdObj.name();
    const packageName = SETTINGS[cmdName];
    // 安装最新版本
    const packageVersion = 'latest';
    let pkg = '';
    if (!targetPath) {
        targetPath = path.resolve(homePath, CACHE_DIR); // 生成缓存目录
        storeDir = path.resolve(targetPath, 'node_modules');
        pkg = new Package({
            targetPath,
            storeDir,
            packageName,
            packageVersion
        });

        log.verbose('pkg',pkg);

        if (await pkg.exists()) {
            // 更新package
            log.verbose('更新Package...............');
            pkg.update();
        } else {
            // 安装package
            log.verbose('安装Package...............');
            await pkg.install();
        }
    } else {
        pkg = new Package({
            targetPath,
            packageName,
            packageVersion
        });
        log.verbose('pkg',pkg);
    }

    // 判断包是否有入口文件 有就执行入口文件
    const rootFile = pkg.getRootFilePath();
    log.verbose('rootFile ----', rootFile);
    if (rootFile) {
        try {
            // 在当前主进程中调用
            // require(rootFile).call(null, Array.from(arguments));
            // 在node子进程中调用 方式1
            // const code = '';
            // const child = cp.spawn('node', ['-e', code], {
            //     cmd: process.cwd()
            // });
            // child.stdout.on('data', (chunk => {

            // }));
            // child.stderr.on('data', (chunk => {

            // }));
            // 方式2 
            const args = Array.from(arguments);
            const cmd = args[args.length - 1];
            const o = Object.create(null);
            Object.keys(cmd).forEach(key => {
                if (cmd.hasOwnProperty(key) && !key.startsWith('_') && key !== 'parent') {
                    o[key] = cmd[key];
                }
            });
            args[args.length - 1] = o;

            const code = `require('${rootFile}').call(null, ${JSON.stringify(args)})`;

            const child = spawn('node', ['-e', code], {
                cwd: process.cwd(),
                stdio: 'inherit'
            });
            child.on('error', e => {
                log.error(e.message);
                process.exit(1);
            })
            child.on('exit', e => {
                log.verbose('命令执行成功：' + e);
                process.exit(e);
            })
        } catch (e) {
            log.error(e.message);
        }
    }
}

function spawn(command, args, options) {
    const win32 = process.platform === 'win32';

    const cmd = win32 ? 'cmd' : command;

    const cmdArgs = win32 ? ['/c'].concat(command, args) : args;

    return cp.spawn(cmd, cmdArgs, options || {});
}

module.exports = exec;
