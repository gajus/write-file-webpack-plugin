import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';
import {
    createHash
} from 'crypto';
import chalk from 'chalk';
import moment from 'moment';
import filesize from 'filesize';

let isMemoryFileSystem;

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

/**
 * @typedef {Object} options
 * @property {RegExp} test A regular expression used to test if file should be written. When not present, all bundle will be written.
 * @property {boolean} useHashIndex Use hash index to write only files that have changed since the last iteration (default: true).
 * @property {boolean} log Logs names of the files that are being written (or skipped because they have not changed) (default: true).
 */

/**
 * @param {options} options
 * @returns {Object}
 */
export default (options = {}) => {
    let apply,
        hashIndex,
        log;

    if (_.has(options, 'test') && !_.isRegExp(options.test)) {
        throw new Error('options.test value must be an instance of RegExp.');
    } else {
        options.test = null;
    }

    if (_.has(options, 'useHashIndex') && !_.isBoolean(options.useHashIndex)) {
        throw new Error('options.useHashIndex value must be of boolean type.');
    } else {
        options.useHashIndex = true;
    }

    if (_.has(options, 'log') && !_.isBoolean(options.log)) {
        throw new Error('options.log value must be of boolean type.');
    } else {
        options.log = true;
    }

    log = (append) => {
        if (!options.log) {
            return;
        }

        console.log(chalk.dim('[' + moment().format('HH:mm:ss') + '] [write-file-webpack-plugin]') + ' ' + append);
    };

    hashIndex = {};

    apply = (compiler) => {
        let outputPath,
            setup,
            setupDone;

        setup = () => {
            if (setupDone) {
                return;
            }

            setupDone = true;

            log('compiler.outputFileSystem is "' + chalk.cyan(compiler.outputFileSystem.constructor.name) + '".');

            if (!isMemoryFileSystem(compiler.outputFileSystem)) {
                return;
            }

            if (!compiler.options.devServer.outputPath) {
                throw new Error('devServer.outputPath is not defined.');
            }

            outputPath = compiler.options.devServer.outputPath;

            log('compiler.options.devServer.outputPath is "' + chalk.cyan(compiler.options.devServer.outputPath) + '".');
        };

        compiler.plugin('done', (stats) => {
            let files;

            setup();

            if (stats.compilation.errors.length) {
                return;
            }

            log('stats.compilation.errors.length is "' + chalk.cyan(stats.compilation.errors.length) + '".');

            files = _.map(stats.compilation.assets, 'existsAt');

            _.forEach(files, (relativeAssetPath) => {
                let assetAbsolutePath,
                    assetBody,
                    assetBodyHash,
                    outputFilePath;

                if (options.test && !options.test.test(relativeAssetPath)) {
                    return;
                }

                assetAbsolutePath = path.join(compiler.options.output.path, relativeAssetPath);
                assetBody = compiler.outputFileSystem.readFileSync(assetAbsolutePath, 'utf8');

                if (options.useHashIndex) {
                    assetBodyHash = createHash('sha256').update(assetBody).digest('hex');

                    if (hashIndex[relativeAssetPath] && hashIndex[relativeAssetPath] === assetBodyHash) {
                        log(relativeAssetPath + ' ' + chalk.yellow('[skipped; matched hash index]'));

                        return;
                    }

                    hashIndex[relativeAssetPath] = assetBodyHash;
                }

                log(relativeAssetPath + ' ' + chalk.green('[written]') + ' ' +  chalk.magenta('(' + filesize(assetBody.length) + ')'));

                outputFilePath = path.join(outputPath, relativeAssetPath);

                mkdirp.sync(path.dirname(outputFilePath));

                fs.writeFileSync(outputFilePath, assetBody);
            });
        });
    };

    return {
        apply
    };
};
