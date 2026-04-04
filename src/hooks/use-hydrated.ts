"use client";

export function useHydrated() {
  return typeof window !== "undefined";
}
