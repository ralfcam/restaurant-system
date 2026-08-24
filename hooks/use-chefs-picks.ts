"use client";

import useSWR, { type KeyedMutator } from "swr";
import { getHomepageChefsPicks, type MenuItemRow } from "@/app/actions/menu";

type ChefsPicksPayload = Awaited<ReturnType<typeof getHomepageChefsPicks>>;

export function useChefsPicks(initialData?: ChefsPicksPayload): {
  enabled: boolean;
  items: MenuItemRow[];
  isLoading: boolean;
  mutate: KeyedMutator<ChefsPicksPayload>;
} {
  const { data, isLoading, mutate } = useSWR<ChefsPicksPayload>(
    "homepage-chefs-picks",
    getHomepageChefsPicks,
    {
      fallbackData: initialData,
      revalidateOnFocus: false,
    },
  );

  return {
    enabled: data?.enabled ?? true,
    items: data?.items ?? [],
    isLoading,
    mutate,
  };
}
