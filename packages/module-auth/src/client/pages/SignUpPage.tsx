import React, { createContext, createElement, FunctionComponent, useContext } from 'react';
import { useCurrentDocumentTitle, usePlugin, useViewport } from '@tachybase/client';

import { Navigate, useSearchParams } from 'react-router-dom';

import AuthPlugin, { AuthOptions } from '..';
import { useAuthenticator } from '../authenticator';

export const SignupPageContext = createContext<{
  [authType: string]: {
    component: FunctionComponent<{
      name: string;
    }>;
  };
}>({});
SignupPageContext.displayName = 'SignupPageContext';

export const SignupPageProvider = (props: {
  authType: string;
  component: FunctionComponent<{
    name: string;
  }>;
  children: React.ReactNode;
}) => {
  const components = useContext(SignupPageContext);
  components[props.authType] = {
    component: props.component,
  };
  return <SignupPageContext.Provider value={components}>{props.children}</SignupPageContext.Provider>;
};

export const useSignUpForms = (): {
  [authType: string]: AuthOptions['components']['SignUpForm'];
} => {
  const plugin = usePlugin(AuthPlugin);
  const authTypes = plugin.authTypes.getEntities();
  const signUpForms = {};
  for (const [authType, options] of authTypes) {
    if (options.components?.SignUpForm) {
      signUpForms[authType] = options.components.SignUpForm;
    }
  }
  return signUpForms;
};

export const SignUpPage = () => {
  useViewport();
  useCurrentDocumentTitle('Signup');
  const signUpForms = useSignUpForms();
  const [searchParams] = useSearchParams();
  const name = searchParams.get('name');
  const authenticator = useAuthenticator(name);
  const { authType } = authenticator || {};
  if (!signUpForms[authType]) {
    return <Navigate to="/not-found" replace={true} />;
  }
  return createElement(signUpForms[authType], { authenticatorName: name });
};
