import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Auth is enforced by src/proxy.ts; signed-out users never reach this page.
export default function TodayPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold">Today</h1>
        <p className="text-sm text-muted-foreground">One little win at a time.</p>
      </header>
      {["Top 3 priorities", "To-dos", "Habits", "Fitness goal"].map((title) => (
        <Card key={title}>
          <CardHeader>
            <CardTitle className="text-base">{title}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Coming soon</CardContent>
        </Card>
      ))}
    </main>
  );
}
