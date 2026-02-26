import { Result } from "@praha/byethrow";
import type { OrganizationDomainService } from "@/domain/organization/service";
import type { OrganizationRepository } from "@/domain/organization/repository";
import type { OrgId, UserId } from "@/domain/shared/ids";
import { canAddMember, canRemoveMember } from "@/domain/organization/logic";
import { ORGANIZATION_ERROR_CODE, organizationError } from "@/domain/organization/errors";

export class OrganizationDomainServiceImpl implements OrganizationDomainService {
  constructor(private readonly organizationRepo: OrganizationRepository) {}

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
