import { openAsBlob } from "node:fs";

import minimatch from 'minimatch';

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { ZipRangeReader } from "@webrecorder/wabac/src/wacz/ziprangereader.js";
import { createLoader } from "@webrecorder/wabac/src/blockloaders.js";



async function load(args) {
  const { zipPath, filename, showOffsets } = args;

  let url;

  if (!zipPath.startsWith("http://") && !zipPath.startsWith("https://")) {
    const blob = await openAsBlob(zipPath);
    url = URL.createObjectURL(blob);
  } else {
    url = zipPath;
  }

  const loader = await createLoader({url});

  const zipreader = new ZipRangeReader(loader);

  const entries = await zipreader.load();
  const keys = Object.keys(entries);

  if (!filename) {
    if (showOffsets) {
      let offset = 0;

      for (const entry of Object.values(entries)) {
        console.log(entry.offset - offset);
        console.log(entry.uncompressedSize, entry.filename);
        offset = entry.offset + entry.uncompressedSize;
      }

      const totalSize = await zipreader.loader.getLength();
      console.log(totalSize - offset);
    } else {
      console.log(keys.join("\n"));
    }
    return;

  }

  let found = null;

  for (const key of keys) {
    if (minimatch(key, filename)) {
      found = key;
      break;
    }
  }

  if (!found) {
    console.error(`Entry matching ${filename} not found`);
    process.exit(1);
  }

  const { reader } = await zipreader.loadFile(found);

  for await (const buff of reader) {
    process.stdout.write(buff);
  }
}

function main() {
  const args = yargs(hideBin(process.argv))
    .command('$0 <zipPath> [filename]', 'load ZIP entries or download a file', (yargs) => {
      yargs
      .boolean("show-entries")
      .positional("zipPath", {describe: "file or URL to ZIP file"})
      .positional("filename", {describe: "file in the ZIP to download"})
    })
    .argv;

  load(args);
}
  
main();


//load(process.argv[2], process.argv[3]);
