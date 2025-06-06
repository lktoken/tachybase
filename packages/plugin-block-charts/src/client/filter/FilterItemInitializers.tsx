import React, { memo, useCallback, useContext, useMemo } from 'react';
import {
  ACLCollectionFieldProvider,
  BlockItem,
  CollectionFieldProvider,
  CollectionManagerProvider,
  CollectionProvider,
  css,
  cx,
  DEFAULT_DATA_SOURCE_KEY,
  FormDialog,
  gridRowColWrap,
  HTMLEncode,
  SchemaComponent,
  SchemaComponentOptions,
  SchemaInitializer,
  SchemaInitializerItem,
  useCollectionManager_deprecated,
  useCompile,
  useDataSourceManager,
  useDesignable,
  useGlobalTheme,
  useSchemaInitializerItem,
} from '@tachybase/client';
import { FormItem, FormLayout } from '@tachybase/components';
import {
  Field,
  observer,
  onFieldValueChange,
  Schema,
  SchemaOptionsContext,
  uid,
  useField,
  useFieldSchema,
  useForm,
} from '@tachybase/schema';

import { useMemoizedFn } from 'ahooks';
import { Alert, ConfigProvider, Typography } from 'antd';
import { ErrorBoundary } from 'react-error-boundary';

import { useChartData, useChartFilter, useChartFilterSourceFields, useFieldComponents } from '../hooks/filter';
import { lang, useChartsTranslation } from '../locale';
import { getPropsSchemaByComponent } from './utils';

const { Paragraph, Text } = Typography;

const FieldComponentProps: React.FC = observer(
  (props) => {
    const form = useForm();
    const schema = getPropsSchemaByComponent(form.values.component, props['allCollection']);
    return schema ? <SchemaComponent schema={schema} {...props} /> : null;
  },
  { displayName: 'FieldComponentProps' },
);

const ErrorFallback = ({ error }) => {
  return (
    <Paragraph copyable>
      <Text type="danger" style={{ whiteSpace: 'pre-line', textAlign: 'center', padding: '5px' }}>
        {error.message}
      </Text>
    </Paragraph>
  );
};

export const ChartFilterFormItem = observer(
  (props: any) => {
    const { t } = useChartsTranslation();
    const field = useField<Field>();
    const schema = useFieldSchema();
    const showTitle = schema['x-decorator-props']?.showTitle ?? true;
    const extra = useMemo(() => {
      return typeof field.description === 'string' ? (
        <div
          dangerouslySetInnerHTML={{
            __html: HTMLEncode(field.description).split('\n').join('<br/>'),
          }}
        />
      ) : (
        field.description
      );
    }, [field.description]);
    const className = useMemo(() => {
      return cx(
        css`
          & .ant-space {
            flex-wrap: wrap;
          }
        `,
        {
          [css`
            > .ant-formily-item-label {
              display: none;
            }
          `]: showTitle === false,
        },
      );
    }, [showTitle]);
    const dataSource = schema?.['x-data-source'] || DEFAULT_DATA_SOURCE_KEY;
    const collectionField = schema?.['x-collection-field'] || '';
    const [collection] = collectionField.split('.');
    // const { getIsChartCollectionExists } = useChartData();
    // const exists = (schema.name as string).startsWith('custom.') || getIsChartCollectionExists(dataSource, collection);
    return (
      <BlockItem className={'tb-form-item'}>
        <CollectionManagerProvider dataSource={dataSource}>
          <CollectionProvider name={collection} allowNull={!collection}>
            <CollectionFieldProvider name={schema.name} allowNull={!schema['x-collection-field']}>
              <ACLCollectionFieldProvider>
                {/* {exists ? ( */}
                <ErrorBoundary
                  onError={(err) => {
                    console.log(err);
                    window?.Sentry?.captureException(err);
                  }}
                  FallbackComponent={ErrorFallback}
                >
                  <FormItem className={className} {...props} extra={extra} />
                </ErrorBoundary>
                {/* ) : ( */}
                {/*   <div style={{ color: '#ccc', marginBottom: '10px' }}> */}
                {/*     {t('The chart using the collection of this field have been deleted. Please  remove this field.')} */}
                {/*   </div> */}
                {/* )} */}
              </ACLCollectionFieldProvider>
            </CollectionFieldProvider>
          </CollectionProvider>
        </CollectionManagerProvider>
      </BlockItem>
    );
  },
  { displayName: 'ChartFilterFormItem' },
);

