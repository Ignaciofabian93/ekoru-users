import { Injectable } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/** Who is reading a Seller: the request context's identity. */
export interface SellerViewer {
  sellerId?: string;
  adminId?: string;
  adminType?: string;
  /** For BUSINESS admins: the seller they act for. */
  adminSellerId?: string;
  internalSecret?: string;
}

export interface VisibilityFlags {
  showMyAddress: boolean;
  showMySocials: boolean;
}

/** The Seller row a field resolver gets as its parent. */
export interface SellerSubject {
  id: string;
  sellerType?: string | null;
  /** Present when the query included it; loaded on demand otherwise. */
  sellerPreferences?: VisibilityFlags | null;
}

/** STARTUP and COMPANY accounts are businesses; a missing type stays private. */
const isBusiness = (seller: SellerSubject) =>
  seller.sellerType === 'STARTUP' || seller.sellerType === 'COMPANY';

/** Per-request memo, keyed by the GraphQL context object. */
interface RequestMemo {
  linked: Map<string, Promise<boolean>>;
  flags: Map<string, Promise<VisibilityFlags | null>>;
}

/**
 * Who may read a seller's private fields (USR-10). Every type that embeds a
 * Seller (products, search results, orders, deals, bookings) resolves it here,
 * so the rules hold whichever query reaches the seller:
 *
 * - `preferences`: the seller, platform admins and sibling services.
 * - `address`: those, plus everyone when the seller is a business (it trades
 *   from a place) or has turned on `showMyAddress`.
 * - `socialMediaLinks`: those, plus everyone with `showMySocials` on.
 * - `email` and `phone`: those, plus everyone for a business, which wants to
 *   be reached, plus a person's counterparties: the other side of an accepted
 *   deal, a paid order or a booking. A proposed deal is not enough, so nobody
 *   can collect phone numbers by proposing deals.
 *
 * Ley 21.719 treats a private person's contact details as personal data; the
 * web already hid most of this on screen, but the API handed it to anyone.
 */
@Injectable()
export class SellerPrivacyService {
  private readonly memos = new WeakMap<object, RequestMemo>();

  constructor(private readonly prisma: PrismaService) {}

  async canSeeContact(viewer: SellerViewer, seller: SellerSubject) {
    if (this.isOwnerOrStaff(viewer, seller)) return true;
    if (isBusiness(seller)) return true;
    return this.isCounterparty(viewer, seller.id);
  }

  async canSeeAddress(viewer: SellerViewer, seller: SellerSubject) {
    if (this.isOwnerOrStaff(viewer, seller)) return true;
    if (isBusiness(seller)) return true;
    return (await this.flagsOf(viewer, seller))?.showMyAddress === true;
  }

  async canSeeSocials(viewer: SellerViewer, seller: SellerSubject) {
    if (this.isOwnerOrStaff(viewer, seller)) return true;
    return (await this.flagsOf(viewer, seller))?.showMySocials === true;
  }

  canSeePreferences(viewer: SellerViewer, seller: SellerSubject) {
    return this.isOwnerOrStaff(viewer, seller);
  }

  private isOwnerOrStaff(viewer: SellerViewer, seller: SellerSubject) {
    if (viewer.adminId && viewer.adminType === 'PLATFORM') return true;
    if (this.isInternal(viewer.internalSecret)) return true;
    return !!seller.id && this.actingSellerId(viewer) === seller.id;
  }

  /** The seller the viewer acts as: themselves, or a business admin's business. */
  private actingSellerId(viewer: SellerViewer) {
    if (viewer.sellerId) return viewer.sellerId;
    return viewer.adminId && viewer.adminType === 'BUSINESS'
      ? viewer.adminSellerId
      : undefined;
  }

  private isInternal(supplied?: string) {
    const expected = process.env.INTERNAL_SERVICE_SECRET;
    if (!supplied || !expected) return false;
    const a = Buffer.from(supplied);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private memo(viewer: SellerViewer): RequestMemo {
    let memo = this.memos.get(viewer);
    if (!memo) {
      memo = { linked: new Map(), flags: new Map() };
      this.memos.set(viewer, memo);
    }
    return memo;
  }

  private flagsOf(viewer: SellerViewer, seller: SellerSubject) {
    if (seller.sellerPreferences !== undefined) {
      return Promise.resolve(seller.sellerPreferences);
    }
    const { flags } = this.memo(viewer);
    let found = flags.get(seller.id);
    if (!found) {
      found = this.prisma.sellerPreferences.findUnique({
        where: { sellerId: seller.id },
        select: { showMyAddress: true, showMySocials: true },
      });
      flags.set(seller.id, found);
    }
    return found;
  }

  private isCounterparty(viewer: SellerViewer, targetId: string) {
    const me = this.actingSellerId(viewer);
    if (!me || !targetId) return Promise.resolve(false);
    const { linked } = this.memo(viewer);
    let found = linked.get(targetId);
    if (!found) {
      found = this.prisma.$queryRaw<{ linked: boolean }[]>`
        SELECT EXISTS (
          SELECT 1 FROM "P2PDeal"
           WHERE status IN ('ACCEPTED', 'COMPLETED', 'DISPUTED')
             AND (("buyerId" = ${me} AND "sellerId" = ${targetId})
               OR ("buyerId" = ${targetId} AND "sellerId" = ${me}))
          UNION ALL
          SELECT 1 FROM "Order"
           WHERE status IN ('PAID', 'REFUNDED')
             AND (("buyerId" = ${me} AND "sellerId" = ${targetId})
               OR ("buyerId" = ${targetId} AND "sellerId" = ${me}))
          UNION ALL
          SELECT 1 FROM "ServiceBooking"
           WHERE ("clientId" = ${me} AND "providerId" = ${targetId})
              OR ("clientId" = ${targetId} AND "providerId" = ${me})
        ) AS "linked"
      `.then((rows) => rows[0]?.linked === true);
      linked.set(targetId, found);
    }
    return found;
  }
}
