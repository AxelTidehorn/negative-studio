import fs from 'node:fs';
import {sourcePath,scripts} from '../../app-manifest.mjs';
export {sourcePath,scripts};
// Resolve stable public names to editable sources; fixture paths and URLs pass through.
export const readSource=(file,...args)=>fs.readFileSync(sourcePath(file),...args);
