'use strict';

const axios = require('axios');
const urljoin = require('url-join');
const semver = require('semver');

function getNpmInfo(npmName, registry) {
    if (!npmName) {
        return null;
    }
    const registryUrl = registry || getDefaultRegistry();
    const npmInfoUrl = urljoin(registryUrl, npmName);
    return axios.get(npmInfoUrl).then(response => {
        if (response.status === 200) {
            return response.data;
        }
        return null;
    }).catch(err => {
        return Promise.reject(err);
    })
}

function getDefaultRegistry(isOriginal = false) {
    return isOriginal ? 'https://registry.npmjs.org' : 'https://registry.npm.taobao.org';
}

async function getNpmVersions(npmName, register) {
    const data = await getNpmInfo(npmName, register);
    if (data) {
        return Object.keys(data.versions);
    }
    return null;
}

function getSemverVersions(baseVersion, versions) {
    // TODO 排序版本号错误，取得最小的版本
    return versions.filter(v =>
        semver.satisfies(v, `^${baseVersion}`)
    ).sort((a, b) => {
        return semver.gt(b, a)
    }
    );
}

async function getNpmSemverVersion(baseVersion, npmName, register) {
    const versions = await getNpmVersions(npmName, register);
    const newVersions = getSemverVersions(baseVersion, versions);
    if (newVersions && newVersions.length > 0) {
        return newVersions[0];
    }
    return null;
}

// TODO sort排序不起作用
async function getNpmLatestVersion(npmName, registry) {
    let versions = await getNpmVersions(npmName, registry);
    console.log(versions)
    if(versions) {
        versions = versions.sort((a, b) => {
            return semver.lt(b, a);
        } );
        return versions[versions.length-1];
    }
    return null;
}

module.exports = {
    getNpmInfo,
    getNpmVersions,
    getNpmSemverVersion,
    getDefaultRegistry,
    getNpmLatestVersion
};