import fs from 'fs';
import path from 'path';

function WriteFilePlugin(options = {}) {
    return {
        apply: (compiler) => {
            if (options.extensions) {
                options.extensions.forEach((extension) => {
                    if (typeof extension !== 'string') {
                        throw new Error(`${extension}: all extensions must be a string`);
                    }
                });
            }

            compiler.plugin('done', (stats) => {
                if (stats.compilation.errors.length) {
                    return;
                }

                stats.compilation.chunks.forEach((chunk) => {
                    chunk.files.forEach((fileName) => {
                        const fileExt = fileName.split('.').pop();
                        if (options.extensions && options.extensions[0] &&
                            !(options.extensions.indexOf(fileExt) > -1)) {
                            return;
                        }

                        if (!compiler.options.output.path) {
                            throw new Error('output.path is not defined.');
                        }

                        const filePath = path.join(compiler.options.output.path, fileName);

                        // Only creates a directory one-level deep.
                        fs.mkdir(compiler.options.output.path, (error) => {
                            if (error && error.code !== 'EEXIST') {
                                throw new Error(error);
                            }

                            compiler.outputFileSystem.readFile(filePath, 'utf-8', (errorRead, body) => {
                                if (errorRead) {
                                    throw new Error('Cannot read input file.');
                                }
                                fs.writeFile(filePath, body, (errorWrite) => {
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

export default WriteFilePlugin;
