# gulp-intelli-watch
Rebuilds only the endpoints relevant to changed files

## Useage

```javascript
const intelliWatch = require('gulp-intelli-watch');

intelliWatch(glob, taskLogic);
```

### Arguments

- glob *String|Array* **[required]**<br>
Pattern to match all endpoints for task.

- taskLogic(glob) *Function* **[required]**<br>
Task to run when files are changed
  - glob *String|Array*<br>
  A subset of files from the glob passed into intelliWatch

## Requirements

To use `gulp-intelli-watch`, you must follow these rules:

1) Your task logic must return a stream.
2) Your task needs to take an argument that receives your typical gulp src glob.
3) If you are using a language that bundles multiple files into a single endpoint, you need to initialize source maps
   in your build process.
   
## Helpful Tips

We need to tie into your stream to analyze the files to watch, so you must return a stream.

This means:
- You cannot omit a return value.
- You cannot return something else such as a Promise (soon to come, hopefully)

---

If you are used to writing your task in the following pattern:

```javascript
function styles() {
    gulp.src(config.styles.src)
        .pipe(sass())
        .pipe(gulp.dest(config.styles.dest));
}

gulp.task('styles', styles);

gulp.task('styles:watch', () => {
    gulp.watch(config.styles.src, styles);
});
```

You will need to refactor your task logic as follows:

```javascript
function stylesTaskLogic(src) {
    return gulp.src(src)
        .pipe(sourcemaps.init())
        .pipe(sass())
        .pipe(gulp.dest(config.styles.dest));
}

function styles() {
    stylesTaskLogic(config.styles.src);
}

gulp.task('styles', styles);

gulp.task('styles:watch', intelliWatch(config.styles.src, stylesTaskLogic));
```

Note we are returning the `gulp.src` inside the `stylesTaskLogic`.

---

Be sure to include `gulp-sourcemaps` where applicable. You do not have to write the sourcemaps if you do not want to,
 but you need to at least pipe `init` in your stream before returning.

```javascript
function stylesTaskLogic(src) {
    return gulp.src(src)
        .pipe(sourcemaps.init())
        // ^ we need this!!
        .pipe(sass())
        .pipe(gulp.dest(config.styles.dest));
}
```
