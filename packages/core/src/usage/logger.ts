import type { UsageEvent } from '../types/audit.js';

const CLAUDE_COSTS: Record<string, { input: number; output: number }> = {
  'claude-opus-4-7': { input: 0.000015, output: 0.000075 },
  'claude-sonnet-4-6': { input: 0.000003, output: 0.000015 },
  'claude-haiku-4-5': { input: 0.00000025, output: 0.00000125 },
};

const FIRECRAWL_COST_PER_CREDIT = 0.00333; // ~$100 / 3000 credits

function calcCost(event: UsageEvent): number {
  if (event.credits_used) {
    return event.credits_used * FIRECRAWL_COST_PER_CREDIT;
  }
  if (event.model && event.input_tokens && event.output_tokens) {
    const rates = CLAUDE_COSTS[event.model];
    if (rates) {
      return event.input_tokens * rates.input + event.output_tokens * rates.output;
    }
  }
  return 0;
}

export async function logUsageEvent(event: UsageEvent): Promise<void> {
  const cost = calcCost(event);
  const record = { ...event, cost_usd: cost, created_at: new Date().toISOString() };

  // Supabase insert — skipped if env var is not set
  const supabaseUrl = process.env['UPRIVER_SUPABASE_URL'];
  const supabaseKey = process.env['UPRIVER_SUPABASE_SERVICE_KEY'];

  if (supabaseUrl && supabaseKey) {
    try {
      await fetch(`${supabaseUrl}/rest/v1/usage_events`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(record),
      });
    } catch {
      // non-fatal — local log still captures it
    }
  }
}

export function formatCost(usd: number): string {
  return `$${usd.toFixed(4)}`;
}
