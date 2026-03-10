import { Result } from "@archive/result";
import type { OrganizationDomainService } from "@archive/domain/organization/service";
import type { OrganizationRepository } from "@archive/domain/organization/repository";
import type { OrgId } from "@archive/domain/organization/schema";
import type { UserId } from "@archive/domain/user/schema";
import { canAddMember, canRemoveMember } from "@archive/domain/organization/logic";
import { ORGANIZATION_ERROR_CODE, organizationError } from "@archive/domain/organization/errors";

export class OrganizationDomainServiceImpl implements OrganizationDomainService {
  private readonly organizationRepo: OrganizationRepository;

  constructor(organizationRepo: OrganizationRepository) {
    this.organizationRepo = organizationRepo;
  }

  async ensureCanAddMember(orgId: OrgId, userId: UserId) {
    const members = await this.organizationRepo.findMembers(orgId);
    return canAddMember(members, userId);
  }

  async ensureCanRemoveMember(orgId: OrgId, userId: UserId) {
    const members = await this.organizationRepo.findMembers(orgId);
    return canRemoveMember(members, userId);
  }

  async ensureMemberExists(orgId: OrgId, userId: UserId) {
    const members = await this.organizationRepo.findMembers(orgId);

    const member = members.find((m) => m.userId === userId);
    if (!member) {
      return Result.fail(
        organizationError(
          ORGANIZATION_ERROR_CODE.USER_NOT_MEMBER,
          "このユーザーはメンバーではありません。",
        ),
      );
    }

    return Result.succeed(member);
  }
}
