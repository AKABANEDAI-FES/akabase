import type { Dependencies } from "@/infrastructure/di";
import type { Database } from "@/db";
import { EventRepositoryImpl } from "@/infrastructure/repositories/event-repository";
import { ProjectRepositoryImpl } from "@/infrastructure/repositories/project-repository";
import { UserRepositoryImpl } from "@/infrastructure/repositories/user-repository";
import { OrganizationRepositoryImpl } from "@/infrastructure/repositories/organization-repository";
import { EventDomainServiceImpl } from "@/infrastructure/domain-services/event-domain-service";
import { OrganizationDomainServiceImpl } from "@/infrastructure/domain-services/organization-domain-service";
import { ProjectDomainServiceImpl } from "@/infrastructure/domain-services/project-domain-service";
import { AuthorizationServiceImpl } from "@/infrastructure/authorization/authorization-service-impl";
import { MockStorageService } from "./mock-storage-service";

export function createTestDependencies(db: Database): Dependencies {
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
    authService: new AuthorizationServiceImpl(),
    storageService: new MockStorageService(),
  };
}
