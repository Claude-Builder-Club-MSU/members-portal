import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useIsMobile } from '@/hooks/use-mobile';
import type { DetailSection, CardAction } from '@/types/modal.types';

interface DetailModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badges?: React.ReactNode[];
  sections: DetailSection[];
  actions?: CardAction[];
}

export const DetailModal = ({
  open,
  onClose,
  title,
  subtitle,
  badges,
  sections,
  actions,
}: DetailModalProps) => {
  const isMobile = useIsMobile();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-lg ${isMobile ? 'mx-4 max-w-[90vw] overflow-y-auto rounded-xl m-0' : 'py-10'}`}
      >
        <DialogHeader className={isMobile ? 'justify-center items-center' : 'flex-row justify-between items-center'}>
          <DialogTitle className="text-2xl">{title}</DialogTitle>
          {badges && badges.length > 0 && (
            <div className={`flex gap-2 ${isMobile ? 'mt-2' : '!m-0'}`}>
              {badges.map((badge, index) => (
                <div key={index}>{badge}</div>
              ))}
            </div>
          )}
        </DialogHeader>

        {subtitle && <DialogDescription>{subtitle}</DialogDescription>}

        <div className="space-y-6">
          {sections.map((section, index) => (
            <div key={index}>
              {index > 0 && <Separator className="mb-6" />}
              <div className={section.fullWidth ? '' : 'space-y-2'}>
                {section.title && (
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    {section.icon}
                    {section.title}
                  </h3>
                )}
                <div className="text-sm text-muted-foreground">
                  {section.content}
                </div>
              </div>
            </div>
          ))}
        </div>

        {actions && actions.length > 0 && (
          <>
            <Separator />
            <div className="flex gap-3">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'default'}
                  className="flex-1"
                  onClick={action.onClick}
                  disabled={action.disabled || action.loading}
                >
                  {action.icon}
                  {action.loading ? 'Loading...' : action.label}
                </Button>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};