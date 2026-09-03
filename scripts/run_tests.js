#!/usr/bin/env osascript -l JavaScript
// macOS JXA UTF-8 Test Runner for Obstetric Doppler Calculator

function readFile(path) {
  var nsStr = $.NSString.stringWithContentsOfFileEncodingError(path, $.NSUTF8StringEncoding, null);
  if (!nsStr) {
    throw new Error('Failed to read file at ' + path);
  }
  return nsStr.js;
}

function stripModules(code) {
  return code
    .replace(/^import\s+.*?;?\s*$/gm, '')
    .replace(/^export\s+default\s+/gm, '')
    .replace(/^export\s+(const|let|var|function|class)\s+/gm, '$1 ')
    .replace(/^export\s*\{[^}]*\}\s*;?/gm, '');
}

var files = [
  'src/clinical/gestationalAge.js',
  'src/clinical/calculateCPR.js',
  'src/clinical/statistics.js',
  'src/clinical/interpretation.js',
  'src/references/fmf2019/metadata.js',
  'src/references/fmf2019/ua.js',
  'src/references/fmf2019/mca.js',
  'src/references/fmf2019/cpr.js',
  'src/references/fmf2019/index.js',
  'src/tests/clinical.test.js',
  'src/tests/test_runner.js'
];

var bundle = '';
for (var i = 0; i < files.length; i++) {
  bundle += '\n// --- ' + files[i] + ' ---\n';
  bundle += stripModules(readFile(files[i]));
}

bundle += '\nexecuteAllTests();';

eval(bundle);
