// Instagram onboarding routes: connect + callback.
import type { FastifyInstance } from 'fastify';
import { ROUTE_ONBOARD_CONNECT, ROUTE_ONBOARD_CALLBACK } from '../../config/constants.js';
import {
  onboardConnectResponse200,
  onboardCallbackQuerystring,
  onboardCallbackSuccess200,
  onboardErrorResponse,
} from './instagram.schema.js';
import { onboardConnect, onboardCallback } from './instagram.controller.js';

export async function instagramRoutes(app: FastifyInstance): Promise<void> {
  app.post(ROUTE_ONBOARD_CONNECT, {
    schema: {
      response: {
        200: onboardConnectResponse200,
        403: onboardErrorResponse,
        409: onboardErrorResponse,
        502: onboardErrorResponse,
      },
    },
    handler: onboardConnect,
  });

  app.get<{ Querystring: { code: string; state: string } }>(ROUTE_ONBOARD_CALLBACK, {
    schema: {
      querystring: onboardCallbackQuerystring,
      response: {
        200: onboardCallbackSuccess200,
        403: onboardErrorResponse,
        409: onboardErrorResponse,
        502: onboardErrorResponse,
      },
    },
    handler: onboardCallback,
  });
}
