import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { GraduationCap } from 'lucide-react';
import type { MembershipInfo } from '@/types/modal.types';

interface MembersListModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    members: MembershipInfo[];
    showRole?: boolean;
    roleIcon?: (role: string) => React.ReactNode;
}

const getInitials = (name: string) => {
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

const getRoleVariant = (role: string): 'default' | 'secondary' => {
    if (role === 'lead' || role === 'teacher') return 'default';
    return 'secondary';
};

const defaultRoleIcon = (role: string) => {
    if (role === 'teacher') {
        return <GraduationCap className="h-3 w-3 mr-1" />;
    }
    return null;
};

export const MembersListModal = ({
    open,
    onClose,
    title,
    subtitle,
    members,
    showRole = true,
    roleIcon = defaultRoleIcon,
}: MembersListModalProps) => {
    const memberCount = members.length;
    const displaySubtitle = subtitle || `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg w-[80vw] mx-auto rounded-lg">

                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{displaySubtitle}</DialogDescription>
                </DialogHeader>

                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                    {members.map((member) => (
                        <div
                            key={member.id}
                            className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                        >
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={member.profile.profile_picture_url || undefined} />
                                <AvatarFallback>
                                    {member.profile.full_name
                                        ? getInitials(member.profile.full_name)
                                        : member.profile.email.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                    {member.profile.full_name || 'No name'}
                                </p>
                                <p className="text-sm text-muted-foreground truncate">
                                    {member.profile.email}
                                </p>
                            </div>

                            {showRole && (
                                <Badge variant={getRoleVariant(member.role)} className="capitalize">
                                    {roleIcon(member.role)}
                                    {member.role}
                                </Badge>
                            )}
                        </div>
                    ))}

                    {members.length === 0 && (
                        <div className="text-center text-muted-foreground py-8">
                            No members yet
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};