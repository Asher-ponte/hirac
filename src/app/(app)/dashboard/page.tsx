import AppLayout from "../layout";

export default function DashboardPage() {
    // This page is no longer used directly. 
    // The content has been moved to the root page.tsx
    // to make the dashboard the new home page.
    return (
        <AppLayout>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">This page is being redirected. The main dashboard is now at the root URL.</p>
        </AppLayout>
    );
}
