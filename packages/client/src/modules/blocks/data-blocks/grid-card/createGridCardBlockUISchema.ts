import { ISchema } from '@tachybase/schema';

export const createGridCardBlockUISchema = (options: {
  dataSource: string;
  collectionName?: string;
  association?: string;
  templateSchema?: ISchema;
  rowKey?: string;
}): ISchema => {
  const { collectionName, association, templateSchema, dataSource, rowKey } = options;
  const resourceName = association || collectionName;

  if (!dataSource) {
    throw new Error('dataSource are required');
  }

  return {
    type: 'void',
    'x-acl-action': `${resourceName}:view`,
    'x-decorator': 'GridCard.Decorator',
    'x-use-decorator-props': 'useGridCardBlockDecoratorProps',
    'x-decorator-props': {
      collection: collectionName,
      association,
      dataSource,
      readPretty: true,
      action: 'list',
      params: {
        pageSize: 12,
      },
      runWhenParamsChanged: true,
      rowKey,
      isLinkable: false,
      needInfiniteScroll: false,
      layoutDirection: 'column',
    },
    'x-component': 'BlockItem',
    'x-use-component-props': 'useGridCardBlockItemProps',
    'x-toolbar': 'BlockSchemaToolbar',
    'x-settings': 'blockSettings:gridCard',
    properties: {
      actionBar: {
        type: 'void',
        'x-initializer': 'gridCard:configureActions',
        'x-component': 'ActionBar',
        'x-component-props': {
          style: {
            marginBottom: 'var(--tb-spacing)',
          },
        },
      },
      list: {
        type: 'array',
        'x-component': 'GridCard',
        'x-use-component-props': 'useGridCardBlockProps',
        properties: {
          item: {
            type: 'object',
            'x-component': 'GridCard.Item',
            'x-read-pretty': true,
            'x-use-component-props': 'useGridCardItemProps',
            properties: {
              grid: templateSchema || {
                type: 'void',
                'x-component': 'Grid',
                'x-initializer': 'details:configureFields',
              },
              actionBar: {
                type: 'void',
                'x-align': 'left',
                'x-initializer': 'gridCard:configureItemActions',
                'x-component': 'ActionBar',
                'x-use-component-props': 'useGridCardActionBarProps',
                'x-component-props': {
                  layout: 'one-column',
                },
              },
            },
          },
        },
      },
    },
  };
};
