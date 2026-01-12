import type { Database } from '@/integrations/supabase/database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];

// Generic membership type
export type MembershipInfo = {
  id: string;
  user_id: string;
  role: string;
  profile: Profile;
};

// Generic item with members
export type ItemWithMembers<T> = T & {
  members: MembershipInfo[];
  memberCount: number;
  userMembership?: MembershipInfo;
};

// Metadata item for cards
export type MetadataItem = {
  icon: React.ReactNode;
  text: string;
  onClick?: () => void;
  interactive?: boolean;
  render?: (item: MetadataItem) => React.ReactNode;
};

// Card action button
export type CardAction = {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
};

// Detail section for detail modals
export type DetailSection = {
  title: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
  fullWidth?: boolean;
};