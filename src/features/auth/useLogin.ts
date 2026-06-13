import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { tokenPairSchema } from '@/lib/schemas/auth';
import { useSession } from '@/stores/session';
import { fetchMe } from './useMe';

export interface LoginInput {
  email: string;
  password: string;
}

export function useLogin() {
  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const pair = await apiFetch('/auth/login', {
        method: 'POST',
        body: input,
        auth: false,
        schema: tokenPairSchema,
      });
      useSession.getState().setTokens(pair);
      const me = await fetchMe();
      useSession.getState().setUser(me);
      return me;
    },
  });
}
