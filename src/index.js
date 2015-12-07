import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';

let apply,
    isMemoryFileSystem;

/**
 * When 'webpack' program is used, constructor name is equal to 'NodeOutputFileSystem'.
 * When 'webpack-dev-server' program is used, constructor name is equal to 'MemoryFileSystem'.
 *
 * @param {Object} outputFileSystem
 * @returns {boolean}
 */
isMemoryFileSystem = (outputFileSystem) => {
    return outputFileSystem.constructor.name === 'MemoryFileSystem';
};

apply = (compiler) => {
    compiler.plugin('done', (stats) => {
        let files,
            outputPath;

        if (!isMemoryFileSystem(compiler.outputFileSystem)) {
            return;
        }

        if (stats.compilation.errors.length) {
            return;
        }

        if (!compiler.options.devServer.outputPath) {
            throw new Error('devServer.outputPath is not defined.');
        }

        outputPath = compiler.options.devServer.outputPath;

        mkdirp.sync(outputPath);

        files = _.map(stats.compilation.chunks, 'files');
        files = _.flatten(files);

        _.forEach(files, (bundleFileName) => {
            let bundleBody,
                bundleFilePath,
                outputFilePath;

            bundleFilePath = path.join('/', bundleFileName);
            bundleBody = compiler.outputFileSystem.readFileSync(bundleFilePath);
            outputFilePath = path.join(outputPath, bundleFileName);

            fs.writeFileSync(outputFilePath, bundleBody);
        });
    });
};

export default () => {
    return {
        apply
    };
};
