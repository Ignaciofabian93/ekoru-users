import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ID,
  Context,
} from '@nestjs/graphql';
import { AdminsService } from './admins.service';
import { Admin, AdminConnection } from './entities';
import { RegisterAdminInput, UpdateAdminInput } from './dto';
import {
  AdminType,
  AdminRole,
  AdminPermission,
  Language,
} from '../graphql/enums';

@Resolver(() => Admin)
export class AdminsResolver {
  constructor(private readonly adminsService: AdminsService) {}

  // ─── Queries ──────────────────────────────────────────────────────────────────

  @Query(() => AdminConnection, { name: 'getAdmins' })
  async getAdmins(
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
    @Args('adminType', { type: () => AdminType, nullable: true })
    adminType?: AdminType,
    @Args('role', { type: () => AdminRole, nullable: true })
    role?: AdminRole,
    @Args('isActive', { nullable: true }) isActive?: boolean,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number = 1,
    @Args('pageSize', { type: () => Int, defaultValue: 10 })
    pageSize: number = 10,
  ) {
    return this.adminsService.getAdmins(
      language,
      adminType,
      role,
      isActive,
      page,
      pageSize,
    );
  }

  @Query(() => Admin, { name: 'getAdmin', nullable: true })
  async getAdmin(
    @Args('id', { type: () => ID }) id: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.adminsService.getAdmin(id, language);
  }

  @Query(() => Admin, { name: 'getMyData', nullable: true })
  async getMyData(
    @Context() ctx: { adminId?: string },
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    if (!ctx.adminId) return null;
    return this.adminsService.getMyData(ctx.adminId, language);
  }

  // ─── Mutations ────────────────────────────────────────────────────────────────

  @Mutation(() => Admin, { name: 'createAdmin' })
  async createAdmin(
    @Args('input') input: RegisterAdminInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.adminsService.createAdmin(input, language);
  }

  @Mutation(() => Admin, { name: 'updateAdmin' })
  async updateAdmin(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateAdminInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.adminsService.updateAdmin(id, input, language);
  }

  @Mutation(() => Admin, { name: 'deleteAdmin' })
  async deleteAdmin(
    @Args('id', { type: () => ID }) id: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.adminsService.deleteAdmin(id, language);
  }

  @Mutation(() => Admin, { name: 'toggleAdminStatus' })
  async toggleAdminStatus(
    @Args('id', { type: () => ID }) id: string,
    @Args('isActive') isActive: boolean,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.adminsService.toggleAdminStatus(id, isActive, language);
  }

  @Mutation(() => Admin, { name: 'assignPermissions' })
  async assignPermissions(
    @Args('id', { type: () => ID }) id: string,
    @Args('permissions', { type: () => [AdminPermission] })
    permissions: AdminPermission[],
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.adminsService.assignPermissions(id, permissions, language);
  }
}
