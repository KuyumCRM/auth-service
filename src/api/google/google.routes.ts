// Google OAuth routes: initiate, callback.
import type { FastifyInstance } from 'fastify';
import { ROUTE_GOOGLE_INITIATE, ROUTE_GOOGLE_CALLBACK } from '../../config/constants.js';
import {
  initiateBody,
  initiateResponse200,
  callbackBody,
  callbackLoginResponse200,
  callbackSignupResponse201,
  googleErrorResponse,
} from './google.schema.js';
import { initiate, callback } from './google.controller.js';

export async function googleRoutes(app: FastifyInstance): Promise<void> {
  app.post(ROUTE_GOOGLE_INITIATE, {
    schema: {
      body: initiateBody,
      response: {
        200: initiateResponse200,
        400: googleErrorResponse,
        502: googleErrorResponse,
      },
    },
    handler: initiate,
  });

  app.post(ROUTE_GOOGLE_CALLBACK, {
    schema: {
      body: callbackBody,
      response: {
        200: callbackLoginResponse200,
        201: callbackSignupResponse201,
        400: googleErrorResponse,
        403: googleErrorResponse,
        409: googleErrorResponse,
        502: googleErrorResponse,
      },
    },
    handler: callback,
  });
}
