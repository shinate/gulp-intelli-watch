const watcher = require('./index');
const { config, taskLogic } = require('./spec/tasks/styles');

function testingTaskLogic(src) {
    // console.log(src);
    return taskLogic(src);
}

watcher(config.src, testingTaskLogic)();
