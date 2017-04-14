const path = require('path');
const { src, watch } = require('gulp');
const madge = require('madge');
const through = require('through2');

const hasSources = filePath => [
    '.js',
    '.jsx',
    '.mjs',
    '.scss',
    '.sass',
    '.less',
    '.styl'
].includes(path.extname(filePath));

const doesNotInclude = arr => source => !arr.includes(source);

let watcher;

const sources = {};
const endpoints = {};

function addEndpointToSource(endpoint, source) {
    if (!sources[source]) {
        sources[source] = new Set();
        watcher.add(source);
    }
    sources[source].add(endpoint);
}

function removeEndpointFromSource(endpoint, source) {
    sources[source].delete(endpoint);

    if (sources[source].size === 0) {
        delete sources[source];
        watcher.unwatch(source);
    }
}

function registerEndpoint(endpoint, taskLogic) {
    if (!endpoints[endpoint]) {
        endpoints[endpoint] = new Set();
    }
    endpoints[endpoint].add(taskLogic);
    addEndpointToSource(endpoint, endpoint);
}

function unregisterEndpoint(endpoint, taskLogic) {
    endpoints[endpoint].delete(taskLogic);

    if (endpoints[endpoint].size === 0) {
        delete endpoints[endpoint];
        Object.keys(sources).forEach(removeEndpointFromSource.bind(null, endpoint));
    }
}

function executeTasks(source) {
    (sources[source] || []).forEach(endpoint => {
        endpoints[endpoint].forEach(task => task(endpoint));
    })
}

function watchEndpoint(endpoint, taskLogic) {
    let oldSources = [];
    const base = path.dirname(endpoint);

    function normalizeSources(rawSources) {
        const normal = new Set(rawSources.map(source =>
            path.resolve(base, source)
        ));
        normal.add(endpoint);
        return Array.from(normal);
    }

    function compareSources(currentSources) {

        currentSources = normalizeSources(currentSources);

        oldSources
            .filter(doesNotInclude(currentSources))
            .forEach(removeEndpointFromSource.bind(null, endpoint));

        currentSources
            .filter(doesNotInclude(oldSources))
            .forEach(addEndpointToSource.bind(null, endpoint));

        oldSources = currentSources;
    }

    function watchTask() {
        madge(endpoint, {
            showFileExtension: true
        })
            .then(res => {
                compareSources(Object.keys(res.tree))
            })
            .catch(e => console.error(e));
        return taskLogic(endpoint);
    }

    watchTask();

    return watchTask;
}

function absoluteEndpoint(endpoint) {
    return path.resolve(process.cwd(), endpoint);
}

module.exports = function (glob, taskLogic) {
    const addedEndpoints = new Set();
    const endpointTasks = {};

    function checkSourceType(endpoint) {
        endpoint = absoluteEndpoint(endpoint);

        if (addedEndpoints.has(endpoint)) return;
        addedEndpoints.add(endpoint);

        endpointTasks[endpoint] = hasSources(endpoint) ? watchEndpoint(endpoint, taskLogic) : taskLogic;

        registerEndpoint(endpoint, endpointTasks[endpoint]);
    }

    function onUnlink(endpoint) {
        endpoint = absoluteEndpoint(endpoint);
        addedEndpoints.delete(endpoint);
        unregisterEndpoint(endpoint, endpointTasks[endpoint]);
    }

    return () => {
        watcher = watcher || watch('package.json')
            .unwatch('package.json')
            .on('change', executeTasks);

        watch(glob)
            .on('add', checkSourceType)
            .on('unlink', onUnlink);

        return src(glob)
            .pipe(through.obj(function (file, enc, srcDone) {
                checkSourceType(file.path);
                this.push(file);
                srcDone();
            }));
    }
};
