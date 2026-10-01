import { Server, routePartykitRequest } from "partyserver";

export class Campfire extends Server {
  override onRequest(): Response {
    return new Response("ok");
  }
}

export default {
  async fetch(request: Request, env: Record<string, unknown>): Promise<Response> {
    const response = await routePartykitRequest(request, env);
    return response ?? new Response("ok");
  },
};
