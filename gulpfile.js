var gulp = require('gulp'),
    connect = require('gulp-connect');

gulp.task('connect', function() {
    connect.server({
        root: 'dist',
        livereload: true
    });
});

gulp.task('html', function () {
    gulp.src('./app/**/*.html')
        .pipe(gulp.dest('./dist'));
    gulp.src('./dist/**/*.html')
        .pipe(connect.reload());
});

gulp.task('js', function () {
    gulp.src('./dist/**/*.js')
        .pipe(connect.reload());
});

gulp.task('watch', function () {
    gulp.watch(['./dist/**/*.html', './dist/**/*.js'], ['html', 'js']);
});

gulp.task('default', ['connect', 'watch']);