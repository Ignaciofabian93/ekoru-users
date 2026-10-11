import { Resolver, Query, Mutation, Args, Int, ID } from '@nestjs/graphql';
import { AdminsService } from './admins.service';
import { Admin, AdminActivityLogConnection, AdminConnection } from './entities';
import { DateTimeScalar } from '../graphql/scalars';
import {
  RegisterAdminInput,
  UpdateAdminInput,
  AdminUpsertRowInput,
} from './dto';
import {
  AdminType,
  AdminRole,
  AdminPermission,
  Language,
} from '../graphql/enums';
import { CurrentAdmin } from '../common/decorators';
import { UsersBulkUpsertResult } from '../common/bulk';

@Resolver(() => Admin)
export class AdminsResolver {
  constructor(private readonly adminsService: AdminsService) {}

  // ─── Queries ──────────────────────────────────────────────────────────────────

  @Query(() => AdminConnection, {
    name: 'getAdmins',
    description: 'Get a paginated list of admins',
  })
  async getAdmins(
    @CurrentAdmin() adminId: string,
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
    @Args('searchQuery', { nullable: true }) searchQuery?: string,
  ) {
    return this.adminsService.getAdmins({
      adminId,
      language,
      adminType,
      role,
      isActive,
      page,
      pageSize,
      searchQuery,
    });
  }

  @Query(() => AdminActivityLogConnection, {
    name: 'adminActivityLogs',
    description:
      'What admins did, newest first (ADM-7). Platform admins with VIEW_SYSTEM_LOGS.',
  })
  async adminActivityLogs(
    @CurrentAdmin() adminId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 20 }) pageSize: number,
    @Args('actorId', { type: () => ID, nullable: true }) actorId?: string,
    @Args('action', { nullable: true }) action?: string,
    @Args('entityType', { nullable: true }) entityType?: string,
    @Args('entityId', { nullable: true }) entityId?: string,
    @Args('from', { type: () => DateTimeScalar, nullable: true }) from?: Date,
    @Args('to', { type: () => DateTimeScalar, nullable: true }) to?: Date,
  ) {
    return this.adminsService.getActivityLogs({
      adminId,
      language,
      page,
      pageSize,
      actorId,
      action,
      entityType,
      entityId,
      from,
      to,
    });
  }

  @Query(() => Admin, {
    name: 'getAdmin',
    nullable: true,
    description:
      'Get a specific admin by ID. Your own profile, or anyone with MANAGE_ADMINS.',
  })
  async getAdmin(
    @CurrentAdmin() adminId: string,
    @Args('id', { type: () => ID }) id: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.adminsService.getAdmin({ adminId, id, language });
  }

  @Query(() => Admin, {
    name: 'getMyData',
    nullable: true,
    description: 'Get the data of the current admin',
  })
  async getMyData(
    @CurrentAdmin() adminId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    if (!adminId) return null;
    return this.adminsService.getMyData({ adminId, language });
  }

  // ─── Mutations ────────────────────────────────────────────────────────────────

  @Mutation(() => Admin, {
    name: 'createAdmin',
    description:
      'Create a new admin (platform or business). Requires MANAGE_ADMINS.',
  })
  async createAdmin(
    @CurrentAdmin() adminId: string,
    @Args('input') input: RegisterAdminInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.adminsService.createAdmin({
      callerId: adminId,
      input,
      language,
    });
  }

  @Mutation(() => Admin, {
    name: 'updateAdmin',
    description: 'Update an existing admin. Requires MANAGE_ADMINS.',
  })
  async updateAdmin(
    @CurrentAdmin() adminId: string,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateAdminInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.adminsService.updateAdmin({
      callerId: adminId,
      id,
      input,
      language,
    });
  }

  @Mutation(() => Admin, {
    name: 'deleteAdmin',
    description:
      'Deactivate an admin (soft delete; record is kept). Requires MANAGE_ADMINS.',
  })
  async deleteAdmin(
    @CurrentAdmin() adminId: string,
    @Args('id', { type: () => ID }) id: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.adminsService.deleteAdmin({
      callerId: adminId,
      id,
      language,
    });
  }

  @Mutation(() => Admin, {
    name: 'toggleAdminStatus',
    description: 'Activate or deactivate an admin. Requires MANAGE_ADMINS.',
  })
  async toggleAdminStatus(
    @CurrentAdmin() adminId: string,
    @Args('id', { type: () => ID }) id: string,
    @Args('isActive') isActive: boolean,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.adminsService.toggleAdminStatus({
      callerId: adminId,
      id,
      isActive,
      language,
    });
  }

  @Mutation(() => Admin, {
    name: 'assignPermissions',
    description: 'Assign permissions to an admin. Requires MANAGE_ADMINS.',
  })
  async assignPermissions(
    @CurrentAdmin() adminId: string,
    @Args('id', { type: () => ID }) id: string,
    @Args('permissions', { type: () => [AdminPermission] })
    permissions: AdminPermission[],
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.adminsService.assignPermissions({
      callerId: adminId,
      id,
      permissions,
      language,
    });
  }

  @Mutation(() => UsersBulkUpsertResult, {
    description:
      'Bulk create/update admins (rows with id update, without id create). ' +
      'A create needs email, password, name, adminType and role. Requires MANAGE_ADMINS.',
  })
  bulkUpsertAdmins(
    @CurrentAdmin() callerId: string,
    @Args('rows', { type: () => [AdminUpsertRowInput] })
    rows: AdminUpsertRowInput[],
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.adminsService.bulkUpsertAdmins({ callerId, rows, language });
  }
}
