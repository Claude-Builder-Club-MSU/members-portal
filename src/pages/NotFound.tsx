import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-orange-50/20 to-background dark:from-background dark:via-orange-950/10 dark:to-background">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center space-y-8">

          {/* 404 Text */}
          <div className="space-y-4">
            <h1 className="text-9xl font-black bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">
              404
            </h1>
            <h2 className="text-4xl font-bold text-foreground">
              Page Not Found
            </h2>
            <p className="text-xl text-muted-foreground max-w-md mx-auto">
              Looks like you've wandered into uncharted territory. Let's get you back on track.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-16 justify-center">
            <Button
              size="lg"
              onClick={() => navigate(-1)}
              variant="outline"
              className="gap-2"
            >
              <ArrowLeft className="h-5 w-5" />
              Go Back
            </Button>
            <Button
              size="lg"
              onClick={() => navigate('/')}
              className="gap-2 bg-orange-600 hover:bg-orange-700"
            >
              Go Home
              <Home className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;