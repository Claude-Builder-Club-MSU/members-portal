import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Trophy } from 'lucide-react';

const Checkin = () => {
    const { token } = useParams<{ token: string }>();
    const { user, loading, refreshProfile } = useAuth();
    const navigate = useNavigate();
    const [checking, setChecking] = useState(false);
    const [result, setResult] = useState<{
        success: boolean;
        message: string;
        points_awarded?: number;
        event_name?: string;
    } | null>(null);

    useEffect(() => {
        // User must be logged in to check in (ProtectedRoute handles redirect)
        const doCheckin = async () => {
            if (!token || checking) return;

            setChecking(true);

            try {
                const { data, error } = await supabase.rpc('checkin_user_for_event', {
                    p_token: token,
                });

                if (error) throw error;

                const resultData = data as {
                    success: boolean;
                    message: string;
                    points_awarded?: number;
                    event_name?: string;
                };

                // For RSVP violations (negative points), show as failure in UI
                if (resultData.success && resultData.points_awarded && resultData.points_awarded < 0) {
                    setResult({
                        success: false,
                        message: resultData.message,
                        points_awarded: resultData.points_awarded,
                        event_name: resultData.event_name
                    });
                } else {
                    setResult(resultData);
                }

                // Clear redirect URL and refresh profile (to update points) after check-in (success or penalty)
                if (resultData?.points_awarded !== undefined) {
                    sessionStorage.removeItem('redirectAfterLogin');
                    // Refresh profile to get updated points
                    await refreshProfile();
                }
            } catch (error) {
                console.error('Check-in error:', error);
                setResult({
                    success: false,
                    message: 'Failed to check in. Please try again.',
                });
            } finally {
                setChecking(false);
            }
        };

        if (!loading && user && token) {
            doCheckin();
        }
    }, [user, loading, token]);

    if (loading || checking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-orange-50/20 to-background dark:from-background dark:via-orange-950/10 dark:to-background">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-muted-foreground">Checking you in...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-orange-50/20 to-background dark:from-background dark:via-orange-950/10 dark:to-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        {result?.success ? (
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
                            </div>
                        ) : (
                            <div className="w-20 h-20 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                                <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
                            </div>
                        )}
                    </div>
                    <CardTitle className="text-2xl">
                        {result?.success ? 'Check-in Successful!' : 'Check-in Failed'}
                    </CardTitle>
                    <CardDescription>{result?.message}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {result?.points_awarded !== undefined && (
                        <div className={`rounded-lg p-4 text-center ${result.points_awarded >= 0
                                ? 'bg-orange-50 dark:bg-orange-950'
                                : 'bg-red-50 dark:bg-red-950'
                            }`}>
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <Trophy className={`h-6 w-6 ${result.points_awarded >= 0
                                        ? 'text-orange-600'
                                        : 'text-red-600'
                                    }`} />
                                <span className={`text-3xl font-bold ${result.points_awarded >= 0
                                        ? 'text-orange-600'
                                        : 'text-red-600'
                                    }`}>
                                    {result.points_awarded >= 0 ? '+' : ''}{result.points_awarded}
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {result.points_awarded >= 0 ? 'Points Awarded' : 'Points Deducted'}
                            </p>
                            {result.event_name && (
                                <p className="text-sm font-medium mt-2">{result.event_name}</p>
                            )}
                        </div>
                    )}
                    <Button
                        className="w-full"
                        onClick={() => navigate('/dashboard')}
                    >
                        Go to Dashboard
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default Checkin;