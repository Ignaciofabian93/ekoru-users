import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateBusinessProfileInput } from './dto/update-business-profile.input';
import { SellersResolver } from './sellers.resolver';
import { SellersService } from './sellers.service';
import { SellerPrivacyService } from './seller-privacy.service';
import { BUSINESS_TAG_IDS } from './business-tags';

describe('business tags (USR-11)', () => {
  const errorsFor = async (tags: unknown) => {
    const input = plainToInstance(UpdateBusinessProfileInput, { tags });
    const errors = await validate(input);
    return errors.filter((e) => e.property === 'tags');
  };

  it('serves the catalog as ids', () => {
    const resolver = new SellersResolver(
      {} as SellersService,
      {} as SellerPrivacyService,
    );

    expect(resolver.businessTags()).toEqual(
      BUSINESS_TAG_IDS.map((id) => ({ id })),
    );
  });

  it('accepts up to three known tags', async () => {
    expect(await errorsFor(['vegan', 'organic', 'handmade'])).toHaveLength(0);
    expect(await errorsFor([])).toHaveLength(0);
  });

  it('refuses a fourth tag, an unknown tag and duplicates', async () => {
    expect(
      await errorsFor(['vegan', 'organic', 'handmade', 'upcycled']),
    ).toHaveLength(1);
    expect(await errorsFor(['vegan', 'cheapest'])).toHaveLength(1);
    expect(await errorsFor(['vegan', 'vegan'])).toHaveLength(1);
  });
});
