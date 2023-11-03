import * as itty from 'itty-router';
import { Toucan } from 'toucan-js';
import { AnalyticsEngine, createAnalytics } from './analytics';
import { createArtifactRequestHandler } from './artifact-handler';
import { ArtifactStorageReader } from './artifact-storage-reader';
import { AwsClient } from './aws';
import { UnexpectedError } from './errors';
import { createIsKeyValid } from './key-validation';
import { createResponse } from './tracked-response';

type Env = {
  S3_ENDPOINT: string;
  S3_ACCESS_KEY_ID: string;
  S3_SECRET_ACCESS_KEY: string;
  S3_BUCKET_NAME: string;
  S3_SESSION_TOKEN?: string;
  /**
   * KV Storage for the CDN
   */
  HIVE_DATA: KVNamespace;
  SENTRY_DSN: string;
  /**
   * Name of the environment, e.g. staging, production
   */
  SENTRY_ENVIRONMENT: string;
  /**
   * Id of the release
   */
  SENTRY_RELEASE: string;
  USAGE_ANALYTICS: AnalyticsEngine;
  ERROR_ANALYTICS: AnalyticsEngine;
  RESPONSE_ANALYTICS: AnalyticsEngine;
  R2_ANALYTICS: AnalyticsEngine;
  KEY_VALIDATION_ANALYTICS: AnalyticsEngine;
};

const handler: ExportedHandler<Env> = {
  async fetch(request: Request, env, ctx) {
    const s3 = {
      client: new AwsClient({
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
        sessionToken: env.S3_SESSION_TOKEN,
        service: 's3',
      }),
      bucketName: env.S3_BUCKET_NAME,
      endpoint: env.S3_ENDPOINT,
    };

    const analytics = createAnalytics({
      usage: env.USAGE_ANALYTICS,
      error: env.ERROR_ANALYTICS,
      keyValidation: env.KEY_VALIDATION_ANALYTICS,
      response: env.RESPONSE_ANALYTICS,
      r2: env.R2_ANALYTICS,
    });

    const artifactStorageReader = new ArtifactStorageReader(s3, null, analytics);

    const isKeyValid = createIsKeyValid({
      waitUntil: p => ctx.waitUntil(p),
      getCache: () => caches.open('artifacts-auth'),
      s3,
      analytics,
    });

    const handleArtifactRequest = createArtifactRequestHandler({
      isKeyValid,
      analytics,
      async getArtifactAction(targetId, artifactType, eTag) {
        return artifactStorageReader.generateArtifactReadUrl(targetId, artifactType, eTag);
      },
    });

    const router = itty
      .Router()
      .get(
        '/_health',
        () =>
          new Response('OK', {
            status: 200,
          }),
      )
      .get('*', handleArtifactRequest);

    const sentry = new Toucan({
      dsn: env.SENTRY_DSN,
      environment: env.SENTRY_ENVIRONMENT,
      release: env.SENTRY_RELEASE,
      context: ctx,
      requestDataOptions: {
        allowedHeaders: [
          'user-agent',
          'cf-ipcountry',
          'accept-encoding',
          'accept',
          'x-real-ip',
          'cf-connecting-ip',
        ],
        allowedSearchParams: /(.*)/,
      },
    });

    try {
      return await router.handle(request, sentry.captureException.bind(sentry)).then(response => {
        if (response) {
          return response;
        }
        return createResponse(analytics, 'Not found', { status: 404 }, 'unknown');
      });
    } catch (error) {
      console.error(error);
      sentry.captureException(error);
      return new UnexpectedError(analytics);
    }
  },
};

export default handler;
