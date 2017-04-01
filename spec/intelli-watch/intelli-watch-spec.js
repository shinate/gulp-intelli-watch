const { execSync } = require('child_process');
const path = require('path');

const SPEC_DIR = path.resolve(__dirname, '..');
const ASSET_DIR = path.resolve(SPEC_DIR, 'assets');

const CSS_RULE = 'a { color: yellow; }';

describe('IntelliWatch', function() {
    const watch = require('../../index');
    const { config, taskLogic } = require('../tasks/styles');

    const touchedSources = [];

    function testingTaskLogic(src) {
        touchedSources.push(path.basename(src));
        return taskLogic(src);
    }

    watch(config.src, testingTaskLogic)();

    beforeEach(function(done) {
        setTimeout(() => {
            execSync('cp -r initial_assets/* assets', {
                cwd: SPEC_DIR
            });

            setTimeout(() => {
                touchedSources.length = 0;
                done();
            }, 200);
        }, 300);
    });

    it('should be able to watch a file change', function(done) {
        execSync(`echo "${CSS_RULE}" >> partials/_d.scss`, {
            cwd: ASSET_DIR
        });

        setTimeout(() => {
            expect(touchedSources.length).toBe(1);
            expect(touchedSources[0]).toBe('a.scss');
            done();
        }, 200);
    });

    it('should update watch when a new endpoint it created', function(done) {
        execSync(`echo "${CSS_RULE}" >> g.scss`, {
            cwd: ASSET_DIR
        });

        setTimeout(() => {
            expect(touchedSources.length).toBe(1);
            expect(touchedSources[0]).toBe('g.scss');

            execSync(`echo "${CSS_RULE}" >> g.scss`, {
                cwd: ASSET_DIR
            });

            setTimeout(() => {
                expect(touchedSources.length).toBe(2);
                expect(touchedSources[1]).toBe('g.scss');

                execSync('rm g.scss', {
                    cwd: ASSET_DIR
                });

                done();
            }, 200);
        }, 200);
    });

    it('should close the watch when a file is deleted', function(done) {
        execSync('rm a.scss', {
            cwd: ASSET_DIR
        });

        setTimeout(() => {
            execSync(`echo "${CSS_RULE}" >> partials/_e.scss`, {
                cwd: ASSET_DIR
            });

            setTimeout(() => {
                expect(touchedSources.length).toBe(1);
                expect(touchedSources[0]).toBe('c.scss');
                done();
            }, 200);
        }, 200);
    });

    it('should update watched files when source list changes', function(done) {
        execSync('echo "@import \\"partials/_f.scss\\"" >> a.scss', {
            cwd: ASSET_DIR
        });

        setTimeout(() => {
            expect(touchedSources.length).toBe(1);
            expect(touchedSources[0]).toBe('a.scss');

            execSync(`echo "${CSS_RULE}" >> partials/_f.scss`, {
                cwd: ASSET_DIR
            });

            setTimeout(() => {
                const setATwice = touchedSources[1] === 'a.scss' || touchedSources[2]  === 'a.scss';
                expect(touchedSources.length).toBe(3);
                expect(setATwice).toBe(true);
                done();
            }, 200);
        }, 200);
    });

    it('should ignore new partials not part of the endpoint glob', function(done) {
        execSync(`echo "${CSS_RULE}" >> partials/_new.scss`, {
            cwd: ASSET_DIR
        });

        setTimeout(() => {
            expect(touchedSources.length).toBe(0);
            done();
        }, 200);
    });
});
