import { ObjectType, Field } from '@nestjs/graphql';

/** One selectable business tag. Clients translate the id into a label. */
@ObjectType()
export class BusinessTag {
  @Field()
  id: string;
}
