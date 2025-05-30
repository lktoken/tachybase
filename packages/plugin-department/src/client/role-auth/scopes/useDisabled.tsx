import { useContext } from 'react';
import { RolesManagerContext } from '@tachybase/module-acl/client';

export const useDisabled = () => {
  const { role } = useContext(RolesManagerContext);
  return {
    disabled: (params) => {
      return params?.roles?.some((itemRole) => itemRole.name === role?.name);
    },
  };
};
