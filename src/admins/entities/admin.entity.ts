import { ObjectType, Field, ID, Directive } from '@nestjs/graphql';
import { DateTimeScalar } from '../../graphql/scalars';
import {
  AdminType,
  AdminRole,
  AdminPermission,
} from '../../graphql/enums';
import { Country } from '../../location/entities/country.entity';
import { Region } from '../../location/entities/region.entity';
import { City } from '../../location/entities/city.entity';
import { County } from '../../location/entities/county.entity';

@ObjectType()
@Directive('@key(fields: "id")')
export class Admin {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  lastName?: string;

  @Field(() => AdminType)
  adminType: AdminType;

  @Field(() => AdminRole)
  role: AdminRole;

  @Field(() => [AdminPermission])
  permissions: AdminPermission[];

  @Field({ nullable: true })
  sellerId?: string;

  @Field()
  isActive: boolean;

  @Field()
  isEmailVerified: boolean;

  @Field()
  accountLocked: boolean;

  @Field()
  loginAttempts: number;

  @Field(() => DateTimeScalar, { nullable: true })
  lastLoginAt?: Date;

  @Field({ nullable: true })
  lastLoginIp?: string;

  @Field(() => DateTimeScalar)
  createdAt: Date;

  @Field(() => DateTimeScalar)
  updatedAt: Date;

  @Field({ nullable: true })
  cityId?: number;

  @Field({ nullable: true })
  countryId?: number;

  @Field({ nullable: true })
  countyId?: number;

  @Field({ nullable: true })
  regionId?: number;

  @Field(() => Region, { nullable: true })
  region?: Region;

  @Field(() => City, { nullable: true })
  city?: City;

  @Field(() => County, { nullable: true })
  county?: County;

  @Field(() => Country, { nullable: true })
  country?: Country;
}
