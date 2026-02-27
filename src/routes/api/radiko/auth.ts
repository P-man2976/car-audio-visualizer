import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/radiko/auth")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/api/radiko/auth"!</div>;
}