export const ChartFilterCustomItemInitializer: React.FC<{
  insert?: any;
}> = memo((props) => {
  const { locale } = useContext(ConfigProvider.ConfigContext);
  const { t: lang } = useChartsTranslation();
  const t = useMemoizedFn(lang);
  const { scope, components } = useContext(SchemaOptionsContext);
  const { theme } = useGlobalTheme();
  const { insert } = props;
  const itemConfig = useSchemaInitializerItem();
  const dm = useDataSourceManager();
  const sourceFields = useChartFilterSourceFields();
  const { options: fieldComponents, values: fieldComponentValues } = useFieldComponents();
  const { collections, getCollectionFields } = useCollectionManager_deprecated();
  const compile = useCompile();
  const allCollection = collections.map((collection) => {
    return {
      label: collection.getOption('title'),
      value: collection.getOption('name'),
    };
  });
  const handleClick = useCallback(async () => {
    const values = await FormDialog(
      t('Add custom field'),
      () => (
        <SchemaComponentOptions
          scope={{
            ...scope,
            useChartFilterSourceFields,
            useCollectionField(collection) {
              return getCollectionFields(collection)?.map((field) => {
                return {
                  label: compile(field.uiSchema.title),
                  value: field.name,
                };
              });
            },
          }}
          components={{ ...components, FieldComponentProps }}
        >
          <FormLayout layout={'vertical'}>
            <Alert
              type="info"
              message={t('To filter with custom fields, use "Current filter" variables in the chart configuration.')}
              style={{ marginBottom: 16 }}
            />
            <ConfigProvider locale={locale}>
              <SchemaComponent
                schema={{
                  properties: {
                    name: {
                      type: 'string',
                      required: true,
                    },
                    title: {
                      type: 'string',
                      title: t('Field title'),
                      'x-component': 'Input',
                      'x-decorator': 'FormItem',
                      required: true,
                    },
                    source: {
                      type: 'string',
                      title: t('Field source'),
                      'x-decorator': 'FormItem',
                      'x-component': 'Cascader',
                      enum: sourceFields,
                      description: t('Select a source field to use metadata of the field'),
                    },
                    component: {
                      type: 'string',
                      title: t('Field component'),
                      'x-component': 'Select',
                      'x-decorator': 'FormItem',
                      required: true,
                      enum: fieldComponents,
                    },
                    props: {
                      type: 'object',
                      title: t('Component properties'),
                      'x-component': 'FieldComponentProps',
                      'x-component-props': {
                        allCollection,
                      },
                    },
                  },
                }}
              />
            </ConfigProvider>
          </FormLayout>
        </SchemaComponentOptions>
      ),
      theme,
    ).open({
      values: {
        name: `f_${uid()}`,
      },
      effects() {
        onFieldValueChange('source', (field) => {
          if (!field.value) {
            return;
          }
          const [dataSource, ...fields] = field.value;
          const ds = dm.getDataSource(dataSource);
          if (!ds) {
            return;
          }
          const cm = ds.collectionManager;
          const name = fields.join('.');
          const props = cm.getCollectionField(name);
          if (!props) {
            return;
          }
          const uiSchema = props.uiSchema || {};
          let fieldComponent: string;
          if (fieldComponentValues.includes(uiSchema['x-component'])) {
            fieldComponent = uiSchema['x-component'];
            const fieldComponentProps = uiSchema['x-component-props'] || {};
            if (uiSchema.enum) {
              fieldComponentProps.options = uiSchema.enum;
            }
            const componentProps = field.query('.props').take() as Field;
            componentProps.setValue(fieldComponentProps);
          } else if (fieldComponentValues.includes(props.interface)) {
            fieldComponent = props.interface;
          }
          if (!fieldComponent) {
            return;
          }
          const component = field.query('.component').take() as Field;
          component.setValue(fieldComponent);
        });
      },
    });
    const { name, title, component, props } = values;
    const fim = dm.collectionFieldInterfaceManager;
    const defaultSchema = fim.getFieldInterface(component)?.default?.uiSchema || {};
    insert(
      gridRowColWrap({
        'x-component': component,
        ...defaultSchema,
        type: 'string',
        title: title,
        name: `custom.${name}`,
        required: false,
        'x-designer': 'ChartFilterItemDesigner',
        'x-decorator': 'ChartFilterFormItem',
        'x-component-props': {
          ...defaultSchema['x-component-props'],
          ...props,
          chartCascader: true,
        },
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);
  return <SchemaInitializerItem {...itemConfig} {...props} onClick={handleClick} />;
});
ChartFilterCustomItemInitializer.displayName = 'ChartFilterCustomItemInitializer';

const filterItemInitializers = {
  name: 'chartFilterForm:configureFields',
  'data-testid': 'configure-fields-button-of-chart-filter-item',
  wrap: gridRowColWrap,
  icon: 'SettingOutlined',
  title: '{{ t("Configure fields") }}',
  items: [
    {
      type: 'itemGroup',
      name: 'displayFields',
      title: '{{ t("Display fields") }}',
      useChildren: () => {
        const { t } = useChartsTranslation();
        const { chartCollections, showDataSource } = useChartData();
        const { getChartFilterFields } = useChartFilter();
        const dm = useDataSourceManager();
        const fim = dm.collectionFieldInterfaceManager;

        return useMemo(() => {
          const options = Object.entries(chartCollections).map(([dataSource, collections]) => {
            const ds = dm.getDataSource(dataSource);
            return {
              name: ds.key,
              title: Schema.compile(ds.displayName, { t }),
              type: 'subMenu',
              children: collections.map((name) => {
                const cm = ds.collectionManager;
                const collection = cm.getCollection(name);
                const fields = getChartFilterFields({ dataSource, collection, cm, fim });
                return {
                  name: collection.key,
                  title: Schema.compile(collection.title, { t }),
                  type: 'subMenu',
                  children: fields,
                };
              }),
            };
          });
          return showDataSource ? options : options[0]?.children || [];
        }, [chartCollections, showDataSource]);
      },
    },
    {
      name: 'divider',
      type: 'divider',
    },
    {
      name: 'custom',
      type: 'item',
      title: lang('Custom'),
      Component: () => {
        const { insertAdjacent } = useDesignable();
        return <ChartFilterCustomItemInitializer insert={(s: Schema) => insertAdjacent('beforeEnd', s)} />;
      },
    },
  ],
};

export const chartFilterItemInitializers = new SchemaInitializer(filterItemInitializers);
