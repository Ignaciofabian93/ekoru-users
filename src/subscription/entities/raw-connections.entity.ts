import { ObjectType, Field } from '@nestjs/graphql';
import { PageInfo } from '../../admins/entities/page-info.entity';
import { PersonMembershipTranslation } from './person-membership-translation.entity';
import { PersonMembershipPricing } from './person-membership-pricing.entity';
import { BusinessMembershipTranslation } from './business-membership-translation.entity';
import { BusinessMembershipPricing } from './business-membership-pricing.entity';

/**
 * Raw, admin-only paginated views of the membership translation/pricing tables.
 * The seller-facing reads expose `translation`/`pricing` as singular fields
 * resolved by language/countryId; these return every row as stored so the admin
 * panel can edit translations and per-country pricing directly. See
 * `SubscriptionService.getRaw*`.
 */

@ObjectType()
export class RawPersonMembershipTranslationConnection {
  @Field(() => [PersonMembershipTranslation])
  nodes: PersonMembershipTranslation[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;
}

@ObjectType()
export class RawBusinessMembershipTranslationConnection {
  @Field(() => [BusinessMembershipTranslation])
  nodes: BusinessMembershipTranslation[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;
}

@ObjectType()
export class RawPersonMembershipPricingConnection {
  @Field(() => [PersonMembershipPricing])
  nodes: PersonMembershipPricing[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;
}

@ObjectType()
export class RawBusinessMembershipPricingConnection {
  @Field(() => [BusinessMembershipPricing])
  nodes: BusinessMembershipPricing[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;
}
