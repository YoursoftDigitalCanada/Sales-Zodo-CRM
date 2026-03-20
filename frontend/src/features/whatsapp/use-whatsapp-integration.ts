import { useEffect, useMemo, useState } from "react";

import {
  getCurrentTenantPlan,
  getWhatsAppConnections,
  getWhatsAppPlanAccess,
  subscribeWhatsAppIntegration,
} from "./whatsapp-store";

export function useWhatsAppIntegration() {
  const [connections, setConnections] = useState(() => getWhatsAppConnections());

  useEffect(() => {
    setConnections(getWhatsAppConnections());

    return subscribeWhatsAppIntegration(() => {
      setConnections(getWhatsAppConnections());
    });
  }, []);

  return useMemo(() => {
    const plan = getCurrentTenantPlan();
    const access = getWhatsAppPlanAccess(plan);

    return {
      plan,
      access,
      connections,
      primaryConnection: connections[0] ?? null,
      isConnected: connections.length > 0,
      hasCapacity: connections.length < access.maxNumbers,
    };
  }, [connections]);
}
