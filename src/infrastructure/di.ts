import type { EventRepository, ProjectRepository } from "./repositories/interfaces";
import type { AuthorizationService } from "@/domain/authorization/service";
import { EventRepositoryImpl } from "./repositories/event-repository";
import { ProjectRepositoryImpl } from "./repositories/project-repository";
import { AuthorizationServiceImpl } from "./authorization/authorization-service-impl";

/**
 * Dependencies container for use cases
 * Provides repository instances and services to application layer
 */
export type Dependencies = {
  projectRepo: ProjectRepository;
  eventRepo: EventRepository;
  authService: AuthorizationService;
  // organizationRepo: OrganizationRepository; // TODO: Implement
  // userRepo: UserRepository;                 // TODO: Implement
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
    authService: new AuthorizationServiceImpl(),
    // organizationRepo: new OrganizationRepositoryImpl(),
    // userRepo: new UserRepositoryImpl(),
  };
}

/**
 * Global dependencies instance
 * Use this in server-side code (loaders, actions, API routes)
 */
export const dependencies = createDependencies();
