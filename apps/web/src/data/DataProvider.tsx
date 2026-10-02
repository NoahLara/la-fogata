"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Services } from "./types";

const ServicesContext = createContext<Services | undefined>(undefined);

/** Gives the UI the services it talks to: in-memory ones today, the server's later, with no change to any component. */
export function DataProvider({ services, children }: { services: Services; children: ReactNode }) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): Services {
  const services = useContext(ServicesContext);
  if (!services) throw new Error("useServices must be used inside a DataProvider");
  return services;
}
