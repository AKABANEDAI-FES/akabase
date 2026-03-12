import type { Database } from "@archive/infrastructure/db";
import { EventRepositoryImpl } from "@archive/infrastructure/repositories/event-repository";
import { ProjectRepositoryImpl } from "@archive/infrastructure/repositories/project-repository";
import { UserRepositoryImpl } from "@archive/infrastructure/repositories/user-repository";
import { OrganizationRepositoryImpl } from "@archive/infrastructure/repositories/organization-repository";
import { EventDomainServiceImpl } from "@archive/infrastructure/services/event-domain-service";
import { OrganizationDomainServiceImpl } from "@archive/infrastructure/services/organization-domain-service";
import { ProjectDomainServiceImpl } from "@archive/infrastructure/services/project-domain-service";
import { AuthorizationService } from "@archive/domain/authorization/service";
import { MockImageRepository } from "./mock-image-repository";

export function createTestDependencies(db: Database) {
  const eventRepo = new EventRepositoryImpl(db);
  const organizationRepo = new OrganizationRepositoryImpl(db);
  const projectRepo = new ProjectRepositoryImpl(db);
  const userRepo = new UserRepositoryImpl(db);

  return {
    db,
    projectRepo,
    eventRepo,
    userRepo,
    organizationRepo,
    eventDomainService: new EventDomainServiceImpl(eventRepo),
    organizationDomainService: new OrganizationDomainServiceImpl(organizationRepo),
    projectDomainService: new ProjectDomainServiceImpl(projectRepo),
    authService: new AuthorizationService(),
    imageRepo: new MockImageRepository(),
  };
}
