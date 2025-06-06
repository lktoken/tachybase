import { DataField, JSXComponent } from '..';
import { isFn } from '../../shared';
import { ArrayField, Field, Form, ObjectField, Query, VoidField } from '../models';
import { GeneralField, IFieldState, IFormState, IGeneralFieldState, IVoidFieldState } from '../types';

export const isForm = (node: any): node is Form => {
  return node instanceof Form;
};

export const isGeneralField = (node: any): node is GeneralField => {
  return node instanceof Field || node instanceof VoidField;
};

export const isField = <
  Decorator extends JSXComponent = any,
  Component extends JSXComponent = any,
  TextType = any,
  ValueType = any,
>(
  node: any,
): node is Field<Decorator, Component, TextType, ValueType> => {
  return node instanceof Field;
};

export const isArrayField = <Decorator extends JSXComponent = any, Component extends JSXComponent = any>(
  node: any,
): node is ArrayField<Decorator, Component> => {
  return node instanceof ArrayField;
};

export const isObjectField = <Decorator extends JSXComponent = any, Component extends JSXComponent = any>(
  node: any,
): node is ObjectField<Decorator, Component> => {
  return node instanceof ObjectField;
};

export const isVoidField = <Decorator = any, Component = any, TextType = any>(
  node: any,
): node is VoidField<Decorator, Component, TextType> => {
  return node instanceof VoidField;
};

export const isFormState = <T extends Record<any, any> = any>(state: any): state is IFormState<T> => {
  if (isFn(state?.initialize)) return false;
  return state?.displayName === 'Form';
};

export const isFieldState = (state: any): state is IFieldState => {
  if (isFn(state?.initialize)) return false;
  return state?.displayName === 'Field';
};

export const isGeneralFieldState = (node: any): node is IGeneralFieldState => {
  if (isFn(node?.initialize)) return false;
  return node?.displayName?.indexOf('Field') > -1;
};

export const isArrayFieldState = (state: any): state is IFieldState => {
  if (isFn(state?.initialize)) return false;
  return state?.displayName === 'ArrayField';
};

export const isDataField = (node: any): node is DataField => {
  return isField(node) || isArrayField(node) || isObjectField(node);
};

export const isDataFieldState = (node: any) => {
  return isFieldState(node) || isObjectFieldState(node) || isArrayFieldState(node);
};

export const isObjectFieldState = (state: any): state is IFieldState => {
  if (isFn(state?.initialize)) return false;
  return state?.displayName === 'ObjectField';
};

export const isVoidFieldState = (state: any): state is IVoidFieldState => {
  if (isFn(state?.initialize)) return false;
  return state?.displayName === 'VoidField';
};

export const isQuery = (query: any): query is Query => {
  return query && query instanceof Query;
};
