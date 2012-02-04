var fs = require('fs'),
    path = require('path'),
    jsonFs = require('./lib/json-fs'),
    builder = require('./lib/builder'),
    moduleGrapher = require('module-grapher');

function checkConfig(config) {
  if (config.minify && config.cache) {
    return 'Cannot minify code when using cache.';
  }
  return '';
}

exports.build = build;
function build(main, config, callback) {
  if (!callback) {
    callback = config;
    config = {};
  }
  var configErr = checkConfig(config);
  if (configErr) {
    callback(configErr);
    return;
  }
  moduleGrapher.graph(main, config, function(err, result) {
    if (err) {
      callback(err);
    } else {
      result.output = builder.create(config).build(result);
      if (config.verbose) { log(result); }
      callback(null, result);
    }
  });
}

exports.buildFromPackage = function(p, configCallback, callback) {
  if (!callback) {
    callback = configCallback;
    configCallback = function() {};
  }
  fs.stat(p, function(err, stat) {
    if (err) {
      callback(err);
    } else {
      var packageFile, root;
      if (stat.isDirectory()) {
        root = p;
        packageFile = path.join(p, 'package.json');
      } else {
        root = path.dirname(p);
        packageFile = p;
      }
      jsonFs.readFile(packageFile, function(err, json) {
        if (err) {
          err.file = packageFile;
          err.longDesc = err.toString() + '. Malformed JSON in descriptor file:\n    ' + packageFile;
          err.toString = function() { return err.longDesc; };
          callback(err);
        } else {
          var config = json.modulr || {};
          config.isPackageAware = true;
          config.root = root;
          configCallback(config);
          build(json.main, config, callback);
        }
      });
    }
  });
};

function log(result) {
  console.log('Successfully resolved dependencies for module "'+ result.main + '".');

  var d = result.resolvedAt - result.instantiatedAt;
  console.log('This took ' + d + 'ms.');

  var modCountText = 'Found ' + result.getModuleCount() + ' module(s)';
  if (result.getPackageCount) {
    console.log(modCountText + ' and '+ result.getPackageCount() + ' package(s).');
  } else {
    console.log(modCountText + '.');
  }

  if (result.lazyEval) {
    var modules = Object.keys(result.lazyEval).sort().join(', ');
    console.log('The following modules will be lazy-evaled: ' + modules + '.');
  }

  var size = sizeString(result.getSize());
  console.log('The total size is ' + size + ' unminified.');

  var loc = locString(result.getLoc());
  var sloc = locString(result.getSloc());
  console.log('There are ' + loc + '-LOC and ' + sloc + '-SLOC.');
}

var _KiB = 1024;
var _MiB = 1024 * 1024;
function sizeString(size) {
  var displaySize = size;
  var suffix = 'B';
  if (size > _KiB) {
    if (size > 10 * _KiB) {
      displaySize = Math.round(size / _KiB);
    } else {
      displaySize = Math.round(10 * size / _KiB) / 10;
    }
    suffix = 'K';
  }
  if (size > _MiB) {
    if (size > 10 * _MiB) {
      displaySize = Math.round(size / _MiB);
    } else {
      displaySize = Math.round(10 * size / _MiB) / 10;
    }
    suffix = 'M';
  }
  return displaySize + suffix;
}

var _KLOC = 1000;
var _MLOC = 1000 * 1000;
function locString(loc) {
  var displayLoc = loc;
  var suffix = '';
  if (loc > _KLOC) {
    if (loc > 10 * _KLOC) {
      displayLoc = Math.round(loc / _KLOC);
    } else {
      displayLoc = Math.round(10 * loc / _KLOC) / 10;
    }
    suffix = 'K';
  }
  if (loc > _MLOC) {
    if (loc > 10 * _MLOC) {
      displayLoc = Math.round(loc / _MLOC);
    } else {
      displayLoc = Math.round(10 * loc / _MLOC) / 10;
    }
    suffix = 'M';
  }
  return displayLoc + suffix;
}
