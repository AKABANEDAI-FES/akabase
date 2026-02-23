import type { ProjectRepository } from "@/domain/project/repository";
import type { EventRepository } from "@/domain/event/repository";
import type { UserRepository } from "@/domain/user/repository";
import type { AuthorizationService } from "@/domain/authorization/service";
import type { StorageService } from "@/domain/shared/storage";
import { EventRepositoryImpl } from "./repositories/event-repository";
import { ProjectRepositoryImpl } from "./repositories/project-repository";
import { UserRepositoryImpl } from "./repositories/user-repository";
import { AuthorizationServiceImpl } from "./authorization/authorization-service-impl";
import { StorageServiceImpl } from "./storage/storage-service";

/**
 * Dependencies container for use cases
 * Provides repository instances and services to application layer
 */
export type Dependencies = {
  projectRepo: ProjectRepository;
  eventRepo: EventRepository;
  userRepo: UserRepository;
  authService: AuthorizationService;
  storageService: StorageService;
  // organizationRepo: OrganizationRepository; // TODO: Implement
};

/**
 * Create dependencies container
 * In the future, this could be extended to support different implementations
 * (e.g., mock repositories for testing)
 */
export function createDependencies(): Dependencies {
  return {
    projectRepo: new ProjectRepositoryImpl(),
    eventRepo: new EventRepositoryImpl(),
    userRepo: new UserRepositoryImpl(),
    authService: new AuthorizationServiceImpl(),
    storageService: new StorageServiceImpl(),
    // organizationRepo: new OrganizationRepositoryImpl(),
  };
}

/**
 * Global dependencies instance
 * Use this in server-side code (loaders, actions, API routes)
 */
export const dependencies = createDependencies();
