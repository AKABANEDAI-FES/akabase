import type { ProjectRepository } from "@/domain/project/repository";
import type { EventRepository } from "@/domain/event/repository";
import type { UserRepository } from "@/domain/user/repository";
import type { OrganizationRepository } from "@/domain/organization/repository";
import type { AuthorizationService } from "@/domain/authorization/service";
import type { EventDomainService } from "@/domain/event/service";
import type { OrganizationDomainService } from "@/domain/organization/service";
import type { ProjectDomainService } from "@/domain/project/service";
import type { StorageService } from "@/domain/shared/storage";
import type { Database } from "@/db";
import { db } from "@/db";
import { EventRepositoryImpl } from "./repositories/event-repository";
import { ProjectRepositoryImpl } from "./repositories/project-repository";
import { UserRepositoryImpl } from "./repositories/user-repository";
import { OrganizationRepositoryImpl } from "./repositories/organization-repository";
import { EventDomainServiceImpl } from "./domain-services/event-domain-service";
import { OrganizationDomainServiceImpl } from "./domain-services/organization-domain-service";
import { ProjectDomainServiceImpl } from "./domain-services/project-domain-service";
import { AuthorizationServiceImpl } from "./authorization/authorization-service-impl";
import { StorageServiceImpl } from "./storage/storage-service";

/**
 * Dependencies container for use cases
 * Provides repository instances and services to application layer
 */
export type Dependencies = {
  db: Database;
  projectRepo: ProjectRepository;
  eventRepo: EventRepository;
  userRepo: UserRepository;
  organizationRepo: OrganizationRepository;
  eventDomainService: EventDomainService;
  organizationDomainService: OrganizationDomainService;
  projectDomainService: ProjectDomainService;
  authService: AuthorizationService;
  storageService: StorageService;
};

/**
 * Create dependencies container
 * In the future, this could be extended to support different implementations
 * (e.g., mock repositories for testing)
 */
export function createDependencies(): Dependencies {
  const eventRepo = new EventRepositoryImpl();
  const organizationRepo = new OrganizationRepositoryImpl();
  const projectRepo = new ProjectRepositoryImpl();
  return {
    db,
    projectRepo,
    eventRepo,
    userRepo: new UserRepositoryImpl(),
    organizationRepo: organizationRepo,
    eventDomainService: new EventDomainServiceImpl(eventRepo),
    organizationDomainService: new OrganizationDomainServiceImpl(organizationRepo),
    projectDomainService: new ProjectDomainServiceImpl(projectRepo),
    authService: new AuthorizationServiceImpl(),
    storageService: new StorageServiceImpl(),
  };
}

/**
 * Global dependencies instance
 * Use this in server-side code (loaders, actions, API routes)
 */
export const dependencies = createDependencies();
