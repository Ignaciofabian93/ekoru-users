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

  @Query(() => AdminConnection, {
    name: 'getAdmins',
    description: 'Get a paginated list of admins',
  })
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

  @Query(() => Admin, {
    name: 'getAdmin',
    nullable: true,
    description: 'Get a specific admin by ID',
  })
  async getAdmin(
    @Args('id', { type: () => ID }) id: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.adminsService.getAdmin(id, language);
  }

  @Query(() => Admin, {
    name: 'getMyData',
    nullable: true,
    description: 'Get the data of the current admin',
  })
  async getMyData(
    @Context() ctx: { adminId?: string },
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    if (!ctx.adminId) return null;
    return this.adminsService.getMyData(ctx.adminId, language);
  }

  // ─── Mutations ────────────────────────────────────────────────────────────────

  @Mutation(() => Admin, {
    name: 'createAdmin',
    description:
      'Create a new admin (platform or business). Requires MANAGE_ADMINS.',
  })
  async createAdmin(
    @Context() ctx: { adminId?: string },
    @Args('input') input: RegisterAdminInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.adminsService.createAdmin(ctx.adminId ?? '', input, language);
  }

  @Mutation(() => Admin, {
    name: 'updateAdmin',
    description: 'Update an existing admin. Requires MANAGE_ADMINS.',
  })
  async updateAdmin(
    @Context() ctx: { adminId?: string },
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateAdminInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.adminsService.updateAdmin(
      ctx.adminId ?? '',
      id,
      input,
      language,
    );
  }

  @Mutation(() => Admin, {
    name: 'deleteAdmin',
    description:
      'Deactivate an admin (soft delete; record is kept). Requires MANAGE_ADMINS.',
  })
  async deleteAdmin(
    @Context() ctx: { adminId?: string },
    @Args('id', { type: () => ID }) id: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.adminsService.deleteAdmin(ctx.adminId ?? '', id, language);
  }

  @Mutation(() => Admin, {
    name: 'toggleAdminStatus',
    description: 'Activate or deactivate an admin. Requires MANAGE_ADMINS.',
  })
  async toggleAdminStatus(
    @Context() ctx: { adminId?: string },
    @Args('id', { type: () => ID }) id: string,
    @Args('isActive') isActive: boolean,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.adminsService.toggleAdminStatus(
      ctx.adminId ?? '',
      id,
      isActive,
      language,
    );
  }

  @Mutation(() => Admin, {
    name: 'assignPermissions',
    description: 'Assign permissions to an admin. Requires MANAGE_ADMINS.',
  })
  async assignPermissions(
    @Context() ctx: { adminId?: string },
    @Args('id', { type: () => ID }) id: string,
    @Args('permissions', { type: () => [AdminPermission] })
    permissions: AdminPermission[],
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.adminsService.assignPermissions(
      ctx.adminId ?? '',
      id,
      permissions,
      language,
    );
  }
}
