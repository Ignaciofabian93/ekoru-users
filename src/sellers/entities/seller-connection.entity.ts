import { ObjectType, Field } from '@nestjs/graphql';
import { Seller } from './seller.entity';
import { PageInfo } from '../../admins/entities/page-info.entity';

@ObjectType()
export class SellerConnection {
  @Field(() => [Seller])
  nodes: Seller[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;
}
