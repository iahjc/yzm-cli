'use strict';

const pkgDir = require('pkg-dir').sync;
const path = require('path');
const fsa = require('fs-extra');
const pathExists = require('path-exists');
const npminstall = require('npminstall');
const formatPath = require('@yzm-cli2/format-path');
const { getDefaultRegistry, getNpmLatestVersion } = require('@yzm-cli2/get-npm-info')
const { isObject } = require('@yzm-cli2/utils');


class Package {
    constructor(options) {
        if (!options) {
            throw new Error('Package类的options参数不能为空！');
        }

        if (!isObject(options)) {
            throw new Error('Package类的options参数必须为对象！');
        }

        // package的目标路径
        this.targetPath = options.targetPath;
        // package的缓存路径
        this.storeDir = options.storeDir;
        // package的name
        this.packageName = options.packageName;
        // package的version
        this.packageVersion = options.packageVersion;
        // package缓存目录前缀
        this.cacheFilePathPrefix = this.packageName.replace('/', '_');
    }

    async prepare() {
        if (this.storeDir && !pathExists(this.storeDir)) {
            fsa.mkdirpSync(this.storeDir);
        }
        if (this.packageVersion === 'latest') {
            console.log('latest......................')
            this.packageVersion = await getNpmLatestVersion(this.packageName);
            console.log(11)
        }
    }

    get cacheFilePath() {
        return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`);
    }

    getSpeficCacheFilePath(packageVersion) {
        return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${packageVersion}@${this.packageName}`)
    }

    // 判断当前package是否存在
    async exists() {
        if (this.storeDir) {
            await this.prepare();
        } else {
            return pathExists(this.targetPath);
        }
    }
    // 安装package
    async install() {
        await this.prepare();
        return npminstall({
            root: this.targetPath,
            storeDir: this.storeDir,
            registry: getDefaultRegistry(),
            pkgs: [
                {
                    name: this.packageName,
                    version: this.packageVersion
                }
            ]
        })
    }
    // 更新package
    async update() {
        await this.prepare();
        // 1. 获取最新的npm模块版本号
        const latestPackageVersion = await getNpmLatestVersion(this.packageName);
        // 2. 查询最新版本号的路径是否存在
        const latestFilePath = this.getSpeficCacheFilePath(latestPackageVersion);
        // 3. 如果不存在，则直接安装最新版本
        if (!pathExists(latestFilePath)) {
            await npminstall({
                root: this.targetPath,
                storeDir: this.storeDir,
                registry: getDefaultRegistry(),
                pkgs: [
                    {
                        name: this.packageName,
                        version: latestPackageVersion
                    }
                ]
            });
            this.packageVersion = latestPackageVersion;
        } else {
            this.packageVersion = latestPackageVersion;
        }
        
        return latestFilePath;
    }

    // 获取入口文件的路径
    getRootFilePath() {
        function _getRootFile(targetPath) {
            // 1. 获取package.json所在的目录
            const dir = pkgDir(targetPath);
            if (dir) {
                // 2. 读取package.json
                const pkgFile = require(path.resolve(dir, 'package.json'));
                // 3. 寻找main/lib
                if (pkgFile && pkgFile.main) {
                    // 4. 路径兼容（macOS/windows）
                    return formatPath(path.resolve(dir, pkgFile.main));
                }
            }
            return null;
        }

        if (this.storeDir) {
            return _getRootFile(this.cacheFilePath);
        } else {
            return _getRootFile(this.targetPath);
        }

    }
}

module.exports = Package;

