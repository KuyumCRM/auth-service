import type { FastifyInstance } from 'fastify';
import {
  registerBody,
  registerResponse201,
  loginBody,
  loginResponse200,
  refreshResponse200,
  logoutBody,
  forgotPasswordBody,
  resetPasswordBody,
  resetPasswordResponse200,
  verifyEmailBody,
  verifyEmailResponse200,
  meResponse200,
} from './auth.schema.js';
import {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  me,
} from './auth.controller.js';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const guard = app.authenticateGuard!;

  app.post('/register', {
    schema: {
      body: registerBody,
      response: { 201: registerResponse201 },
    },
    handler: register,
  });

  app.post('/login', {
    schema: {
      body: loginBody,
      response: { 200: loginResponse200 },
    },
    handler: login,
  });

  app.post('/refresh', {
    schema: {
      response: { 200: refreshResponse200 },
    },
    handler: refresh,
  });

  app.post('/logout', {
    preHandler: [guard],
    schema: {
      body: logoutBody,
      response: { 204: { type: 'null', description: 'No content' } },
    },
    handler: logout,
  });

  app.post('/forgot-password', {
    schema: {
      body: forgotPasswordBody,
      response: { 202: { type: 'null', description: 'Accepted' } },
    },
    handler: forgotPassword,
  });

  app.post('/reset-password', {
    schema: {
      body: resetPasswordBody,
      response: { 200: resetPasswordResponse200 },
    },
    handler: resetPassword,
  });

  app.post('/verify-email', {
    schema: {
      body: verifyEmailBody,
      response: { 200: verifyEmailResponse200 },
    },
    handler: verifyEmail,
  });

  app.get('/me', {
    preHandler: [guard],
    schema: {
      response: { 200: meResponse200 },
    },
    handler: me,
  });
}
