'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function WriteFilePlugin() {
    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    return {
        apply: function apply(compiler) {
            if (options.extensions) {
                options.extensions.forEach(function (extension) {
                    if (typeof extension !== 'string') {
                        throw new Error(extension + ': all extensions must be a string');
                    }
                });
            }

            compiler.plugin('done', function (stats) {
                if (stats.compilation.errors.length) {
                    return;
                }

                stats.compilation.chunks.forEach(function (chunk) {
                    chunk.files.forEach(function (fileName) {
                        var fileExt = fileName.split('.').pop();
                        if (options.extensions && options.extensions[0] && !(options.extensions.indexOf(fileExt) > -1)) {
                            return;
                        }

                        if (!compiler.options.output.path) {
                            throw new Error('output.path is not defined.');
                        }

                        var filePath = _path2['default'].join(compiler.options.output.path, fileName);

                        // Only creates a directory one-level deep.
                        _fs2['default'].mkdir(compiler.options.output.path, function (error) {
                            if (error && error.code !== 'EEXIST') {
                                throw new Error(error);
                            }

                            compiler.outputFileSystem.readFile(filePath, 'utf-8', function (errorRead, body) {
                                if (errorRead) {
                                    throw new Error('Cannot read input file.');
                                }
                                _fs2['default'].writeFile(filePath, body, function (errorWrite) {
                                    if (errorWrite) {
                                        throw new Error('Cannot write output file.');
                                    }
                                });
                            });
                        });
                    });
                });
            });
        }
    };
}

exports['default'] = WriteFilePlugin;
module.exports = exports['default'];
//# sourceMappingURL=index.js.map
