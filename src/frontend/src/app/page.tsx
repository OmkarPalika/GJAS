import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-12">
      <section className="text-center py-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Global Judicial Assembly Simulator
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          A cutting-edge platform for AI-driven cross-jurisdictional legal deliberation and analysis.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/cases">
            <Button size="lg">Explore Cases</Button>
          </Link>
          <Link href="/rag">
            <Button size="lg" variant="secondary">RAG Search</Button>
          </Link>
        </div>
      </section>

      <section className="py-12">
        <h2 className="text-2xl font-semibold mb-8">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Cross-Jurisdictional Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Compare legal principles across multiple jurisdictions with advanced AI analysis.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>RAG Search</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Retrieve and generate legal insights from comprehensive case law databases.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Collaborative Platform</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Work with legal experts worldwide on complex cross-border legal challenges.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Visualization</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Visualize legal relationships and case law networks with interactive graphs.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Constitutional Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Access and analyze constitutions from around the world.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI-Powered Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Get intelligent recommendations and analysis powered by advanced AI models.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-12">
        <h2 className="text-2xl font-semibold mb-8">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/cases">
            <Button className="w-full h-20" variant="outline">
              <div className="flex flex-col items-center">
                <span className="text-lg font-medium">View Cases</span>
                <span className="text-sm text-muted-foreground">Explore legal cases</span>
              </div>
            </Button>
          </Link>
          <Link href="/rag">
            <Button className="w-full h-20" variant="outline">
              <div className="flex flex-col items-center">
                <span className="text-lg font-medium">RAG Search</span>
                <span className="text-sm text-muted-foreground">AI-powered search</span>
              </div>
            </Button>
          </Link>
          <Link href="/collaborate">
            <Button className="w-full h-20" variant="outline">
              <div className="flex flex-col items-center">
                <span className="text-lg font-medium">Collaborate</span>
                <span className="text-sm text-muted-foreground">Work with experts</span>
              </div>
            </Button>
          </Link>
        </div>
      </section>

      <section className="py-12 text-center">
        <h2 className="text-2xl font-semibold mb-4">Ready to get started?</h2>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Join legal professionals worldwide using GJAS for advanced cross-jurisdictional analysis.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/login">
            <Button>Sign In</Button>
          </Link>
          <Link href="/about">
            <Button variant="secondary">Learn More</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}