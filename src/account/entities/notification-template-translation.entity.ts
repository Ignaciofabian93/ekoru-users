import { ObjectType, Field, Int } from '@nestjs/graphql';
import { DateTimeScalar } from '../../graphql/scalars';
import { Language } from '../../graphql/enums';

@ObjectType()
export class NotificationTemplateTranslation {
  @Field(() => Int)
  id: number;

  @Field(() => Int)
  notificationTemplateId: number;

  @Field(() => Language)
  language: Language;

  @Field()
  title: string;

  @Field()
  message: string;

  @Field(() => DateTimeScalar, { nullable: true })
  createdAt?: Date;

  @Field(() => DateTimeScalar, { nullable: true })
  updatedAt?: Date;
}
