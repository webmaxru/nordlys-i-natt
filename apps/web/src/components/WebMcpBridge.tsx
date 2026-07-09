import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createAuroraTools, type AuroraToolsDeps } from '../lib/auroraTools';
import { registerWebMcpTools } from '../lib/webmcp';
import { useAppState } from '../state/AppStateContext';

/**
 * Registers the app's WebMCP tools while it is mounted and unregisters them on
 * unmount. Renders nothing.
 *
 * The tool `execute` callbacks read live app state through a ref-backed getter,
 * so the tools are registered exactly once (avoiding duplicate-name errors and
 * churn) while always acting on the current selection and query cache.
 */
export function WebMcpBridge() {
  const { selectedLocation, setSelectedLocation } = useAppState();
  const queryClient = useQueryClient();

  const depsRef = useRef<AuroraToolsDeps>({
    getSelectedLocation: () => selectedLocation,
    setSelectedLocation,
    queryClient,
  });

  // Keep the ref pointed at the latest state on every render.
  depsRef.current = {
    getSelectedLocation: () => selectedLocation,
    setSelectedLocation,
    queryClient,
  };

  useEffect(() => {
    const registration = registerWebMcpTools(
      createAuroraTools(() => depsRef.current),
    );
    return () => registration.dispose();
  }, []);

  return null;
}
