import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { Trash2, AlertTriangle, Save, X } from 'lucide-react';

interface EditModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    onSubmit: (e: React.FormEvent) => Promise<void> | void;
    onDelete?: () => Promise<void> | void;
    loading?: boolean;
    deleteItemName?: string;
    children: React.ReactNode;
    submitLabel?: string;
}

export const EditModal = ({
    open,
    onClose,
    title,
    description,
    onSubmit,
    onDelete,
    loading = false,
    deleteItemName,
    children,
    submitLabel,
}: EditModalProps) => {
    const isMobile = useIsMobile();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const handleDelete = async () => {
        if (!onDelete) return;

        setDeleteLoading(true);
        try {
            await onDelete();
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(e);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onClose}>
                <DialogContent
                    className={`${isMobile ? 'max-w-[calc(100vw-2rem)] max-h-[90vh]' : 'max-w-2xl max-h-[90vh]'
                        } overflow-y-auto rounded-xl flex flex-col`}
                >
                    <DialogHeader className="flex-shrink-0">
                        <DialogTitle>{title}</DialogTitle>
                        {description && <DialogDescription>{description}</DialogDescription>}
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto">
                        <form id="edit-modal-form" onSubmit={handleSubmit} className={`space-y-4 p-1 ${isMobile ? 'w-[80vw]' : ''}`}>
                            {children}
                        </form>
                    </div>

                    <div className="flex gap-2 pt-4 flex-col w-full sm:flex-row flex-shrink-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                        {onDelete && (
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={loading || deleteLoading}
                                className="w-full sm:flex-1"
                            >
                                <Trash2 className="h-4 w-4 mr-0" />
                                Delete
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={loading || deleteLoading}
                            className="w-full sm:flex-1"
                        >
                            <X className="h-4 w-4 mr-0" />
                            Cancel
                        </Button>
                        <Button type="submit" form="edit-modal-form" disabled={loading || deleteLoading} className="w-full sm:flex-1">
                            <Save className="h-4 w-4 mr-0" />
                            {loading ? 'Saving...' : submitLabel || 'Save'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {onDelete && (
                <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <div className="flex w-full justify-between items-center">
                                <AlertDialogTitle className="text-left">Delete {deleteItemName || 'Item'}</AlertDialogTitle>
                                <div className="h-8 w-8 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                                    <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                                </div>
                            </div>
                            <AlertDialogDescription className="text-left mt-2">
                                Are you sure you want to delete this {deleteItemName?.toLowerCase() || 'item'}? This action
                                cannot be undone and will permanently remove all associated data.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter
                            className={`flex !justify-around ${isMobile ? 'space-y-2 flex-col-reverse' : ''}`}
                        >
                            <AlertDialogCancel
                                variant="outline"
                                disabled={deleteLoading}
                                className={!isMobile ? 'w-[47%]' : ''}
                            >
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                disabled={deleteLoading}
                                variant="destructive"
                                className={!isMobile ? 'w-[47%]' : ''}
                            >
                                {deleteLoading ? 'Deleting...' : `Delete ${deleteItemName || 'Item'}`}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    );
};