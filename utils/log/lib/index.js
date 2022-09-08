'use strict';


const log = require('npmlog');
log.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info';
log.heading = 'yzming'; // 修改前缀
log.headingStyle = { fg: 'red', bg: 'black' }; // 修改前缀的样式
log.addLevel('success', 2000, { fg: 'green', bold: true }); // 自定义log

module.exports = log;
