import { ArgumentsHost, Catch, Logger } from '@nestjs/common';
import { GqlArgumentsHost, GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError, type GraphQLResolveInfo } from 'graphql';
import type { RequestIdentity } from '../identity';

/**
 * One clear line for each error a resolver raises on purpose.
 *
 * Nest logs every thrown error as ERROR with a stack trace, so "Debe iniciar
 * sesión" for a request with no session looked like a crash and still did not
 * say which field or who was asking. Errors we raise ourselves (GraphQLError
 * and its subclasses) are logged here with the field, the code and the
 * caller; an InternalServerError's cause is logged where it is caught. Any
 * other exception is not caught here and keeps Nest's full log with stack.
 *
 * The app's message is unchanged: the gateway decides what the app sees.
 */
@Catch(GraphQLError)
export class GraphQLErrorLogFilter implements GqlExceptionFilter {
  private readonly logger = new Logger('GraphQLErrors');

  catch(exception: GraphQLError, host: ArgumentsHost) {
    const gql = GqlArgumentsHost.create(host);
    const info = gql.getInfo<GraphQLResolveInfo | undefined>();
    const field = info
      ? `${info.parentType.name}.${info.fieldName}`
      : 'unknown field';
    const code =
      typeof exception.extensions?.code === 'string'
        ? exception.extensions.code
        : 'UNKNOWN';
    const line = `${code} ${field}: "${exception.message}" | ${caller(
      gql.getContext<RequestIdentity & { internalSecret?: string }>(),
    )}`;

    if (code === 'INTERNAL_SERVER_ERROR') this.logger.error(line);
    else this.logger.warn(line);

    // Returned, not thrown: GraphQL turns it into the response error as before.
    return exception;
  }
}

function caller(ctx: RequestIdentity & { internalSecret?: string }): string {
  if (ctx?.sellerId) return `seller ${ctx.sellerId}`;
  if (ctx?.adminId) return `admin ${ctx.adminId}`;
  if (ctx?.tokenRejected) return `access token refused: ${ctx.tokenRejected}`;
  if (ctx?.internalSecret) return 'internal call';
  return 'no access token received (the gateway log says why)';
}
