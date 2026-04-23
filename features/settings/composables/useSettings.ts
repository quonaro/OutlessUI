import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query"
import { fetchSettings, updateSettings } from "../services/settings"
import type { Settings } from "../schemas/settings"

export function useSettings() {
  const queryClient = useQueryClient()

  const { data: settings, isPending, isError } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  })

  const { mutate: updateSettingsMutate, isPending: isUpdating } = useMutation({
    mutationFn: (data: Settings) => updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] })
    },
  })

  return {
    settings,
    isPending,
    isError,
    updateSettings: updateSettingsMutate,
    isUpdating,
  }
}
