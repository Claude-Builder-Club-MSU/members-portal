import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Trophy, Mail, GraduationCap, Crown, Users, Award, Eye, Settings, UserMinus, Ban, ArrowBigUpDashIcon } from 'lucide-react';
import type { Database } from '@/integrations/supabase/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type AppRole = Database['public']['Enums']['app_role'];

interface MemberWithRole extends Profile {
    role: AppRole;
}

interface PersonCardProps {
    person: MemberWithRole;
    onViewProfile: (person: MemberWithRole) => void;
    onRoleChange?: (personId: string, newRole: AppRole) => void;
    onKick?: (personId: string, personName: string) => void;
    onBan?: (personId: string, personName: string) => void;
    onGraduate?: (personId: string, personName: string) => void;
    canManage: boolean;
    canChangeRoles?: boolean;
    isMobile: boolean;
    currentUserId?: string;
    currentUserRole?: AppRole;
    type: 'member' | 'prospect';
}

const getInitials = (name: string) => {
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
        case 'e-board':
            return 'default';
        case 'board':
            return 'default';
        case 'member':
            return 'secondary';
        default:
            return 'outline';
    }
};

export const PersonCard = ({
    person,
    onViewProfile,
    onRoleChange,
    onKick,
    onBan,
    onGraduate,
    canManage,
    canChangeRoles = false,
    isMobile,
    currentUserId,
    currentUserRole,
    type,
}: PersonCardProps) => {
    // Board cannot manage themselves, board members, or e-board members
    const canManageThisPerson =
        canManage &&
        currentUserId !== person.id &&
        !(currentUserRole === 'board' && (person.role === 'board' || person.role === 'e-board'));

    const showManageButton = canManageThisPerson && !isMobile;

    // Board cannot promote to e-board
    const canPromoteToEBoard = currentUserRole !== 'board';

    return (
        <Card className="flex flex-col h-full w-full relative">
            <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-12 w-12 shrink-0">
                            <AvatarImage src={person.profile_picture_url || undefined} />
                            <AvatarFallback className="text-lg">
                                {person.full_name ? getInitials(person.full_name) : person.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <CardTitle className="text-base truncate">
                                {person.full_name || 'No name'}
                            </CardTitle>
                            {type === 'member' && person.position && (
                                <p className="text-sm text-muted-foreground truncate">{person.position}</p>
                            )}
                            {type === 'prospect' && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                    <Mail className="h-3 w-3 shrink-0" />
                                    <p className="truncate">{person.email}</p>
                                </div>
                            )}
                        </div>
                    </CardTitle>

                    {/* Badge */}
                    {type === 'member' ? (
                        person.role === 'e-board' ? (
                            <Badge className="capitalize shrink-0 whitespace-nowrap sparkle gold-shimmer text-yellow-900 font-semibold border-2 border-yellow-400/50 relative">
                                <span className="sparkle-particle"></span>
                                <span className="sparkle-particle"></span>
                                <span className="sparkle-particle"></span>
                                <span className="relative z-10">{person.role.replace('-', ' ')}</span>
                            </Badge>
                        ) : (
                            <Badge variant={getRoleBadgeVariant(person.role)} className="capitalize shrink-0 whitespace-nowrap">
                                {person.role.replace('-', ' ')}
                            </Badge>
                        )
                    ) : (
                        <Badge variant="secondary" className="capitalize shrink-0 whitespace-nowrap">
                            {person.term_joined
                                ? person.term_joined
                                : (() => {
                                    const date = person.created_at ? new Date(person.created_at) : new Date();
                                    return date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
                                })()}
                        </Badge>
                    )}
                </div>
            </CardHeader>

            <CardContent className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 space-y-3 mt-3">
                    <div className="flex items-center justify-between text-sm">
                        {person.class_year ? (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <GraduationCap className="h-4 w-4" />
                                <span className="capitalize">{person.class_year}</span>
                            </div>
                        ) : (
                            <div className="text-muted-foreground">
                                <GraduationCap className="h-4 w-4 inline mr-2" />
                                No class year
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Trophy className="h-4 w-4" />
                            <span className="font-medium">{person.points}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-row gap-2 mt-4">
                    <Button variant="default" size="sm" className="w-full" onClick={() => onViewProfile(person)}>
                        <Eye className="h-4 w-4" />
                        View Profile
                    </Button>

                    {showManageButton && (
                        <DropdownMenu>
                            <DropdownMenuTrigger size="sm" asChild>
                                <Button variant="outline" size="sm" className="w-full">
                                    <Settings className="h-4 w-4" />
                                    Manage
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center" className="w-40">
                                {/* Member Management - Only show role change for e-board */}
                                {type === 'member' && onRoleChange && canChangeRoles && (
                                    <>
                                        <DropdownMenuSub>
                                            <DropdownMenuSubTrigger variant="ghost">
                                                <Crown className="h-4 w-4 mx-1" />
                                                Change Role
                                            </DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem
                                                    onClick={() => onRoleChange(person.id, 'member')}
                                                    disabled={person.role === 'member'}
                                                >
                                                    <Users className="h-4 w-4" />
                                                    Member
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => onRoleChange(person.id, 'board')}
                                                    disabled={person.role === 'board'}
                                                >
                                                    <Award className="h-4 w-4" />
                                                    Board
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => onRoleChange(person.id, 'e-board')}
                                                    disabled={person.role === 'e-board' || !canPromoteToEBoard}
                                                >
                                                    <Crown className="h-4 w-4" />
                                                    E-Board
                                                </DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuSub>
                                        <DropdownMenuSeparator />
                                    </>
                                )}

                                {/* Prospect Graduate */}
                                {type === 'prospect' && onGraduate && (
                                    <DropdownMenuItem
                                        onClick={() => onGraduate(person.id, person.full_name || person.email)}
                                        variant="enable"
                                        className="rounded-t-md rounded-b-none bg-green-600/20 border-0 border-green-600 text-green-600 hover:bg-green-600 hover:text-cream hover:rounded-md transition-all duration-200"
                                    >
                                        <ArrowBigUpDashIcon className="h-4 w-4" />
                                        Graduate
                                    </DropdownMenuItem>
                                )}

                                {/* Kick (Members only) */}
                                {type === 'member' && onKick && (
                                    <DropdownMenuItem
                                        onClick={() => onKick(person.id, person.full_name || person.email)}
                                        variant="destructive"
                                        className="border-0 rounded-t-md rounded-b-none hover:rounded-md transition-all duration-200"
                                    >
                                        <UserMinus className="h-4 w-4" />
                                        Kick Member
                                    </DropdownMenuItem>
                                )}

                                {/* Ban */}
                                {onBan && (
                                    <DropdownMenuItem
                                        onClick={() => onBan(person.id, person.full_name || person.email)}
                                        variant="destructive"
                                        className={`border-0 ${type === 'member' ? 'rounded-b-md rounded-t-none' : 'rounded-b-md bg-destructive/20 rounded-t-none'} hover:rounded-md transition-all duration-200`}
                                    >
                                        <Ban className="h-4 w-4" />
                                        {type === 'member' ? 'Ban Member' : 'Ban Prospect'}
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};