import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { MetadataItem, CardAction, MembershipInfo } from '@/types/modal.types';

interface ItemCardProps {
    title: string;
    badges?: React.ReactNode[];
    metadata?: MetadataItem[];
    description?: string;
    members?: {
        data: MembershipInfo[];
        onViewAll?: () => void;
        maxDisplay?: number;
    };
    actions?: CardAction[];
    className?: string;
}

const getInitials = (name: string) => {
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

export const ItemCard = ({
    title,
    badges,
    metadata,
    description,
    members,
    actions,
    className = '',
}: ItemCardProps) => {
    const maxDisplay = members?.maxDisplay || 5;
    const displayedMembers = members?.data.slice(0, maxDisplay) || [];
    const remainingCount = (members?.data.length || 0) - maxDisplay;

    return (
        <Card className={`flex flex-col h-full w-full ${className}`}>
            <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex-1">{title}</CardTitle>
                    {badges && badges.length > 0 && (
                        <div className="flex flex-row gap-3 items-center">
                            {badges.map((badge, index) => (
                                <div key={index}>{badge}</div>
                            ))}
                        </div>
                    )}
                </div>
            </CardHeader>

            <CardContent className="flex flex-col flex-1 min-h-0">
                {/* Metadata */}
                {metadata && metadata.length > 0 && (
                    <div className="space-y-3 text-sm text-muted-foreground pt-1">
                        {metadata.map((item, index) => (
                            item.render ? (
                                item.render(item)
                            ) : (
                                <div
                                    key={index}
                                    className={`flex items-center gap-2 ${item.interactive
                                        ? 'cursor-pointer group w-fit'
                                        : ''
                                        }`}
                                    onClick={item.onClick}
                                >
                                    <div className={item.interactive ? 'group-hover:text-orange-600 transition-colors' : ''}>
                                        {item.icon}
                                    </div>
                                    <span
                                        className={
                                            item.interactive
                                                ? 'underline decoration-transparent group-hover:decoration-orange-600 group-hover:text-orange-600 transition-all'
                                                : ''
                                        }
                                    >
                                        {item.text}
                                    </span>
                                </div>
                            )
                        ))}
                    </div>
                )}

                {/* Members Preview */}
                {members && members.data.length > 0 && (
                    <div className="space-y-3 text-sm text-muted-foreground mt-3">
                        <div className="flex -space-x-2">
                            {displayedMembers.map((member) => (
                                <Avatar key={member.id} className="h-8 w-8 border-2 border-background">
                                    <AvatarImage src={member.profile.profile_picture_url || undefined} />
                                    <AvatarFallback className="text-xs">
                                        {member.profile.full_name
                                            ? getInitials(member.profile.full_name)
                                            : member.profile.email.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            ))}
                            {remainingCount > 0 && (
                                <div className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs">
                                    +{remainingCount}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Description */}
                {description && (
                    <div className="text-sm text-muted-foreground flex-1 space-y-3 break-words pt-3 whitespace-pre-line">
                        {description}
                    </div>
                )}

                {/* Actions */}
                {actions && actions.length > 0 && (
                    <div className="space-y-2 mt-4">
                        {actions.map((action, index) => (
                            <Button
                                key={index}
                                className="w-full"
                                variant={action.variant || 'default'}
                                onClick={action.onClick}
                                disabled={action.disabled || action.loading}
                            >
                                {action.icon}
                                {action.loading ? 'Loading...' : action.label}
                            </Button>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};