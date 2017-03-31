const gulp = require('gulp');
const sourcemaps = require('gulp-sourcemaps');
const sass = require('gulp-sass');

const config = {
    src: [
        './spec/assets/**/*.scss',
        '!./spec/assets/**/_*.scss',
    ],
};

function taskLogic(src) {
    return gulp.src(src)
        .pipe(sourcemaps.init())
        .pipe(sass())
}

function styles() {
    return taskLogic(config.src);
}

gulp.task('styles', styles);

module.exports = {
    config,
    taskLogic,
};
