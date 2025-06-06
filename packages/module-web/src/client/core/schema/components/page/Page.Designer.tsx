import React from 'react';
import { SchemaSettingsDropdown, SchemaSettingsSwitchItem, useDesignable, useSchemaToolbar } from '@tachybase/client';
import { uid, useField, useFieldSchema } from '@tachybase/schema';

import { MenuOutlined } from '@ant-design/icons';
import { Button } from 'antd';

import { generateNTemplate, useTranslation } from '../../../../locale';
import { findGridSchema } from '../../helpers';
import { useSchemaPatch } from '../../hooks';

export const PageDesigner = (props) => {
  const { showBack } = props;
  const { t } = useTranslation();
  const field = useField();
  const fieldSchema = useFieldSchema();
  const { dn } = useDesignable();
  const { onUpdateComponentProps } = useSchemaPatch();
  const headerSchema = fieldSchema?.properties?.['header'];
  const isHeaderEnabled = !!headerSchema && field.componentProps?.headerEnabled !== false;
  const tabsSchema = fieldSchema?.properties?.['tabs'];
  const isTabsEnabled = !!tabsSchema && field.componentProps?.tabsEnabled !== false;
  const { title } = useSchemaToolbar();
  const schemaSettingsProps = {
    dn,
    field,
    fieldSchema,
  };

  return (
    <SchemaSettingsDropdown
      title={
        <Button
          style={{
            borderColor: 'var(--colorSettings)',
            color: 'var(--colorSettings)',
            width: '100%',
          }}
          icon={<MenuOutlined />}
          type="dashed"
        >
          {t('Page configuration')}
        </Button>
      }
      {...schemaSettingsProps}
    >
      <SchemaSettingsSwitchItem
        checked={isHeaderEnabled}
        title={t('Enable Header')}
        onChange={async (v) => {
          if (!headerSchema) {
            await dn.insertAfterBegin({
              type: 'void',
              name: 'header',
              'x-component': 'MHeader',
              'x-designer': 'MHeader.Designer',
              'x-component-props': {
                title: fieldSchema.parent['x-component-props']?.name,
                showBack,
              },
            });
          }
          await onUpdateComponentProps({
            headerEnabled: v,
          });
        }}
      />
      <SchemaSettingsSwitchItem
        checked={isTabsEnabled}
        title={t('Enable Tabs')}
        onChange={async (v) => {
          if (!tabsSchema) {
            const gridSchema = findGridSchema(fieldSchema);
            await dn.remove(gridSchema);
            return dn.insertBeforeEnd({
              type: 'void',
              name: 'tabs',
              'x-component': 'Tabs',
              'x-component-props': {},
              'x-initializer': 'popup:addTab',
              'x-initializer-props': {
                gridInitializer: 'mobilePage:addBlock',
              },
              properties: {
                tab1: {
                  type: 'void',
                  title: generateNTemplate('Untitled'),
                  'x-component': 'Tabs.TabPane',
                  'x-designer': 'Tabs.Designer',
                  'x-component-props': {},
                  properties: {
                    grid: {
                      ...gridSchema,
                      'x-uid': uid(),
                    },
                  },
                },
              },
            });
          }

          await onUpdateComponentProps({
            tabsEnabled: v,
          });
        }}
      />
      <SchemaSettingsSwitchItem
        checked={fieldSchema['x-component-props']?.enableSharePage}
        title={t('Enable Share page')}
        onChange={async (v) => {
          fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
          fieldSchema['x-component-props']['enableSharePage'] = v;
          if (!fieldSchema.title) {
            fieldSchema.title = title;
          }
          dn.emit('patch', {
            schema: {
              ['x-uid']: fieldSchema['x-uid'],
              ['x-component-props']: fieldSchema['x-component-props'],
              title: fieldSchema.title,
            },
          });
          dn.refresh();
        }}
      />
    </SchemaSettingsDropdown>
  );
};
