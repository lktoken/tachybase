import React from 'react';
import { RemoteSelect, SchemaComponent, useCollectionFilterOptions, useToken, Variable } from '@tachybase/client';
import { useField } from '@tachybase/schema';

import { useWorkflowVariableOptions } from '../variable';
import { FilterDynamicComponent } from './FilterDynamicComponent';

export const SelectNotifiedPerson = (props) => {
  if (props.value && typeof props.value === 'object') {
    return <SelectNotifiedPersonCustom {...props} />;
  } else {
    return <SelectNotifiedPersonNormal {...props} />;
  }
};

const SelectNotifiedPersonNormal = ({ value, onChange }) => {
  const scope = useWorkflowVariableOptions({ types: [isUserKeyField] });
  return (
    <Variable.Input scope={scope} value={value} onChange={onChange}>
      <RemoteSelect
        fieldNames={{ label: 'nickname', value: 'id' }}
        service={{ resource: 'users' }}
        manual={false}
        value={value}
        onChange={onChange}
      />
    </Variable.Input>
  );
};

const SelectNotifiedPersonCustom = () => {
  const field = useField();
  const currentFormFields = useCollectionFilterOptions('users');
  const { token } = useToken();
  return (
    <div style={{ border: `1px dashed ${token.colorBorder}`, padding: token.paddingSM }}>
      <SchemaComponent
        basePath={field.address}
        schema={{
          type: 'void',
          properties: {
            filter: {
              type: 'object',
              'x-component': 'Filter',
              'x-component-props': {
                options: currentFormFields,
                dynamicComponent: FilterDynamicComponent,
              },
            },
          },
        }}
      />
    </div>
  );
};

function isUserKeyField(field) {
  if (field.isForeignKey) {
    return field.target === 'users';
  } else {
    return field.collectionName === 'users' && field.name === 'id';
  }
}
