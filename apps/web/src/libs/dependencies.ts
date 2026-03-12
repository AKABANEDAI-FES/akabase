import { createDbFn } from "./db";
import { createMiddleware, createServerOnlyFn } from "@tanstack/react-start";
import { EventRepositoryImpl } from "@archive/infrastructure/repositories/event-repository";
import { ProjectRepositoryImpl } from "@archive/infrastructure/repositories/project-repository";
import { UserRepositoryImpl } from "@archive/infrastructure/repositories/user-repository";
import { OrganizationRepositoryImpl } from "@archive/infrastructure/repositories/organization-repository";
import { EventDomainServiceImpl } from "@archive/infrastructure/services/event-domain-service";
import { OrganizationDomainServiceImpl } from "@archive/infrastructure/services/organization-domain-service";
import { ProjectDomainServiceImpl } from "@archive/infrastructure/services/project-domain-service";
import { ImageRepositoryImpl } from "@archive/infrastructure/storage/image-repository";
import { AuthorizationService } from "@archive/domain/authorization/service";
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
