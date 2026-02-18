import type { FastifyInstance } from 'fastify';
import {
  ROUTE_SIGNUP,
  ROUTE_CREATE_WORKSPACE,
  ROUTE_ACCEPT_INVITE,
  ROUTE_LOGIN,
  ROUTE_REFRESH,
  ROUTE_VERIFY_EMAIL,
  ROUTE_SWITCH_TENANT,
  ROUTE_LOGOUT,
  ROUTE_ME,
} from '../../config/constants.js';
import {
  signupBody,
  signupResponse201,
  createWorkspaceBody,
  createWorkspaceResponse201,
  acceptInviteBody,
  acceptInviteResponse201,
  loginBody,
  loginResponse200,
  switchTenantBody,
  switchTenantResponse200,
  refreshResponse200,
  logoutBody,
  verifyEmailBody,
  verifyEmailResponse200,
  meResponse200,
} from './auth.schema.js';
import {
  signup,
  createWorkspace,
  acceptInvite,
  login,
  switchTenant,
  refresh,
  logout,
  verifyEmail,
  me,
} from './auth.controller.js';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const guard = app.authenticateGuard!;

  // Public routes (no auth)
  app.post(ROUTE_SIGNUP, {
    schema: {
      body: signupBody,
      response: { 201: signupResponse201 },
    },
    handler: signup,
  });

  app.post(ROUTE_CREATE_WORKSPACE, {
    preHandler: [app.optionalAuthenticateGuard!],
    schema: {
      body: createWorkspaceBody,
      response: { 201: createWorkspaceResponse201 },
    },
    handler: createWorkspace,
  });

  app.post(ROUTE_ACCEPT_INVITE, {
    schema: {
      body: acceptInviteBody,
      response: { 201: acceptInviteResponse201 },
    },
    handler: acceptInvite,
  });

  app.post(ROUTE_LOGIN, {
    schema: {
      body: loginBody,
      response: { 200: loginResponse200 },
    },
    handler: login,
  });

  app.post(ROUTE_REFRESH, {
    schema: {
      response: { 200: refreshResponse200 },
    },
    handler: refresh,
  });

  app.post(ROUTE_VERIFY_EMAIL, {
    schema: {
      body: verifyEmailBody,
      response: { 200: verifyEmailResponse200 },
    },
    handler: verifyEmail,
  });

  // Authenticated routes
  app.post(ROUTE_SWITCH_TENANT, {
    preHandler: [guard],
    schema: {
      body: switchTenantBody,
      response: { 200: switchTenantResponse200 },
    },
    handler: switchTenant,
  });

  app.post(ROUTE_LOGOUT, {
    preHandler: [guard],
    schema: {
      body: logoutBody,
      response: { 204: { type: 'null', description: 'No content' } },
    },
    handler: logout,
  });

  app.get(ROUTE_ME, {
    preHandler: [guard],
    schema: {
      response: { 200: meResponse200 },
    },
    handler: me,
  });
}
