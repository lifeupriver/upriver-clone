/**
 * Central registry of environment variables the CLI consumes. Add new vars
 * here so that:
 *   - missing-required errors point users at a useful description
 *   - optional vars are documented in one place
 *   - `BaseCommand.requireEnv` can produce consistent error messages
 */

export interface EnvVarSpec {
  name: string;
  required: boolean;
  description: string;
  example?: string;
}

export const ENV_REGISTRY: Record<string, EnvVarSpec> = {
  FIRECRAWL_API_KEY: {
    name: 'FIRECRAWL_API_KEY',
    required: true,
    description: 'Firecrawl API key. Required for scrape and audit commands. Sign up at firecrawl.dev.',
    example: 'fc-...',
  },
  GOOGLE_SERVICE_ACCOUNT_KEY: {
    name: 'GOOGLE_SERVICE_ACCOUNT_KEY',
    required: false,
    description:
      'Path to a Google service account JSON file. Required for GSC and Analytics audit passes. Download from Google Cloud Console → IAM → Service Accounts.',
    example: '/path/to/upriver-service-account.json',
  },
  UPRIVER_SUPABASE_URL: {
    name: 'UPRIVER_SUPABASE_URL',
    required: false,
    description: 'Internal Supabase project URL for usage logging. Optional — usage logs degrade silently if unset.',
    example: 'https://[ref].supabase.co',
  },
  UPRIVER_SUPABASE_SERVICE_KEY: {
    name: 'UPRIVER_SUPABASE_SERVICE_KEY',
    required: false,
    description: 'Service-role key for the internal usage Supabase. Paired with UPRIVER_SUPABASE_URL.',
  },
  UPRIVER_GIT_EMAIL: {
    name: 'UPRIVER_GIT_EMAIL',
    required: false,
    description: 'Committer email for `clone` and `fixes apply` initial commits. Defaults to upriver@lifeupriver.com.',
  },
  UPRIVER_GIT_NAME: {
    name: 'UPRIVER_GIT_NAME',
    required: false,
    description: 'Committer name for `clone` and `fixes apply` initial commits. Defaults to "Upriver Bot".',
  },
  AHREFS_API_KEY: {
    name: 'AHREFS_API_KEY',
    required: false,
    description:
      'Ahrefs API key. NOTE: integration is currently a stub — setting this only changes the wording of the backlinks audit, no real API calls happen yet.',
  },
  CLAUDE_BIN: {
    name: 'CLAUDE_BIN',
    required: false,
    description: 'Override the `claude` CLI executable used for visual cloning. Defaults to looking up `claude` on PATH.',
  },
  UPRIVER_DEBUG: {
    name: 'UPRIVER_DEBUG',
    required: false,
    description: 'Set to anything truthy to surface debug-level log output (silent-catch reasons, retry traces).',
  },
  UPRIVER_REPORT_HOST: {
    name: 'UPRIVER_REPORT_HOST',
    required: false,
    description:
      'Host where the static report bundle is published, used by `upriver report send` to build share URLs. Defaults to https://reports.upriverhudsonvalley.com.',
    example: 'https://reports.upriverhudsonvalley.com',
  },
  RESEND_API_KEY: {
    name: 'RESEND_API_KEY',
    required: false,
    description:
      '`upriver report send` delivers via the Resend API when this is set; otherwise it prints the email body for manual forwarding.',
    example: 're_...',
  },
  UPRIVER_REPORT_FROM: {
    name: 'UPRIVER_REPORT_FROM',
    required: false,
    description:
      'Sender address `upriver report send` uses with Resend. Must be on a Resend-verified domain. Defaults to reports@upriverhudsonvalley.com.',
    example: 'reports@upriverhudsonvalley.com',
  },
};

export function describeEnvVar(name: string): string {
  const spec = ENV_REGISTRY[name];
  if (!spec) return `Required environment variable ${name} is not set.`;
  let msg = `Required environment variable ${spec.name} is not set.\n  ${spec.description}`;
  if (spec.example) msg += `\n  Example: ${spec.name}=${spec.example}`;
  return msg;
}
