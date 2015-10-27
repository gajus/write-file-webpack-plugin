import fs from 'fs';
import path from 'path';

export default () => {
    return {
        apply: (compiler) => {
            compiler.plugin('done', (stats) => {
                if (stats.compilation.errors.length) {
                    return;
                }

                stats.compilation.chunks.forEach((chunk) => {
                    chunk.files.forEach((fileName) => {
                        let filePath;

                        if (!compiler.options.output.path) {
                            throw new Error('output.path is not defined.');
                        }

                        filePath = path.join(compiler.options.output.path, fileName);

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
        }
    };
};
