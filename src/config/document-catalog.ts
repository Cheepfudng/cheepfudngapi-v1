import { OrganizationType } from '../types/enums';

export type OrgDocumentCategory = 'supply' | 'campaign';

export interface DocumentCatalogEntry {
  type: string;
  label: string;
  required: boolean;
}

const SUPPLY_SIDE_TYPES: OrganizationType[] = [OrganizationType.FARMER, OrganizationType.VENDOR];

export const getOrgDocumentCategory = (organizationType: OrganizationType): OrgDocumentCategory =>
  SUPPLY_SIDE_TYPES.includes(organizationType) ? 'supply' : 'campaign';

// Placeholder catalog — swap entries once the co-founder sends the finalized list.
// type must stay a stable machine-readable slug; label is what the frontend displays.
export const DOCUMENT_CATALOG: Record<OrgDocumentCategory, DocumentCatalogEntry[]> = {
  supply: [
    {
      type: 'government_id',
      label: "Valid Government-Issued ID (NIN, Voter's Card, Driver's License, or Passport)",
      required: true,
    },
    {
      type: 'proof_of_address',
      label: 'Proof of Address (Utility Bill or Tenancy Agreement)',
      required: true,
    },
    {
      type: 'business_registration',
      label: 'CAC Registration Certificate or Farmer Cooperative Membership ID',
      required: true,
    },
    { type: 'bvn_slip', label: 'Bank Verification Number (BVN) Slip', required: false },
    {
      type: 'produce_certification',
      label: 'Produce/Farm Certification (e.g. NAFDAC, SON, or agric extension)',
      required: false,
    },
  ],
  campaign: [
    {
      type: 'incorporation_certificate',
      label: 'CAC Certificate of Incorporation / Registration',
      required: true,
    },
    {
      type: 'representative_id',
      label: 'Valid Government-Issued ID of Authorized Representative',
      required: true,
    },
    { type: 'proof_of_address', label: 'Proof of Address / Operating Location', required: true },
    {
      type: 'tin_certificate',
      label: 'Tax Identification Number (TIN) Certificate',
      required: false,
    },
    {
      type: 'authorization_letter',
      label: 'Board/Trustee List or Letter of Authorization',
      required: false,
    },
  ],
};

export const getAllDocumentTypes = (category: OrgDocumentCategory): string[] =>
  DOCUMENT_CATALOG[category].map((d) => d.type);

export const getMandatoryDocumentTypes = (category: OrgDocumentCategory): string[] =>
  DOCUMENT_CATALOG[category].filter((d) => d.required).map((d) => d.type);
