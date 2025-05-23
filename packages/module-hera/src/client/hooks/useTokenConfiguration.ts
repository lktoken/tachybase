import { useMemo } from 'react';
import { useRequest } from '@tachybase/client';

export const TokenConfigurationResourceKey = 'token-configuration';
export const getSSKey = (type) => {
  return `TACHYBASE_PLUGIN_TOKEN_CONFIGURATION_${type}`;
};

export const useMapConfiguration = (type: string) => {
  // cache
  const config = useMemo(() => {
    const d = sessionStorage.getItem(getSSKey(type));
    if (d) {
      return JSON.parse(d);
    }
    return d;
  }, [type]);

  const { data } = useRequest<{
    data: any;
  }>(
    {
      resource: TokenConfigurationResourceKey,
      action: 'get',
      params: {
        type,
      },
    },
    {
      onSuccess(data) {
        sessionStorage.setItem(getSSKey(type), JSON.stringify(data?.data));
      },
      refreshOnWindowFocus: false,
      refreshDeps: [],
      manual: config ? true : false,
    },
  );

  if (config) return config;

  return data?.data;
};
