// tslint:disable no-console
import execa from 'execa';
import tmp from 'tmp';
import v4 from 'uuid/v4';
import yargs from 'yargs';
import { checkReady } from '../checkReady';
import { runCypress } from './runCypress';
import { startNEOONE } from './startNEOONE';

yargs.describe('ci', 'Running as part of continuous integration.').default('ci', false);

// tslint:disable-next-line readonly-array
const mutableCleanup: Array<() => Promise<void> | void> = [];

// tslint:disable-next-line no-let
let shuttingDown = false;
const shutdown = (exitCode: number) => {
  if (!shuttingDown) {
    shuttingDown = true;
    console.log('Shutting down...');
    Promise.all(mutableCleanup.map((callback) => callback()))
      .then(() => {
        process.exit(exitCode);
      })
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  }
};

process.on('uncaughtException', (error) => {
  console.error(error);
  shutdown(1);
});

process.on('unhandledRejection', (error) => {
  console.error(error);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT: Exiting...');
  shutdown(0);
});

process.on('SIGTERM', () => {
  console.log('\nSIGTERM: Exiting...');
  shutdown(0);
});

const neoOne = (
  command: ReadonlyArray<string>,
  { pipe = true }: { readonly pipe?: boolean } = { pipe: true },
): execa.ExecaChildProcess => {
  console.log(`$ neo-one ${command.join(' ')}`);

  const proc = execa('node_modules/.bin/neo-one', command);
  if (pipe) {
    proc.stdout.pipe(process.stdout);
    proc.stderr.pipe(process.stderr);
  }

  return proc;
};

const run = async ({ ci }: { readonly ci: boolean }) => {
  const networkName = `cypress-${v4()}`;

  const { proc: neoOneProc } = await startNEOONE();
  mutableCleanup.push(async () => {
    neoOneProc.kill();
    try {
      await neoOneProc;
    } catch {
      // do nothing
    }
  });

  await neoOne(['create', 'network', networkName]);
  mutableCleanup.push(async () => {
    await neoOne(['delete', 'network', networkName, '--force']);
  });

  const { stdout } = await neoOne(['describe', 'network', networkName, '--json'], { pipe: false });
  const networkInfo = JSON.parse(stdout);
  const rpcURL = networkInfo[3][1].table[1][3];
  const port = 1340;

  await neoOne(['bootstrap', '--network', networkName, '--reset']);

  const proc = execa('yarn', ['develop'], {
    env: {
      NEOTRACKER_PORT: String(port),
      NEOTRACKER_RPC_URL: rpcURL,
      NEOTRACKER_DB_FILE: tmp.fileSync().name,
    },
  });
  mutableCleanup.push(async () => {
    proc.kill();
    try {
      await proc;
    } catch {
      // do nothing
    }
  });

  await checkReady('web', proc, port, { path: 'healthcheck', timeoutMS: 120000 });

  // Wait for server to startup and sync
  await new Promise<void>((resolve) => setTimeout(resolve, 5000));

  await runCypress({ ci });
};

run({
  ci: yargs.argv.ci,
})
  .then(() => shutdown(0))
  .catch((error) => {
    console.error(error);
    shutdown(1);
  });
