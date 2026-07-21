import { ObjectType, Field, Int } from '@nestjs/graphql';

/**
 * Per-row failure inside a bulk upsert. `index` is the 0-based position of the
 * offending row in the submitted array so the admin panel can point at the
 * exact spreadsheet line. `id` is a string because this subgraph mixes numeric
 * ids (locations, labels, levels) with uuid ids (admins).
 *
 * Named `Users…` to stay unique in the federated supergraph (marketplace and
 * stores expose their own `BulkUpsertResult` / `StoreBulkUpsertResult`).
 */
@ObjectType('UsersBulkRowError')
export class UsersBulkRowError {
  @Field(() => Int)
  index: number;

  @Field(() => String, { nullable: true })
  id?: number | string | null;

  @Field(() => String)
  message: string;
}

/**
 * Outcome of a bulk upsert. Rows are processed independently: one bad row is
 * reported in `errors` without aborting the rest of the batch.
 */
@ObjectType('UsersBulkUpsertResult')
export class UsersBulkUpsertResult {
  @Field(() => Int)
  created: number;

  @Field(() => [String], {
    description: 'ids of the rows created by this batch, in submission order',
  })
  createdIds: (number | string)[];

  @Field(() => Int)
  updated: number;

  @Field(() => Int)
  failed: number;

  @Field(() => [UsersBulkRowError])
  errors: UsersBulkRowError[];
}
