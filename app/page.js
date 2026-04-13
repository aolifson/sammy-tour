import { sandwiches } from "@/lib/sandwiches";
import { getState, isConfigured } from "@/lib/storage";
import ClientApp from "./ClientApp";

export const dynamic = "force-dynamic";

export default async function Page() {
  const configured = isConfigured();
  const state = configured ? await getState() : {};
  return (
    <ClientApp
      sandwiches={sandwiches}
      initialState={state}
      configured={configured}
    />
  );
}
