import { createDbFn } from "./db";
import { createAuthFn } from "./auth";
import { createMiddleware, createServerOnlyFn } from "@tanstack/react-start";
import { EventRepositoryImpl } from "@akabase/infrastructure/repositories/event-repository";
import { ProjectRepositoryImpl } from "@akabase/infrastructure/repositories/project-repository";
import { UserRepositoryImpl } from "@akabase/infrastructure/repositories/user-repository";
import { OrganizationRepositoryImpl } from "@akabase/infrastructure/repositories/organization-repository";
import { ApiKeyServiceImpl } from "@akabase/infrastructure/services/api-key-service";
import { EventDomainServiceImpl } from "@akabase/infrastructure/services/event-domain-service";
import { OrganizationDomainServiceImpl } from "@akabase/infrastructure/services/organization-domain-service";
import { ProjectDomainServiceImpl } from "@akabase/infrastructure/services/project-domain-service";
import { ImageRepositoryImpl } from "@akabase/infrastructure/storage/image-repository";
import { AuthorizationService } from "@akabase/domain/authorization/service";
import { env } from "cloudflare:workers";

export const createDependenciesFn = createServerOnlyFn(() => {
  const db = createDbFn();
  const eventRepo = new EventRepositoryImpl(db);
  const organizationRepo = new OrganizationRepositoryImpl(db);
  const projectRepo = new ProjectRepositoryImpl(db);
  const userRepo = new UserRepositoryImpl(db);
  const eventDomainService = new EventDomainServiceImpl(eventRepo);
  const organizationDomainService = new OrganizationDomainServiceImpl(organizationRepo);
  const projectDomainService = new ProjectDomainServiceImpl(projectRepo);
  const authService = new AuthorizationService();
  const imageRepo = new ImageRepositoryImpl(env.STORAGE, db);
  const apiKeyService = new ApiKeyServiceImpl(createAuthFn(), db);

  return {
    db,
    projectRepo,
    eventRepo,
    userRepo,
    organizationRepo,
    eventDomainService,
    organizationDomainService,
    projectDomainService,
    authService,
    imageRepo,
    apiKeyService,
  };
});

export const dependenciesMiddleware = createMiddleware().server(async ({ next }) => {
  const dependencies = createDependenciesFn();
  return next({
    context: {
      dependencies,
    },
  });
});
