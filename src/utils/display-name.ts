/**
 * The name a seller should be addressed by in outbound copy: their chosen
 * display name, else their first name, else the business name.
 *
 * Shared by the notification processor and the password-reset email so a person
 * is greeted the same way whatever triggered the message.
 */
export function sellerDisplayName(seller: {
  personProfile?: { displayName: string | null; firstName: string } | null;
  businessProfile?: { businessName: string } | null;
}): string {
  return (
    seller.personProfile?.displayName ||
    seller.personProfile?.firstName ||
    seller.businessProfile?.businessName ||
    'usuario'
  );
}
