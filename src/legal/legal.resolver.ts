import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentAdmin, CurrentSeller } from '../common/decorators';
import { Language } from '../graphql/enums';
import { SaveTermsDraftInput } from './dto/save-terms-draft.input';
import {
  TermsDocument,
  TermsStatus,
  TermsVersionAdmin,
} from './entities/terms.entity';
import { LegalService } from './legal.service';

@Resolver()
export class LegalResolver {
  constructor(private readonly legal: LegalService) {}

  @Query(() => TermsDocument, {
    name: 'currentTerms',
    nullable: true,
    description:
      'The Terms and Policies in force, in the language asked for (Spanish when it has no text in it). Public.',
  })
  currentTerms(
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.legal.currentTerms(language);
  }

  @Query(() => TermsStatus, {
    name: 'myTermsStatus',
    description:
      'Whether the signed-in account must accept the terms in force before going on.',
  })
  myTermsStatus(
    @CurrentSeller() sellerId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.legal.termsStatus({ sellerId, language });
  }

  @Mutation(() => TermsStatus, {
    name: 'acceptTerms',
    description:
      'The signed-in account accepts the terms in force. `version` must be the one shown.',
  })
  acceptTerms(
    @CurrentSeller() sellerId: string,
    @Args('version', { type: () => Int }) version: number,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.legal.acceptTerms({ sellerId, version, language });
  }

  @Query(() => [TermsVersionAdmin], {
    name: 'termsVersions',
    description: 'Every terms version, newest first. Requires MANAGE_SETTINGS.',
  })
  termsVersions(
    @CurrentAdmin() adminId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.legal.termsVersions({ adminId, language });
  }

  @Mutation(() => TermsVersionAdmin, {
    name: 'saveTermsDraft',
    description:
      'Create the next version as a draft, or edit the open draft. Requires MANAGE_SETTINGS.',
  })
  saveTermsDraft(
    @CurrentAdmin() adminId: string,
    @Args('input') input: SaveTermsDraftInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.legal.saveTermsDraft({ adminId, input, language });
  }

  @Mutation(() => TermsVersionAdmin, {
    name: 'publishTermsVersion',
    description:
      'Put a draft in force; everyone signed in is asked to accept it. Requires MANAGE_SETTINGS.',
  })
  publishTermsVersion(
    @CurrentAdmin() adminId: string,
    @Args('id', { type: () => Int }) id: number,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.legal.publishTermsVersion({ adminId, id, language });
  }

  @Mutation(() => Boolean, {
    name: 'deleteTermsDraft',
    description:
      'Delete a draft that was never published. Requires MANAGE_SETTINGS.',
  })
  deleteTermsDraft(
    @CurrentAdmin() adminId: string,
    @Args('id', { type: () => Int }) id: number,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.legal.deleteTermsDraft({ adminId, id, language });
  }
}
