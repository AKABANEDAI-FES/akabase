import type { ProjectRepository } from "./repositories/interfaces";
import { ProjectRepositoryImpl } from "./repositories/project-repository";

/**
 * Dependencies container for use cases
 * Provides repository instances to application layer
 */
export type Dependencies = {
  projectRepo: ProjectRepository;
  // organizationRepo: OrganizationRepository; // TODO: Implement
  // eventRepo: EventRepository;               // TODO: Implement
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
    // organizationRepo: new OrganizationRepositoryImpl(),
    // eventRepo: new EventRepositoryImpl(),
    // userRepo: new UserRepositoryImpl(),
  };
}

/**
 * Global dependencies instance
 * Use this in server-side code (loaders, actions, API routes)
 */
export const dependencies = createDependencies();
