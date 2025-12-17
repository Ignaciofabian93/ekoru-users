import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

interface RequestWithHeaders {
  headers: Record<string, string | string[] | undefined>;
}

interface JWTPayload {
  sellerId: string;
  iat?: number;
  exp?: number;
}

function decodeJWT(token: string): JWTPayload | null {
  try {
    // Split the token and get the payload (second part)
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Decode base64url
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');

    return JSON.parse(jsonPayload) as JWTPayload;
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

export const CurrentSeller = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext<{ req: RequestWithHeaders }>().req;

    // Try to get from x-seller-id header first (if set by gateway)
    const sellerIdFromHeader = request.headers['x-seller-id'];
    if (sellerIdFromHeader) {
      return sellerIdFromHeader;
    }

    // Otherwise, decode from JWT token
    const authHeader = request.headers['authorization'];
    if (authHeader && typeof authHeader === 'string') {
      const token = authHeader.replace('Bearer ', '');
      const payload = decodeJWT(token);

      if (payload?.sellerId) {
        console.log('Extracted sellerId from JWT:', payload.sellerId);
        return payload.sellerId;
      }
    }

    console.log('No sellerId found in headers or JWT token');
    return undefined;
  },
);
