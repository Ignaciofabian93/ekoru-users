import { GraphQLError } from 'graphql';

export class NotFoundError extends GraphQLError {
  constructor(message: string) {
    super(message, {
      extensions: {
        code: 'NOT_FOUND',
      },
    });
  }
}

export class UnAuthorizedError extends GraphQLError {
  constructor(
    message: string,
    code: 'UNAUTHORIZED' | 'FORBIDDEN' = 'UNAUTHORIZED',
  ) {
    super(message, {
      extensions: {
        code,
      },
    });
  }
}

/**
 * Signed in, but not allowed. The admin panel keeps the session on FORBIDDEN
 * and signs out on UNAUTHORIZED. It extends UnAuthorizedError so every
 * `catch` that re-throws UnAuthorizedError lets it through unchanged.
 */
export class ForbiddenError extends UnAuthorizedError {
  constructor(message: string) {
    super(message, 'FORBIDDEN');
  }
}

export class BadRequestError extends GraphQLError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, {
      extensions: {
        code: 'BAD_REQUEST',
        ...(details ? { details } : {}),
      },
    });
  }
}

export class InternalServerError extends GraphQLError {
  constructor(message: string) {
    super(message, {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
      },
    });
  }
}

export class UserError extends GraphQLError {
  constructor(message: string) {
    super(message, {
      extensions: {
        code: 'USER_ERROR',
      },
    });
  }
}

export class ConflictError extends GraphQLError {
  constructor(message: string) {
    super(message, {
      extensions: {
        code: 'CONFLICT',
      },
    });
  }
}
