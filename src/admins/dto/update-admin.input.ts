import { InputType, Field, ID } from '@nestjs/graphql';
import { IsString, IsEnum, IsOptional, IsArray } from 'class-validator';
import { AdminType, AdminRole, AdminPermission } from '../../graphql/enums';

@InputType()
export class UpdateAdminInput {
  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  name?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  lastName?: string;

  @Field(() => AdminType, { nullable: true })
  @IsEnum(AdminType)
  @IsOptional()
  adminType?: AdminType;

  @Field(() => AdminRole, { nullable: true })
  @IsEnum(AdminRole)
  @IsOptional()
  role?: AdminRole;

  @Field(() => [AdminPermission], { nullable: true })
  @IsArray()
  @IsEnum(AdminPermission, { each: true })
  @IsOptional()
  permissions?: AdminPermission[];

  @Field(() => ID, { nullable: true })
  @IsString()
  @IsOptional()
  sellerId?: string;
}
