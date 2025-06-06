import React, { Fragment, useMemo } from 'react';
import {
  markRaw,
  model,
  observer,
  ReactFC,
  RecursionField,
  Schema,
  SchemaKey,
  toArr,
  useField,
  useFieldSchema,
} from '@tachybase/schema';

import { Badge, Collapse, CollapsePanelProps, CollapseProps } from 'antd';
import cls from 'classnames';

import { usePrefixCls } from '../__builtins__';

type ActiveKeys = string | number | Array<string | number>;

type ActiveKey = string | number;
export interface IFormCollapse {
  activeKeys: ActiveKeys;
  hasActiveKey(key: ActiveKey): boolean;
  setActiveKeys(key: ActiveKeys): void;
  addActiveKey(key: ActiveKey): void;
  removeActiveKey(key: ActiveKey): void;
  toggleActiveKey(key: ActiveKey): void;
}

export interface IFormCollapseProps extends CollapseProps {
  formCollapse?: IFormCollapse;
}

const usePanels = () => {
  const collapseField = useField();
  const schema = useFieldSchema();
  const panels: { name: SchemaKey; props: any; schema: Schema }[] = [];
  schema.mapProperties((schema, name) => {
    const field = collapseField.query(collapseField.address.concat(name)).take();
    if (field?.display === 'none' || field?.display === 'hidden') return;
    if (schema['x-component']?.indexOf('CollapsePanel') > -1) {
      const key = field?.componentProps?.key || schema?.['x-component-props']?.key || name;
      panels.push({
        name,
        props: {
          ...schema?.['x-component-props'],
          ...field?.componentProps,
          key,
        },
        schema,
      });
    }
  });
  return panels;
};

const createFormCollapse = (defaultActiveKeys?: ActiveKeys) => {
  const formCollapse = model({
    activeKeys: defaultActiveKeys,
    setActiveKeys(keys: ActiveKeys) {
      formCollapse.activeKeys = keys;
    },
    hasActiveKey(key: ActiveKey) {
      if (Array.isArray(formCollapse.activeKeys)) {
        if (formCollapse.activeKeys.includes(key)) {
          return true;
        }
      } else if (formCollapse.activeKeys === key) {
        return true;
      }
      return false;
    },
    addActiveKey(key: ActiveKey) {
      if (formCollapse.hasActiveKey(key)) return;
      formCollapse.activeKeys = toArr(formCollapse.activeKeys).concat(key);
    },
    removeActiveKey(key: ActiveKey) {
      if (Array.isArray(formCollapse.activeKeys)) {
        formCollapse.activeKeys = formCollapse.activeKeys.filter((item) => item !== key);
      } else {
        formCollapse.activeKeys = '';
      }
    },
    toggleActiveKey(key: ActiveKey) {
      if (formCollapse.hasActiveKey(key)) {
        formCollapse.removeActiveKey(key);
      } else {
        formCollapse.addActiveKey(key);
      }
    },
  });
  return markRaw(formCollapse);
};

const InternalFormCollapse: ReactFC<IFormCollapseProps> = observer(({ formCollapse, ...props }) => {
  const field = useField();
  const panels = usePanels();
  const prefixCls = usePrefixCls('formily-collapse', props);
  const _formCollapse = useMemo(() => {
    return formCollapse ? formCollapse : createFormCollapse(props.defaultActiveKey);
  }, []);

  const takeActiveKeys = () => {
    if (props.activeKey) return props.activeKey;
    if (_formCollapse?.activeKeys) return _formCollapse?.activeKeys;
    if (props.accordion) return panels[0]?.name;
    return panels.map((item) => item.name);
  };

  const badgedHeader = (key: SchemaKey, props: any) => {
    const errors = field.form.queryFeedbacks({
      type: 'error',
      address: `${field.address.concat(key)}.*`,
    });
    if (errors.length) {
      return (
        <Badge size="small" className="errors-badge" count={errors.length}>
          {props.header}
        </Badge>
      );
    }
    return props.header;
  };
  return (
    <Collapse
      {...props}
      className={cls(prefixCls, props.className)}
      activeKey={takeActiveKeys()}
      onChange={(key) => {
        props?.onChange?.(key);
        _formCollapse?.setActiveKeys?.(key);
      }}
    >
      {panels.map(({ props, schema, name }, index) => (
        <Collapse.Panel key={index} {...props} header={badgedHeader(name, props)} forceRender>
          <RecursionField schema={schema} name={name} />
        </Collapse.Panel>
      ))}
    </Collapse>
  );
});

const CollapsePanel: React.FC<React.PropsWithChildren<CollapsePanelProps>> = ({ children }) => {
  return <Fragment>{children}</Fragment>;
};

export const FormCollapse = Object.assign(InternalFormCollapse, {
  CollapsePanel,
  createFormCollapse,
});

export default FormCollapse;
