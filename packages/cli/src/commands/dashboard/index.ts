import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';

export default class Dashboard extends BaseCommand {
  static override description = 'Start the Upriver local dashboard';

  static override examples = [
    '<%= config.bin %> dashboard',
    '<%= config.bin %> dashboard --port 3000',
    '<%= config.bin %> dashboard --clients /path/to/clients',
  ];

  static override flags = {
    port: Flags.integer({
      description: 'Port to serve dashboard on',
      default: 4321,
    }),
    clients: Flags.string({
      description: 'Path to clients directory (default: ./clients)',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Dashboard);

    const dashboardDir = this.findDashboardDir();
    if (!dashboardDir) {
      this.error(
        'Dashboard package not found. Make sure you are running from the Upriver monorepo root and have run "pnpm install".',
      );
    }

    const clientsPath = flags.clients
      ? resolve(flags.clients)
      : resolve('./clients');

    if (!existsSync(clientsPath)) {
      this.warn(`Clients directory not found at: ${clientsPath}`);
      this.warn('Run "upriver init <url>" to create your first client.');
    }

    const env = {
      ...process.env,
      UPRIVER_CLIENTS_DIR: clientsPath,
      HOST: '0.0.0.0',
      PORT: String(flags.port),
    };

    this.log('');
    this.log(`  Upriver Dashboard`);
    this.log(`  http://localhost:${flags.port}`);
    this.log(`  Clients: ${clientsPath}`);
    this.log('');

    const child = spawn('pnpm', ['run', 'dev'], {
      cwd: dashboardDir,
      env,
      stdio: 'inherit',
    });

    child.on('error', (err) => {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        this.error('pnpm not found. Install pnpm: https://pnpm.io/installation');
      }
      this.error(`Failed to start dashboard: ${err.message}`);
    });

    child.on('exit', (code) => {
      if (code && code !== 0) {
        this.error(`Dashboard exited with code ${code}`);
      }
    });
  }

  private findDashboardDir(): string | null {
    // Walk up from the CLI package root to find packages/dashboard
    const thisFile = fileURLToPath(import.meta.url);
    const cliRoot = resolve(dirname(thisFile), '..', '..', '..');

    const candidates = [
      join(cliRoot, '..', 'dashboard'),        // packages/dashboard (sibling)
      join(process.cwd(), 'packages', 'dashboard'), // from monorepo root
    ];

    for (const candidate of candidates) {
      if (existsSync(join(candidate, 'package.json'))) {
        return candidate;
      }
    }

    return null;
  }
}
