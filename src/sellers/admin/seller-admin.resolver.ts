import { Resolver, Query, Mutation, Args, Int, ID } from '@nestjs/graphql';
import { CurrentAdmin } from '../../common/decorators';
import { UsersBulkUpsertResult } from '../../common/bulk';
import { Language, SellerType } from '../../graphql/enums';
import { SellerAdminService } from './seller-admin.service';
import { RawSellerConnection } from './raw-seller.entity';
import {
  BusinessProfileUpsertRowInput,
  PersonProfileUpsertRowInput,
  SellerPreferencesUpsertRowInput,
  SellerUpsertRowInput,
} from './seller-bulk.input';

/** The sellers workbook (export, edit, import). Admins with MANAGE_USERS. */
@Resolver()
export class SellerAdminResolver {
  constructor(private readonly sellerAdmin: SellerAdminService) {}

  @Query(() => RawSellerConnection, {
    name: 'rawSellers',
    description:
      'Sellers as stored, with profiles and preferences, for the spreadsheet round trip. MANAGE_USERS.',
  })
  rawSellers(
    @CurrentAdmin() adminId: string | undefined,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 100 }) pageSize: number,
    @Args('search', { nullable: true }) search?: string,
    @Args('sellerType', { type: () => SellerType, nullable: true })
    sellerType?: SellerType,
    @Args('ids', { type: () => [ID], nullable: true }) ids?: string[],
  ) {
    return this.sellerAdmin.rawSellers({
      adminId,
      language,
      page,
      pageSize,
      search,
      sellerType,
      ids,
    });
  }

  @Mutation(() => UsersBulkUpsertResult, {
    name: 'bulkUpsertSellers',
    description:
      'Sheet `sellers`: id updates (or restores under that id); no id matches by email, else creates. MANAGE_USERS.',
  })
  bulkUpsertSellers(
    @CurrentAdmin() adminId: string | undefined,
    @Args('rows', { type: () => [SellerUpsertRowInput] })
    rows: SellerUpsertRowInput[],
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.sellerAdmin.bulkUpsertSellers({ adminId, rows, language });
  }

  @Mutation(() => UsersBulkUpsertResult, {
    name: 'bulkUpsertPersonProfiles',
    description: 'Sheet `persons`, matched by sellerId. MANAGE_USERS.',
  })
  bulkUpsertPersonProfiles(
    @CurrentAdmin() adminId: string | undefined,
    @Args('rows', { type: () => [PersonProfileUpsertRowInput] })
    rows: PersonProfileUpsertRowInput[],
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.sellerAdmin.bulkUpsertPersonProfiles({
      adminId,
      rows,
      language,
    });
  }

  @Mutation(() => UsersBulkUpsertResult, {
    name: 'bulkUpsertBusinessProfiles',
    description: 'Sheet `businesses`, matched by sellerId. MANAGE_USERS.',
  })
  bulkUpsertBusinessProfiles(
    @CurrentAdmin() adminId: string | undefined,
    @Args('rows', { type: () => [BusinessProfileUpsertRowInput] })
    rows: BusinessProfileUpsertRowInput[],
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.sellerAdmin.bulkUpsertBusinessProfiles({
      adminId,
      rows,
      language,
    });
  }

  @Mutation(() => UsersBulkUpsertResult, {
    name: 'bulkUpsertSellerPreferences',
    description: 'Sheet `preferences`, matched by sellerId. MANAGE_USERS.',
  })
  bulkUpsertSellerPreferences(
    @CurrentAdmin() adminId: string | undefined,
    @Args('rows', { type: () => [SellerPreferencesUpsertRowInput] })
    rows: SellerPreferencesUpsertRowInput[],
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.sellerAdmin.bulkUpsertSellerPreferences({
      adminId,
      rows,
      language,
    });
  }
}
