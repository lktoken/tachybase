import React from 'react';
import {
  GeneralSchemaDesigner,
  SchemaSettingsDataScope,
  SchemaSettingsDivider,
  SchemaSettingsRemove,
  SchemaSettingsSelectItem,
  useCollection_deprecated,
  useDesignable,
  useFormBlockContext,
  useTableBlockContext,
} from '@tachybase/client';
import { useField, useFieldSchema } from '@tachybase/schema';

import { useApiLogsTranslation } from '../locale';

export const ApiLogsDesigner = () => {
  const { name, title } = useCollection_deprecated();
  const field = useField();
  const fieldSchema = useFieldSchema();
  const { form } = useFormBlockContext();
  const { service } = useTableBlockContext();
  const { t } = useApiLogsTranslation();
  const { dn } = useDesignable();
  return (
    <GeneralSchemaDesigner title={title || name}>
      <SchemaSettingsDataScope
        collectionName={name}
        defaultFilter={fieldSchema?.['x-decorator-props']?.params?.filter || {}}
        form={form}
        onSubmit={({ filter }) => {
          const params = field.decoratorProps.params || {};
          params.filter = filter;
          field.decoratorProps.params = params;
          fieldSchema['x-decorator-props']['params'] = params;
          service.run({ ...service.params?.[0], filter, page: 1 });
          dn.emit('patch', {
            schema: {
              ['x-uid']: fieldSchema['x-uid'],
              'x-decorator-props': fieldSchema['x-decorator-props'],
            },
          });
        }}
      />
      <SchemaSettingsSelectItem
        title={t('Records per page')}
        value={field.decoratorProps?.params?.pageSize || 20}
        options={[
          { label: '10', value: 10 },
          { label: '20', value: 20 },
          { label: '50', value: 50 },
          { label: '100', value: 100 },
          { label: '200', value: 200 },
        ]}
        onChange={(pageSize) => {
          const params = field.decoratorProps.params || {};
          params.pageSize = pageSize;
          field.decoratorProps.params = params;
          fieldSchema['x-decorator-props']['params'] = params;
          service.run({ ...service.params?.[0], pageSize, page: 1 });
          dn.emit('patch', {
            schema: {
              ['x-uid']: fieldSchema['x-uid'],
              'x-decorator-props': fieldSchema['x-decorator-props'],
            },
          });
        }}
      />
      <SchemaSettingsDivider />
      <SchemaSettingsRemove
        removeParentsIfNoChildren
        breakRemoveOn={{
          'x-component': 'Grid',
        }}
      />
    </GeneralSchemaDesigner>
  );
};
