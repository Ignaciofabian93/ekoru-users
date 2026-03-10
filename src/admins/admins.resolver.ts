import { Resolver, Query, Mutation, Args, Int, ID, Context } from '@nestjs/graphql';
import { AdminsService } from './admins.service';
import { Admin, AdminConnection } from './entities';
import { RegisterAdminInput, UpdateAdminInput } from './dto';
import { AdminType, AdminRole, AdminPermission } from '../graphql/enums';

@Resolver(() => Admin)
export class AdminsResolver {
  constructor(private readonly adminsService: AdminsService) {}

  // ─── Queries ──────────────────────────────────────────────────────────────────

  @Query(() => AdminConnection, { name: 'getAdmins' })
  async getAdmins(
    @Args('adminType', { type: () => AdminType, nullable: true })
    adminType?: AdminType,
    @Args('role', { type: () => AdminRole, nullable: true })
    role?: AdminRole,
    @Args('isActive', { nullable: true }) isActive?: boolean,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number = 1,
    @Args('pageSize', { type: () => Int, defaultValue: 10 })
    pageSize: number = 10,
  ) {
    return this.adminsService.getAdmins(adminType, role, isActive, page, pageSize);
  }

  @Query(() => Admin, { name: 'getAdmin', nullable: true })
  async getAdmin(@Args('id', { type: () => ID }) id: string) {
    return this.adminsService.getAdmin(id);
  }

  @Query(() => Admin, { name: 'getMyData', nullable: true })
  async getMyData(@Context() ctx: { adminId?: string }) {
    if (!ctx.adminId) return null;
    return this.adminsService.getMyData(ctx.adminId);
  }

  // ─── Mutations ────────────────────────────────────────────────────────────────

  @Mutation(() => Admin, { name: 'createAdmin' })
  async createAdmin(@Args('input') input: RegisterAdminInput) {
    return this.adminsService.createAdmin(input);
  }

  @Mutation(() => Admin, { name: 'updateAdmin' })
  async updateAdmin(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateAdminInput,
  ) {
    return this.adminsService.updateAdmin(id, input);
  }

  @Mutation(() => Admin, { name: 'deleteAdmin' })
  async deleteAdmin(@Args('id', { type: () => ID }) id: string) {
    return this.adminsService.deleteAdmin(id);
  }

  @Mutation(() => Admin, { name: 'toggleAdminStatus' })
  async toggleAdminStatus(
    @Args('id', { type: () => ID }) id: string,
    @Args('isActive') isActive: boolean,
  ) {
    return this.adminsService.toggleAdminStatus(id, isActive);
  }

  @Mutation(() => Admin, { name: 'assignPermissions' })
  async assignPermissions(
    @Args('id', { type: () => ID }) id: string,
    @Args('permissions', { type: () => [AdminPermission] })
    permissions: AdminPermission[],
  ) {
    return this.adminsService.assignPermissions(id, permissions);
  }
}
