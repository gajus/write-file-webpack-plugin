'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = WriteFileWebpackPlugin;

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _crypto = require('crypto');

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _filesize = require('filesize');

var _filesize2 = _interopRequireDefault(_filesize);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = (0, _debug2.default)('write-file-webpack-plugin');

/**
 * When 'webpack' program is used, constructor name is equal to 'NodeOutputFileSystem'.
 * When 'webpack-dev-server' program is used, constructor name is equal to 'MemoryFileSystem'.
 */
var isMemoryFileSystem = function isMemoryFileSystem(outputFileSystem) {
  return outputFileSystem.constructor.name === 'MemoryFileSystem';
};

/**
 * @typedef {Object} options
 * @property {boolean} exitOnErrors Stop writing files on webpack errors (default: true).
 * @property {boolean} force Forces the execution of the plugin regardless of being using `webpack-dev-server` or not (default: false).
 * @property {boolean} log Logs names of the files that are being written (or skipped because they have not changed) (default: true).
 * @property {RegExp} test A regular expression or function used to test if file should be written. When not present, all bundle will be written.
 * @property {boolean} useHashIndex Use hash index to write only files that have changed since the last iteration (default: true).
 */
function WriteFileWebpackPlugin() {
  var userOptions = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var options = _lodash2.default.assign({}, {
    exitOnErrors: true,
    force: false,
    log: true,
    test: null,
    useHashIndex: true
  }, userOptions);

  if (!_lodash2.default.isBoolean(options.exitOnErrors)) {
    throw new TypeError('options.exitOnErrors value must be of boolean type.');
  }

  if (!_lodash2.default.isBoolean(options.force)) {
    throw new TypeError('options.force value must be of boolean type.');
  }

  if (!_lodash2.default.isBoolean(options.log)) {
    throw new TypeError('options.log value must be of boolean type.');
  }

  if (!_lodash2.default.isNull(options.test) && !(_lodash2.default.isRegExp(options.test) || _lodash2.default.isFunction(options.test))) {
    throw new TypeError('options.test value must be an instance of RegExp or Function.');
  }

  if (!_lodash2.default.isBoolean(options.useHashIndex)) {
    throw new TypeError('options.useHashIndex value must be of boolean type.');
  }

  var log = function log() {
    for (var _len = arguments.length, append = Array(_len), _key = 0; _key < _len; _key++) {
      append[_key] = arguments[_key];
    }

    if (!options.log) {
      return;
    }

    debug.apply(undefined, [_chalk2.default.dim('[' + (0, _moment2.default)().format('HH:mm:ss') + '] [write-file-webpack-plugin]')].concat(append));
  };

  var assetSourceHashIndex = {};

  log('options', options);

  var apply = function apply(compiler) {
    var outputPath = void 0;
    var setupDone = void 0;
    var setupStatus = void 0;

    var setup = function setup() {
      if (setupDone) {
        return setupStatus;
      }

      setupDone = true;

      log('compiler.outputFileSystem is "' + _chalk2.default.cyan(compiler.outputFileSystem.constructor.name) + '".');

      if (!isMemoryFileSystem(compiler.outputFileSystem) && !options.force) {
        return false;
      }

      if (_lodash2.default.has(compiler, 'options.output.path') && compiler.options.output.path !== '/') {
        outputPath = compiler.options.output.path;
      }

      if (!outputPath) {
        throw new Error('output.path is not defined. Define output.path.');
      }

      log('outputPath is "' + _chalk2.default.cyan(outputPath) + '".');

      setupStatus = true;

      return setupStatus;
    };

    var handleDone = function handleDone(stats) {
      if (!setup()) {
        return;
      }

      if (options.exitOnErrors && stats.compilation.errors.length) {
        return;
      }

      log('stats.compilation.errors.length is "' + _chalk2.default.cyan(stats.compilation.errors.length) + '".');

      _lodash2.default.forEach(stats.compilation.assets, function (asset, assetPath) {
        var outputFilePath = _path2.default.isAbsolute(assetPath) ? assetPath : _path2.default.join(outputPath, assetPath);
        var relativeOutputPath = _path2.default.relative(process.cwd(), outputFilePath);
        var targetDefinition = 'asset: ' + _chalk2.default.cyan('./' + assetPath) + '; destination: ' + _chalk2.default.cyan('./' + relativeOutputPath);

        var test = options.test;

        if (test) {
          var skip = _lodash2.default.isRegExp(test) ? !test.test(assetPath) : !test(assetPath);

          if (skip) {
            log(targetDefinition, _chalk2.default.yellow('[skipped; does not match test]'));

            return;
          }
        }

        var assetSize = asset.size();
        var assetSource = Array.isArray(asset.source()) ? asset.source().join('\n') : asset.source();

        if (options.useHashIndex) {
          var assetSourceHash = (0, _crypto.createHash)('sha256').update(assetSource).digest('hex');

          if (assetSourceHashIndex[assetPath] && assetSourceHashIndex[assetPath] === assetSourceHash) {
            log(targetDefinition, _chalk2.default.yellow('[skipped; matched hash index]'));

            return;
          }

          assetSourceHashIndex[assetPath] = assetSourceHash;
        }

        _mkdirp2.default.sync(_path2.default.dirname(relativeOutputPath));

        try {
          _fs2.default.writeFileSync(relativeOutputPath.split('?')[0], assetSource);
          log(targetDefinition, _chalk2.default.green('[written]'), _chalk2.default.magenta('(' + (0, _filesize2.default)(assetSize) + ')'));
        } catch (error) {
          log(targetDefinition, _chalk2.default.bold.red('[is not written]'), _chalk2.default.magenta('(' + (0, _filesize2.default)(assetSize) + ')'));
          log(_chalk2.default.bold.bgRed('Exception:'), _chalk2.default.bold.red(error.message));
        }
      });
    };

    /**
     * webpack 4+ comes with a new plugin system.
     *
     * Check for hooks in-order to support old plugin system
     */
    if (compiler.hooks) {
      compiler.hooks.done.tap('write-file-webpack-plugin', function (stats) {
        handleDone(stats);
      });
    } else {
      compiler.plugin('done', function (stats) {
        handleDone(stats);
      });
    }
  };

  return {
    apply
  };
}
module.exports = exports['default'];
//# sourceMappingURL=WriteFileWebpackPlugin.js.map