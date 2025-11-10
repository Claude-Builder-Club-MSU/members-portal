import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Dashboard = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to Claude Builder Club</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Your club activity</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Stats coming soon</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
            <CardDescription>Next club events</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No upcoming events</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Projects</CardTitle>
            <CardDescription>Active projects</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No active projects</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
