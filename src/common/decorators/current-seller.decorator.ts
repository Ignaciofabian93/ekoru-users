import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

/**
 * The authenticated seller, or undefined for an anonymous caller.
 *
 * Read off the **GraphQL context**, where `resolveIdentity` (`common/identity.ts`)
 * puts it after cryptographically verifying the access token.
 *
 * This previously did its own resolution, and both paths were unsafe:
 *
 *   1. It returned `x-seller-id` verbatim when present — an unsigned header,
 *      so anything that could reach this subgraph could name any seller.
 *   2. Failing that, it base64-decoded the JWT payload and trusted the
 *      `sellerId` inside it **without ever checking the signature**. Any
 *      self-made token — no key required — was accepted as that user.
 *
 * Every resolver in this subgraph uses these decorators, including the account
 * and admin surfaces, so both paths were a full authentication bypass. Keep
 * identity resolution in one verified place; do not reintroduce a local decode.
 */
export const CurrentSeller = createParamDecorator(
  (data: unknown, context: ExecutionContext): string | undefined => {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext<{ sellerId?: string }>().sellerId;
  },
);

/** Same, for the authenticated admin (verified `adminId` claim). */
export const CurrentAdmin = createParamDecorator(
  (data: unknown, context: ExecutionContext): string | undefined => {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext<{ adminId?: string }>().adminId;
  },
);
