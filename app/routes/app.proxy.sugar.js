import {authenticate} from "../shopify.server.js";
import {json} from "@remix-run/node";

// Loader Function
export async function loader({ request }) {
  // const url = new URL(request.url);
  // const shop = url.searchParams.get('shop');
  await authenticate.public.appProxy(request);

  return json({ success: true, message: 'another proxy route found' })
}
