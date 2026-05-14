import fs from 'node:fs';
import path from 'node:path';
import solc from 'solc';

const repoRoot = path.resolve(new URL('../..', import.meta.url).pathname);

const sourceEntrypoints = [
  'contracts/src/TimeCreditToken.sol',
  'contracts/src/BookingManager.sol',
  'contracts/src/TimePoolHook.sol',
  'contracts/src/mocks/MockUSDC.sol',
];

const testEntrypoints = [
  'contracts/test/TimeCreditToken.t.sol',
  'contracts/test/BookingManager.t.sol',
  'contracts/test/TimePoolHook.t.sol',
];

const entrypoints = process.argv.includes('--tests')
  ? [...sourceEntrypoints, ...testEntrypoints]
  : sourceEntrypoints;

const remappings = [
  ['@openzeppelin/contracts/', 'node_modules/@openzeppelin/contracts/'],
  ['@uniswap/v4-core/', 'node_modules/@uniswap/v4-core/'],
  ['@uniswap/v4-periphery/', 'node_modules/@uniswap/v4-periphery/'],
  ['v4-core/', 'node_modules/@uniswap/v4-core/'],
  ['v4-periphery/', 'node_modules/@uniswap/v4-periphery/'],
  ['forge-std/', 'node_modules/forge-std/'],
  ['ds-test/', 'contracts/lib/ds-test/'],
];

function readSource(sourcePath) {
  const fullPath = path.resolve(repoRoot, sourcePath);
  return fs.readFileSync(fullPath, 'utf8');
}

function resolveImport(importPath) {
  const candidates = [];

  for (const [prefix, target] of remappings) {
    if (importPath.startsWith(prefix)) {
      candidates.push(path.resolve(repoRoot, target, importPath.slice(prefix.length)));
    }
  }

  candidates.push(path.resolve(repoRoot, importPath));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return { contents: fs.readFileSync(candidate, 'utf8') };
    }
  }

  return {
    error: `Import not found: ${importPath}\nTried:\n${candidates.join('\n')}`,
  };
}

const input = {
  language: 'Solidity',
  sources: Object.fromEntries(
    entrypoints.map((sourcePath) => [sourcePath, { content: readSource(sourcePath) }])
  ),
  settings: {
    evmVersion: 'cancun',
    optimizer: {
      enabled: true,
      runs: 200,
    },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode.object'],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input), { import: resolveImport }));
const errors = output.errors ?? [];

for (const error of errors) {
  const stream = error.severity === 'error' ? process.stderr : process.stdout;
  stream.write(`${error.formattedMessage}\n`);
}

if (errors.some((error) => error.severity === 'error')) {
  process.exit(1);
}

const compiled = Object.values(output.contracts ?? {}).reduce(
  (count, contracts) => count + Object.keys(contracts).length,
  0
);

process.stdout.write(`Compiled ${compiled} contract artifacts with solc ${solc.version()}\n`);
