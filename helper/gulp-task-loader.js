/**
 * Copyright 2014 Pontus Lundin
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 * @see https://www.npmjs.com/package/gulp-task-loader
 */

'use strict';
var fs = require('fs');
var path = require('path');
var gulp = require('gulp');
var assign = require('object-assign');

function isString(str) {
  return 'string' === typeof str;
}

function getExtensions() {
  return Object.keys(require.extensions);
}

function getDefaults() {
  return {
    dir: 'gulp-tasks',
    exts: getExtensions() || ['.js']
  };
}

function cleanDir(options) {
  if (!options.dir) return;
  options.dir = options.dir
    .replace(/^\.\//, '')
    .replace(/\/$/, '');
}

module.exports = function(options) {
  if (isString(options)) {
    options = { dir: options };
  }

  if (options) {
    cleanDir(options);
  }

  var opts = assign(getDefaults(), options);

  function byExtension(fileName) {
    var extension = path.extname(fileName);
    return ~opts.exts.indexOf(extension);
  }

  function stripExtension(fileName) {
    var extension = path.extname(fileName);
    return path.basename(fileName, extension);
  }

  function loadTask(parents, task) {
    var modulePath = path.join(process.cwd(), opts.dir, parents.join(path.sep) || '', task);
    var func = require(modulePath);
    var dependencies = func.dependencies || [];
    var taskName = stripExtension(task);
    var context = {
      gulp: gulp,
      opts: opts
    };

    // If subtask -> namespace: "parent:child"
    if (parents.length) {
      taskName = parents.join(':') + ':' + taskName;
    }

    if (dependencies.length > 0) {
      gulp.task(taskName, gulp.series(gulp.parallel(dependencies), func.bind(context)));
    } else {
      gulp.task(taskName, func.bind(context));
    }
  }

  function loadTasks(currentPath) {
    var file = path.basename(currentPath);
    var stats = fs.lstatSync(currentPath);

    if (stats.isFile() && byExtension(file)) {
      var pathWithoutBaseDir = currentPath.replace(path.normalize(opts.dir), '').substr(1);
      var pathSegmentsCount = pathWithoutBaseDir.split(path.sep).length;
      loadTask(pathWithoutBaseDir.split(path.sep).slice(0, pathSegmentsCount - 1), file);
    }
    else if (stats.isDirectory()) {
      fs.readdirSync(currentPath)
        .forEach(function(subPath){
          loadTasks(path.join(currentPath, subPath));
        });
    }
  }

  loadTasks(opts.dir);
};
