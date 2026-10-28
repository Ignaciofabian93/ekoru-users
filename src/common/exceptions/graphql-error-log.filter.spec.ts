import { ArgumentsHost, Logger } from '@nestjs/common';
import { GraphQLErrorLogFilter } from './graphql-error-log.filter';
import { InternalServerError, UnAuthorizedError } from './graphql.exceptions';

function host(context: Record<string, unknown>): ArgumentsHost {
  const info = {
    parentType: { name: 'Query' },
    fieldName: 'unreadNotificationCount',
  };
  return {
    getArgs: () => [{}, {}, context, info],
    getType: () => 'graphql',
  } as unknown as ArgumentsHost;
}

describe('GraphQLErrorLogFilter', () => {
  const filter = new GraphQLErrorLogFilter();
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('logs a refused session on one line and hands the error back', () => {
    const refused = new UnAuthorizedError('Debe iniciar sesión');

    expect(filter.catch(refused, host({}))).toBe(refused);
    expect(warn).toHaveBeenCalledWith(
      'UNAUTHORIZED Query.unreadNotificationCount: "Debe iniciar sesión" | no access token received (the gateway log says why)',
    );
  });

  it('says why a token that arrived was refused', () => {
    filter.catch(
      new UnAuthorizedError('Debe iniciar sesión'),
      host({ tokenRejected: 'expired at 2026-10-28T22:56:48.000Z' }),
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(
        '| access token refused: expired at 2026-10-28T22:56:48.000Z',
      ),
    );
  });

  it('logs internal errors as errors, with the caller', () => {
    filter.catch(
      new InternalServerError('Error al obtener el perfil'),
      host({ sellerId: 'seller-1' }),
    );
    expect(error).toHaveBeenCalledWith(
      'INTERNAL_SERVER_ERROR Query.unreadNotificationCount: "Error al obtener el perfil" | seller seller-1',
    );
  });
});
