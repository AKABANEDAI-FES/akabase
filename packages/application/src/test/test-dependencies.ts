import type { Database } from "@akabase/infrastructure/db";
import { EventRepositoryImpl } from "@akabase/infrastructure/repositories/event-repository";
import { ProjectRepositoryImpl } from "@akabase/infrastructure/repositories/project-repository";
import { UserRepositoryImpl } from "@akabase/infrastructure/repositories/user-repository";
import { OrganizationRepositoryImpl } from "@akabase/infrastructure/repositories/organization-repository";
import { EventDomainServiceImpl } from "@akabase/infrastructure/services/event-domain-service";
import { OrganizationDomainServiceImpl } from "@akabase/infrastructure/services/organization-domain-service";
import { ProjectDomainServiceImpl } from "@akabase/infrastructure/services/project-domain-service";
import { AuthorizationService } from "@akabase/domain/authorization/service";
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
