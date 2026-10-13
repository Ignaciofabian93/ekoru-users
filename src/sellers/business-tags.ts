/**
 * Eco descriptors a business may show on its profile (USR-11). Only ids live
 * here: the clients own the labels in their translations
 * (`editProfile.tags.options.<id>` in the web), so a new tag needs a label
 * there as well.
 */
export const BUSINESS_TAG_IDS = [
  'womanLed',
  'zeroWaste',
  'recycledMaterials',
  'plasticFree',
  'locallyMade',
  'handmade',
  'vegan',
  'crueltyFree',
  'organic',
  'fairTrade',
  'carbonNeutral',
  'upcycled',
  'refillable',
  'biodegradable',
] as const;

/** A business picks at most this many tags. */
export const MAX_BUSINESS_TAGS = 3;
