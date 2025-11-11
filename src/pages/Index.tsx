import { Button } from "@/components/ui/button";
import { Instagram, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-secondary to-background px-4">
      <div className="max-w-4xl w-full text-center space-y-8">
        <div className="flex justify-center mb-6">
          <img 
            src="/claude-logo.png" 
            alt="Claude Logo" 
            className="h-24 w-24 md:h-32 md:w-32 animate-in fade-in zoom-in duration-500"
          />
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold text-foreground animate-in slide-in-from-bottom duration-700">
          Claude Builder Club @ MSU
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground animate-in slide-in-from-bottom duration-700 delay-150">
          Building the future, one project at a time
        </p>

        <div className="flex flex-wrap gap-4 justify-center items-center pt-8">
          <Button
            variant="outline"
            size="lg"
            className="gap-2"
            onClick={() => window.open('https://discord.gg/your-discord', '_blank')}
          >
            <MessageCircle className="h-5 w-5" />
            Join Discord
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="gap-2"
            onClick={() => window.open('https://instagram.com/your-instagram', '_blank')}
          >
            <Instagram className="h-5 w-5" />
            Follow Instagram
          </Button>

          <Button
            size="lg"
            onClick={() => navigate('/auth')}
            className="font-semibold"
          >
            Login / Apply
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
