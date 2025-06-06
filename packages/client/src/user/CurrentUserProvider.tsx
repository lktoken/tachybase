import React, { createContext, useContext, useMemo } from 'react';

import { Navigate, useLocation } from 'react-router-dom';

import { ReturnTypeOfUseRequest, useAPIClient, useRequest } from '../api-client';
import { useACLRoleContext } from '../built-in/acl';
import { useCompile } from '../schema-component';

export const CurrentUserContext = createContext<ReturnTypeOfUseRequest>(null);
CurrentUserContext.displayName = 'CurrentUserContext';

export const useCurrentUserContext = () => {
  return useContext(CurrentUserContext);
};

export const useCurrentRoles = () => {
  const { allowAnonymous } = useACLRoleContext();
  const { data } = useCurrentUserContext();
  const compile = useCompile();
  const options = useMemo(() => {
    const roles = (data?.data?.roles || []).map(({ name, title }) => ({ name, title: compile(title) }));
    if (allowAnonymous) {
      roles.push({
        title: 'Anonymous',
        name: 'anonymous',
      });
    }
    return roles;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowAnonymous, data?.data?.roles]);
  return options;
};

export const CurrentUserProvider = (props) => {
  const api = useAPIClient();
  const result = useRequest<any>(() =>
    api
      .request({
        url: '/auth:check',
        skipNotify: true,
        skipAuth: true,
      })
      .then((res) => res?.data),
  );

  if (result.loading) {
    return;
  }

  return <CurrentUserContext.Provider value={result}>{props.children}</CurrentUserContext.Provider>;
};

export const NavigateIfNotSignIn = ({ children }) => {
  const result = useCurrentUserContext();
  const { pathname, search } = useLocation();
  const redirect = `?redirect=${pathname}${search}`;
  if (!result?.data?.data?.id) {
    return <Navigate replace to={`/signin${redirect}`} />;
  }
  return <>{children}</>;
};
