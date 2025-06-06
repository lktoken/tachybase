import React from 'react';

import hoistNonReactStatics from 'hoist-non-react-statics';

import { isVoidField } from '../../core';
import { observer, Observer } from '../../reactive-react';
import { each, FormPath, isFn, isStr, isValid } from '../../shared';
import { useField } from '../hooks';
import { IComponentMapper, IStateMapper, JSXComponent } from '../types';

export function mapProps<T extends JSXComponent>(...args: IStateMapper<React.ComponentProps<T>>[]) {
  return (target: T) => {
    return observer(
      (props: any) => {
        const field = useField();
        const results = args.reduce(
          (props, mapper) => {
            if (isFn(mapper)) {
              props = Object.assign(props, mapper(props, field));
            } else {
              each(mapper, (to, extract) => {
                const extractValue = FormPath.getIn(field, extract);
                const targetValue = isStr(to) ? to : (extract as any);
                const originalValue = FormPath.getIn(props, targetValue);
                if (extract === 'value') {
                  if (to !== extract) {
                    delete props.value;
                  }
                }
                if (isValid(originalValue) && !isValid(extractValue)) return;
                FormPath.setIn(props, targetValue, extractValue);
              });
            }
            return props;
          },
          { ...props },
        );
        return React.createElement(target, results);
      },
      {
        forwardRef: true,
      },
    );
  };
}

export function mapReadPretty<T extends JSXComponent, C extends JSXComponent>(
  component: C,
  readPrettyProps?: React.ComponentProps<C>,
) {
  return (target: T) => {
    return observer(
      (props) => {
        const field = useField();
        if (!isVoidField(field) && field?.pattern === 'readPretty') {
          return React.createElement(component, {
            ...readPrettyProps,
            ...props,
          });
        }
        return React.createElement(target, props);
      },
      {
        forwardRef: true,
      },
    );
  };
}

export function connect<T extends JSXComponent>(target: T, ...args: IComponentMapper<T>[]) {
  const Target = args.reduce((target, mapper) => {
    return mapper(target);
  }, target);

  const Destination = React.forwardRef<React.ElementRef<T>, React.ComponentProps<T>>((props, ref) => {
    return React.createElement(Target, { ...props, ref });
  });

  if (target) hoistNonReactStatics(Destination, target as any);

  return Destination;
}

export { observer, Observer };
