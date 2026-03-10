import { InputType, Field } from '@nestjs/graphql';
import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  IsArray,
} from 'class-validator';
import { AdminType, AdminRole, AdminPermission } from '../../graphql/enums';

@InputType()
export class RegisterAdminInput {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  @IsString()
  name: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  lastName?: string;

  @Field()
  @IsString()
  @MinLength(6)
  password: string;

  @Field(() => AdminType)
  @IsEnum(AdminType)
  adminType: AdminType;

  @Field(() => AdminRole)
  @IsEnum(AdminRole)
  role: AdminRole;

  @Field(() => [AdminPermission], { defaultValue: [] })
  @IsArray()
  @IsEnum(AdminPermission, { each: true })
  @IsOptional()
  permissions: AdminPermission[];

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  sellerId?: string;
}
