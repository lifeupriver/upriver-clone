import { S3Client } from '@aws-sdk/client-s3';

/**
 * Backblaze B2 is S3-compatible. We use the AWS SDK pointed at a B2 endpoint.
 * Required env:
 *   - B2_KEY_ID            (application key id)
 *   - B2_APPLICATION_KEY   (application key)
 *   - B2_BUCKET            (bucket name; archives land at clients/<slug>/<slug>-<timestamp>.tar.gz)
 *   - B2_ENDPOINT          (e.g. https://s3.us-west-002.backblazeb2.com)
 *   - B2_REGION            (e.g. us-west-002)
 */
export interface B2Config {
  bucket: string;
  endpoint: string;
  region: string;
  keyId: string;
  applicationKey: string;
}

export function readB2ConfigFromEnv(): B2Config {
  const missing: string[] = [];
  const get = (k: string): string => {
    const v = process.env[k];
    if (!v) missing.push(k);
    return v ?? '';
  };
  const cfg: B2Config = {
    keyId: get('B2_KEY_ID'),
    applicationKey: get('B2_APPLICATION_KEY'),
    bucket: get('B2_BUCKET'),
    endpoint: get('B2_ENDPOINT'),
    region: get('B2_REGION'),
  };
  if (missing.length > 0) {
    throw new Error(
      `B2 not configured. Missing env: ${missing.join(', ')}. Set them in .env or your shell.`,
    );
  }
  return cfg;
}

export function makeB2Client(cfg: B2Config): S3Client {
  return new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    credentials: { accessKeyId: cfg.keyId, secretAccessKey: cfg.applicationKey },
    forcePathStyle: false,
  });
}
