import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { CurrentAdmin } from '../common/decorators';
import { Language } from '../graphql/enums';
import { BusinessTeamService } from './business-team.service';
import { AdminPasswordService } from './admin-password.service';
import { BusinessTeam, BusinessTeamMember } from './entities';
import { InviteBusinessAdminInput, UpdateBusinessAdminInput } from './dto';

/**
 * A business's own panel accounts, and the panel's password links (USR-15).
 * The team calls need a business account that is the owner or holds
 * MANAGE_BUSINESS_TEAM; the two password calls are public, answered the same
 * way whatever the address.
 */
@Resolver()
export class BusinessTeamResolver {
  constructor(
    private readonly team: BusinessTeamService,
    private readonly passwords: AdminPasswordService,
  ) {}

  @Query(() => BusinessTeam, {
    name: 'myBusinessTeam',
    description:
      "The signed-in business account's team and its plan's panel accounts.",
  })
  myBusinessTeam(
    @CurrentAdmin() adminId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.team.getMyTeam({ adminId, language });
  }

  @Mutation(() => BusinessTeamMember, {
    description:
      'Add a member to your business team, up to the plan’s accounts. They get an email to choose a password.',
  })
  inviteBusinessAdmin(
    @CurrentAdmin() adminId: string,
    @Args('input') input: InviteBusinessAdminInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.team.inviteMember({ adminId, language, input });
  }

  @Mutation(() => BusinessTeamMember, {
    description: 'Change a team member’s name, role or permissions.',
  })
  updateBusinessAdmin(
    @CurrentAdmin() adminId: string,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateBusinessAdminInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.team.updateMember({ adminId, language, id, input });
  }

  @Mutation(() => BusinessTeamMember, {
    description:
      'Turn a team member off or back on. Turning one on needs a free account.',
  })
  setBusinessAdminActive(
    @CurrentAdmin() adminId: string,
    @Args('id', { type: () => ID }) id: string,
    @Args('isActive') isActive: boolean,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.team.setMemberActive({ adminId, language, id, isActive });
  }

  @Mutation(() => Boolean, {
    description: 'Email a team member a fresh link to choose their password.',
  })
  resendBusinessAdminInvite(
    @CurrentAdmin() adminId: string,
    @Args('id', { type: () => ID }) id: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.team.resendInvite({ adminId, language, id });
  }

  @Mutation(() => Boolean, {
    description:
      'The panel’s "forgot password": emails a link to choose a new one. Always true.',
  })
  requestAdminPasswordReset(
    @Args('email') email: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.passwords.requestReset({ email, language });
  }

  @Mutation(() => Boolean, {
    description:
      'Choose a panel password with the link from an invite or reset email.',
  })
  setAdminPassword(
    @Args('token') token: string,
    @Args('newPassword') newPassword: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.passwords.setPassword({ token, newPassword, language });
  }
}
