import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import bootstrapGrid from "bootstrap/dist/css/bootstrap-grid.min.css?url"
import bootstrapUtilities from "bootstrap/dist/css/bootstrap-utilities.min.css?url"
import dataTableCss from "datatables.net-dt/css/dataTables.dataTables.min.css?url";
import cssQuill from "react-quill/dist/quill.snow.css?url";
import customStyles from "../assets/styles.css?url"


export const links = () => [
  { rel: "stylesheet", href: polarisStyles },
  { rel: "stylesheet", href: bootstrapUtilities },
  { rel: "stylesheet", href: bootstrapGrid },
  { rel: "stylesheet", href: dataTableCss },
  { rel: "stylesheet", href: cssQuill },
  { rel: "stylesheet", href: customStyles }
];

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return json({ apiKey: process.env.SHOPIFY_API_KEY || "" });
};

export default function App() {
  const { apiKey } = useLoaderData();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">
          Home
        </Link>
        <Link to="/app/collectReviews">Collect reviews</Link>
        <Link to="/app/emailTemplate">Email templates</Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
