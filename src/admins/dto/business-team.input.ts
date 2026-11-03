import { InputType, Field } from '@nestjs/graphql';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { AdminRole, AdminPermission } from '../../graphql/enums';

/** A new member of a business's panel team (USR-15). */
@InputType()
export class InviteBusinessAdminInput {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  name: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  lastName?: string;

  @Field(() => AdminRole)
  @IsEnum(AdminRole)
  role: AdminRole;

  @Field(() => [AdminPermission], { defaultValue: [] })
  @IsArray()
  @IsEnum(AdminPermission, { each: true })
  permissions: AdminPermission[];
}

/** Changes to a team member. Omitted fields stay as they are. */
@InputType()
export class UpdateBusinessAdminInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  lastName?: string;

  @Field(() => AdminRole, { nullable: true })
  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;

  @Field(() => [AdminPermission], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsEnum(AdminPermission, { each: true })
  permissions?: AdminPermission[];
}
