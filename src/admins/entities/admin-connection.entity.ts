import { ObjectType, Field } from '@nestjs/graphql';
import { Admin } from './admin.entity';
import { PageInfo } from './page-info.entity';

@ObjectType()
export class AdminConnection {
  @Field(() => [Admin])
  nodes: Admin[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;
}
