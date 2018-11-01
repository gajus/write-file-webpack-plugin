import fs from 'fs';
import {createHash} from 'crypto';
import path from 'path';
import _ from 'lodash';
import mkdirp from 'mkdirp';
import chalk from 'chalk';
import moment from 'moment';
import filesize from 'filesize';
import createDebug from 'debug';
import {sync as writeFileAtomicSync} from 'write-file-atomic';

const debug = createDebug('write-file-webpack-plugin');

/**
 * When 'webpack' program is used, constructor name is equal to 'NodeOutputFileSystem'.
 * When 'webpack-dev-server' program is used, constructor name is equal to 'MemoryFileSystem'.
 */
const isMemoryFileSystem = (outputFileSystem: Object): boolean => {
  return outputFileSystem.constructor.name === 'MemoryFileSystem';
};

/**
 * @typedef {Object} options
 * @property {boolean} atomicReplace Atomically replace files content (i.e., to prevent programs like test watchers from seeing partial files) (default: true).
 * @property {boolean} exitOnErrors Stop writing files on webpack errors (default: true).
 * @property {boolean} force Forces the execution of the plugin regardless of being using `webpack-dev-server` or not (default: false).
 * @property {boolean} log Logs names of the files that are being written (or skipped because they have not changed) (default: true).
 * @property {RegExp} test A regular expression or function used to test if file should be written. When not present, all bundle will be written.
 * @property {boolean} useHashIndex Use hash index to write only files that have changed since the last iteration (default: true).
 */
type UserOptionsType = {
  atomicReplace: ?boolean,
  exitOnErrors: ?boolean,
  test: ?RegExp,
  useHashIndex: ?boolean,
  log: ?boolean,
  force: ?boolean
};

export default function WriteFileWebpackPlugin (userOptions: UserOptionsType = {}): Object {
  const options = _.assign({}, {
    atomicReplace: true,
    exitOnErrors: true,
    force: false,
    log: true,
    test: null,
    useHashIndex: true
  }, userOptions);

  if (!_.isBoolean(options.exitOnErrors)) {
    throw new TypeError('options.exitOnErrors value must be of boolean type.');
  }

  if (!_.isBoolean(options.force)) {
    throw new TypeError('options.force value must be of boolean type.');
  }

  if (!_.isBoolean(options.log)) {
    throw new TypeError('options.log value must be of boolean type.');
  }

  if (!_.isNull(options.test) && !(_.isRegExp(options.test) || _.isFunction(options.test))) {
    throw new TypeError('options.test value must be an instance of RegExp or Function.');
  }

  if (!_.isBoolean(options.useHashIndex)) {
    throw new TypeError('options.useHashIndex value must be of boolean type.');
  }

  if (!_.isBoolean(options.atomicReplace)) {
    throw new TypeError('options.atomicReplace value must be of boolean type.');
  }

  const writeFileMethod = options.atomicReplace ? writeFileAtomicSync : fs.writeFileSync;

  const log = (...append) => {
    if (!options.log) {
      return;
    }

    debug(chalk.dim('[' + moment().format('HH:mm:ss') + '] [write-file-webpack-plugin]'), ...append);
  };

  const getAssetSource = (asset) => {
    const source = asset.source();

    if (Array.isArray(source)) {
      return source.join('\n');
    } else if (source instanceof ArrayBuffer) {
      return Buffer.from(source);
    }

    return source;
  };

  const assetSourceHashIndex = {};

  log('options', options);

  const apply = (compiler) => {
    let outputPath;
    let setupDone;
    let setupStatus;

    const setup = (): boolean => {
      if (setupDone) {
        return setupStatus;
      }

      setupDone = true;

      log('compiler.outputFileSystem is "' + chalk.cyan(compiler.outputFileSystem.constructor.name) + '".');

      if (!isMemoryFileSystem(compiler.outputFileSystem) && !options.force) {
        return false;
      }

      if (_.has(compiler, 'options.output.path') && compiler.options.output.path !== '/') {
        outputPath = compiler.options.output.path;
      }

      if (!outputPath) {
        throw new Error('output.path is not defined. Define output.path.');
      }

      log('outputPath is "' + chalk.cyan(outputPath) + '".');

      setupStatus = true;

      return setupStatus;
    };

    // eslint-disable-next-line promise/prefer-await-to-callbacks
    const handleAfterEmit = (compilation, callback) => {
      if (!setup()) {
        // eslint-disable-next-line promise/prefer-await-to-callbacks
        callback();

        return;
      }

      if (options.exitOnErrors && compilation.errors.length) {
        // eslint-disable-next-line promise/prefer-await-to-callbacks
        callback();

        return;
      }

      log('compilation.errors.length is "' + chalk.cyan(compilation.errors.length) + '".');

      _.forEach(compilation.assets, (asset, assetPath) => {
        const outputFilePath = path.isAbsolute(assetPath) ? assetPath : path.join(outputPath, assetPath);
        const relativeOutputPath = path.relative(process.cwd(), outputFilePath);
        const targetDefinition = 'asset: ' + chalk.cyan('./' + assetPath) + '; destination: ' + chalk.cyan('./' + relativeOutputPath);

        const test = options.test;

        if (test) {
          const skip = _.isRegExp(test) ? !test.test(assetPath) : !test(assetPath);

          if (skip) {
            log(targetDefinition, chalk.yellow('[skipped; does not match test]'));

            return;
          }
        }

        const assetSize = asset.size() || 0;
        const assetSource = getAssetSource(asset);

        if (options.useHashIndex) {
          const assetSourceHash = createHash('sha256').update(assetSource).digest('hex');

          if (assetSourceHashIndex[relativeOutputPath] && assetSourceHashIndex[relativeOutputPath] === assetSourceHash) {
            log(targetDefinition, chalk.yellow('[skipped; matched hash index]'));

            return;
          }

          assetSourceHashIndex[relativeOutputPath] = assetSourceHash;
        }

        mkdirp.sync(path.dirname(relativeOutputPath));

        try {
          writeFileMethod(relativeOutputPath.split('?')[0], assetSource);
          log(targetDefinition, chalk.green('[written]'), chalk.magenta('(' + filesize(assetSize) + ')'));
        } catch (error) {
          log(targetDefinition, chalk.bold.red('[is not written]'), chalk.magenta('(' + filesize(assetSize) + ')'));
          log(chalk.bold.bgRed('Exception:'), chalk.bold.red(error.message));
        }
      });
      // eslint-disable-next-line promise/prefer-await-to-callbacks
      callback();
    };

    /**
     * webpack 4+ comes with a new plugin system.
     *
     * Check for hooks in-order to support old plugin system
     */
    if (compiler.hooks) {
      compiler.hooks.afterEmit.tapAsync('write-file-webpack-plugin', handleAfterEmit);
    } else {
      compiler.plugin('after-emit', handleAfterEmit);
    }
  };

  return {
    apply
  };
}
