'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

exports['default'] = function () {
    return {
        apply: function apply(compiler) {
            compiler.plugin('done', function (stats) {
                if (stats.compilation.errors.length) {
                    return;
                }

                stats.compilation.chunks.forEach(function (chunk) {
                    chunk.files.forEach(function (fileName) {
                        var filePath = undefined;

                        if (!compiler.options.output.path) {
                            throw new Error('output.path is not defined.');
                        }

                        filePath = _path2['default'].join(compiler.options.output.path, fileName);

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
        }
    };
};

module.exports = exports['default'];
//# sourceMappingURL=index.js.map
