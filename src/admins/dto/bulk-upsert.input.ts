import { Field, InputType, ID, Int } from '@nestjs/graphql';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { AdminType, AdminRole, AdminPermission } from '../../graphql/enums';

/**
 * Bulk upsert input for admins. Rows with an `id` (uuid) update; rows without
 * an `id` create. Omitted fields are left untouched on update.
 *
 * `password` is only used when creating (it is hashed). It is never present in
 * an export, so an update never changes a password unless one is supplied. A
 * create row without a password fails just that row.
 */
@InputType()
export class AdminUpsertRowInput {
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  id?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Required when creating.',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Plain password, hashed server-side. Create-only.',
  })
  @IsOptional()
  @IsString()
  password?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Required when creating.',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  lastName?: string | null;

  @Field(() => AdminType, { nullable: true })
  @IsOptional()
  @IsEnum(AdminType)
  adminType?: AdminType;

  @Field(() => AdminRole, { nullable: true })
  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;

  @Field(() => [AdminPermission], { nullable: true })
  @IsOptional()
  @IsArray()
  permissions?: AdminPermission[];

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Field(() => ID, {
    nullable: true,
    description: 'Owning seller for BUSINESS admins.',
  })
  @IsOptional()
  @IsString()
  sellerId?: string | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  countryId?: number | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  regionId?: number | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  cityId?: number | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  countyId?: number | null;
}
