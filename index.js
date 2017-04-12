const path = require('path');
const { src, watch } = require('gulp');
const through = require('through2');

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

function watchEndpoint(endpoint, base, originalSources, taskLogic) {
    let oldSources = [];

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

    compareSources(originalSources);

    return () => taskLogic(endpoint)
        .pipe(through.obj(function (file, enc, taskDone) {
            compareSources(file.sourceMap.sources);
            this.push(file);
            taskDone();
        }));
}

function absoluteEndpoint(endpoint) {
    return path.resolve(process.cwd(), endpoint);
}

module.exports = function (glob, opts, taskLogic) {
    if (typeof opts === 'function') {
        taskLogic = opts;
        opts = {};
    }
    const addedEndpoints = new Set();
    const endpointTasks = {};

    function checkForSourceMap(endpoint) {
        endpoint = absoluteEndpoint(endpoint);

        if (addedEndpoints.has(endpoint)) return;
        addedEndpoints.add(endpoint);

        return taskLogic(endpoint)
            .pipe(through.obj(function (file, enc, taskDone) {
                if (path.extname(file.path) !== '.map') {
                    endpointTasks[endpoint] = file.sourceMap ?
                        watchEndpoint(endpoint, opts.base, file.sourceMap.sources, taskLogic)
                        : taskLogic;

                    registerEndpoint(endpoint, endpointTasks[endpoint]);
                }

                this.push(file);
                taskDone();
            }));
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
            .on('add', checkForSourceMap)
            .on('unlink', onUnlink);

        return src(glob)
            .pipe(through.obj(function (file, enc, srcDone) {
                opts.base = opts.base || file.base;
                checkForSourceMap(file.path);
                this.push(file);
                srcDone();
            }));
    }
};
