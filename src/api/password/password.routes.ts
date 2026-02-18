import type { FastifyInstance } from 'fastify';
import {
  ROUTE_FORGOT_PASSWORD,
  ROUTE_RESET_PASSWORD,
} from '../../config/constants.js';
import {
  forgotPasswordBody,
  resetPasswordBody,
  resetPasswordResponse200,
} from './password.schema.js';
import { forgotPassword, resetPassword } from './password.controller.js';

export async function passwordRoutes(app: FastifyInstance): Promise<void> {
  // Public routes (no auth)
  app.post(ROUTE_FORGOT_PASSWORD, {
    schema: {
      body: forgotPasswordBody,
      response: { 202: { type: 'null', description: 'Accepted' } },
    },
    handler: forgotPassword,
  });

  app.post(ROUTE_RESET_PASSWORD, {
    schema: {
      body: resetPasswordBody,
      response: { 200: resetPasswordResponse200 },
    },
    handler: resetPassword,
  });
}
