import { Args, Context, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { NotificationsService } from './notifications.service';
import { DevicesService } from './devices.service';
import { Notification, NotificationConnection, SellerDevice } from './entities';
import { EmitNotificationInput, RegisterDeviceInput } from './dto';
import { CurrentSeller } from '../common/decorators';
import { UnAuthorizedError } from '../common/exceptions';

@Resolver(() => Notification)
export class NotificationsResolver {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly devices: DevicesService,
  ) {}

  // ─── Internal: the emit seam ──────────────────────────────────────────────

  /**
   * Records a notification and schedules delivery across every channel the
   * seller has enabled. Service-to-service only, guarded by
   * INTERNAL_SERVICE_SECRET like `awardPoints` and
   * `activateMembershipSubscription`.
   *
   * This is the *only* entry point domain events use. Callers say what
   * happened; which channels fire, and whether any fire at all, is decided
   * here. Returns the new notification id, or null when the seller could not
   * be notified at all (unknown or deactivated account).
   */
  @Mutation(() => Int, { name: 'emitNotification', nullable: true })
  async emitNotification(
    @Args('input') input: EmitNotificationInput,
    @Context() ctx: { internalSecret?: string },
  ): Promise<number | null> {
    assertInternal(ctx.internalSecret);
    return this.notifications.emit(input);
  }

  // ─── Feed ─────────────────────────────────────────────────────────────────

  @Query(() => NotificationConnection, { name: 'myNotifications' })
  async myNotifications(
    @CurrentSeller() sellerId: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 20 }) pageSize: number,
    @Args('onlyUnread', { defaultValue: false }) onlyUnread: boolean,
  ) {
    requireSeller(sellerId);
    return this.notifications.myNotifications({
      sellerId,
      page,
      pageSize,
      onlyUnread,
    });
  }

  @Query(() => Int, {
    name: 'unreadNotificationCount',
    description: 'Drives the bell badge',
  })
  async unreadNotificationCount(
    @CurrentSeller() sellerId: string,
  ): Promise<number> {
    requireSeller(sellerId);
    return this.notifications.unreadCount(sellerId);
  }

  @Mutation(() => Boolean, { name: 'markNotificationRead' })
  async markNotificationRead(
    @CurrentSeller() sellerId: string,
    @Args('id', { type: () => Int }) id: number,
  ): Promise<boolean> {
    requireSeller(sellerId);
    return this.notifications.markRead(sellerId, id);
  }

  @Mutation(() => Int, {
    name: 'markAllNotificationsRead',
    description: 'Returns how many were marked',
  })
  async markAllNotificationsRead(
    @CurrentSeller() sellerId: string,
  ): Promise<number> {
    requireSeller(sellerId);
    return this.notifications.markAllRead(sellerId);
  }

  // ─── Devices ──────────────────────────────────────────────────────────────

  /** Called by the mobile app once it has an Expo push token. */
  @Mutation(() => SellerDevice, { name: 'registerDevice' })
  async registerDevice(
    @CurrentSeller() sellerId: string,
    @Args('input') input: RegisterDeviceInput,
  ) {
    requireSeller(sellerId);
    return this.devices.register({ sellerId, ...input });
  }

  /** Called on sign-out so the next user of this phone isn't notified. */
  @Mutation(() => Boolean, { name: 'unregisterDevice' })
  async unregisterDevice(
    @CurrentSeller() sellerId: string,
    @Args('pushToken') pushToken: string,
  ): Promise<boolean> {
    requireSeller(sellerId);
    return this.devices.unregister(sellerId, pushToken);
  }

  @Query(() => [SellerDevice], { name: 'myDevices' })
  async myDevices(@CurrentSeller() sellerId: string) {
    requireSeller(sellerId);
    return this.devices.myDevices(sellerId);
  }
}

function requireSeller(
  sellerId: string | undefined,
): asserts sellerId is string {
  if (!sellerId) throw new UnAuthorizedError('Debe iniciar sesión');
}

/**
 * Accepts the secret only from the `x-internal-secret` header of a direct
 * service-to-service call. It was previously also accepted as a GraphQL
 * argument; since the gateway attached the header to every federated request,
 * that made this mutation reachable by anonymous callers.
 */
function assertInternal(provided: string | undefined): void {
  const expected = process.env.INTERNAL_SERVICE_SECRET;
  if (!expected) {
    throw new Error('INTERNAL_SERVICE_SECRET no configurado en users');
  }
  if (!provided || provided !== expected) throw new Error('Unauthorized');
}
