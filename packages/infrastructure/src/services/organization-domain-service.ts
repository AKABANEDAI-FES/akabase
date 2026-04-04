import { Result } from "@akabase/result";
import type { OrganizationDomainService } from "@akabase/domain/organization/service";
import type { OrganizationRepository } from "@akabase/domain/organization/repository";
import type { OrgId } from "@akabase/domain/organization/schema";
import type { UserId } from "@akabase/domain/user/schema";
import { canAddMember, canRemoveMember } from "@akabase/domain/organization/logic";
import { ORGANIZATION_ERROR_CODE, organizationError } from "@akabase/domain/organization/errors";

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
