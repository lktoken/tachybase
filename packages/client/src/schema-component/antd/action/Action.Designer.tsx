import React, { useCallback, useContext, useMemo, useState } from 'react';
import { ArrayTable } from '@tachybase/components';
import {
  Field,
  ISchema,
  isValid,
  onFieldValueChange,
  uid,
  useField,
  useFieldSchema,
  useForm,
  useFormEffects,
} from '@tachybase/schema';

import { Alert, Flex, ModalProps, Tag } from 'antd';
import { useTranslation } from 'react-i18next';

import { ActionContext, RemoteSelect, useCompile, useDesignable } from '../..';
import { useApp } from '../../../application';
import { withDynamicSchemaProps } from '../../../application/hoc/withDynamicSchemaProps';
import { usePlugin } from '../../../application/hooks';
import { SchemaSettingOptions, SchemaSettings } from '../../../application/schema-settings';
import { useSchemaToolbar } from '../../../application/schema-toolbar';
import { useFormBlockContext, useFormBlockType } from '../../../block-provider';
import {
  joinCollectionName,
  useCollection_deprecated,
  useCollectionFilterOptions,
  useCollectionManager_deprecated,
} from '../../../collection-manager';
import { DataSourceProvider, useCollection, useDataSourceKey } from '../../../data-source';
import { FlagProvider } from '../../../flag-provider';
import { SaveMode } from '../../../modules/actions/submit/createSubmitActionSettings';
import { useRecord } from '../../../record-provider';
import { SchemaSettingOpenModeSchemaItems } from '../../../schema-items';
import { FormFilterScope } from '../../../schema-settings/filter-form/FormFilterScope';
import { GeneralSchemaDesigner } from '../../../schema-settings/GeneralSchemaDesigner';
import { DefaultValueProvider } from '../../../schema-settings/hooks/useIsAllowToSetDefaultValue';
import {
  SchemaSettingsActionModalItem,
  SchemaSettingsDivider,
  SchemaSettingsEnableChildCollections,
  SchemaSettingsLinkageRules,
  SchemaSettingsModalItem,
  SchemaSettingsRemove,
  SchemaSettingsSwitchItem,
} from '../../../schema-settings/SchemaSettings';
import { useSchemaTemplateManager } from '../../../schema-templates';
import { useLocalVariables, useVariables } from '../../../variables';
import { useActionContext, useLinkageAction } from './hooks';
import { afterSuccessSchema, requestSettingsSchema } from './utils';

const MenuGroup = (props) => {
  return props.children;
};

export function ButtonEditor(props) {
  const field = useField();
  const fieldSchema = useFieldSchema();
  const { dn } = useDesignable();
  const { t } = useTranslation();
  const isLink = props?.isLink || fieldSchema['x-component'] === 'Action.Link';

  return (
    <SchemaSettingsModalItem
      title={t('Edit button')}
      schema={
        {
          type: 'object',
          title: t('Edit button'),
          properties: {
            title: {
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              title: t('Button title'),
              default: fieldSchema.title,
              'x-component-props': {},
              // description: `原字段标题：${collectionField?.uiSchema?.title}`,
            },
            icon: {
              'x-decorator': 'FormItem',
              'x-component': 'IconPicker',
              title: t('Button icon'),
              default: fieldSchema?.['x-component-props']?.icon,
              'x-component-props': {},
              'x-visible': !isLink,
              // description: `原字段标题：${collectionField?.uiSchema?.title}`,
            },
            type: {
              'x-decorator': 'FormItem',
              'x-component': 'Radio.Group',
              title: t('Button background color'),
              default: fieldSchema?.['x-component-props']?.danger
                ? 'danger'
                : fieldSchema?.['x-component-props']?.type === 'primary'
                  ? 'primary'
                  : 'default',
              enum: [
                { value: 'default', label: '{{t("Default")}}' },
                { value: 'primary', label: '{{t("Highlight")}}' },
                { value: 'danger', label: '{{t("Danger red")}}' },
              ],
              'x-visible': !isLink,
            },
          },
        } as ISchema
      }
      onSubmit={({ title, icon, type }) => {
        fieldSchema.title = title;
        field.title = title;
        field.componentProps.icon = icon;
        field.componentProps.danger = type === 'danger';
        field.componentProps.type = type || field.componentProps.type;
        fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
        fieldSchema['x-component-props'].icon = icon;
        fieldSchema['x-component-props'].danger = type === 'danger';
        fieldSchema['x-component-props'].type = type || field.componentProps.type;
        dn.emit('patch', {
          schema: {
            ['x-uid']: fieldSchema['x-uid'],
            title,
            'x-component-props': {
              ...fieldSchema['x-component-props'],
            },
          },
        });
        dn.refresh();
      }}
    />
  );
}

const findFormBlock = (schema) => {
  const formSchema = schema.reduceProperties((_, s) => {
    if (s['x-decorator'] === 'FormBlockProvider') {
      return s;
    } else {
      return findFormBlock(s);
    }
  }, null);
  return formSchema;
};

const getAllkeys = (data, result) => {
  for (let i = 0; i < data?.length; i++) {
    const { children, ...rest } = data[i];
    result.push(rest.key);
    if (children) {
      getAllkeys(children, result);
    }
  }
  return result;
};

export function AssignedFieldValues() {
  const { dn } = useDesignable();
  const { t } = useTranslation();
  const fieldSchema = useFieldSchema();
  const initialSchema = {
    type: 'void',
    'x-uid': uid(),
    'x-component': 'Grid',
    'x-initializer': 'assignFieldValuesForm:configureFields',
  };
  const tips = {
    'customize:update': t(
      'After clicking the custom button, the following fields of the current record will be saved according to the following form.',
    ),
    'customize:save': t(
      'After clicking the custom button, the following fields of the current record will be saved according to the following form.',
    ),
  };
  const actionType = fieldSchema['x-action'] ?? '';
  const onSubmit = useCallback(
    (assignedValues) => {
      fieldSchema['x-action-settings']['assignedValues'] = assignedValues;
      dn.emit('patch', {
        schema: {
          ['x-uid']: fieldSchema['x-uid'],
          'x-action-settings': fieldSchema['x-action-settings'],
        },
      });
    },
    [dn, fieldSchema],
  );
  return (
    <FlagProvider isInAssignFieldValues={true}>
      <DefaultValueProvider isAllowToSetDefaultValue={() => false}>
        <SchemaSettingsActionModalItem
          title={t('Assign field values')}
          // maskClosable={false}
          initialSchema={initialSchema}
          initialValues={fieldSchema?.['x-action-settings']?.assignedValues}
          modalTip={tips[actionType]}
          uid={fieldSchema?.['x-action-settings']?.schemaUid}
          onSubmit={onSubmit}
        />
      </DefaultValueProvider>
    </FlagProvider>
  );
}

export function RequestSettings() {
  const { dn } = useDesignable();
  const { t } = useTranslation();
  const fieldSchema = useFieldSchema();

  return (
    <SchemaSettingsActionModalItem
      title={t('Request settings')}
      schema={requestSettingsSchema}
      initialValues={fieldSchema?.['x-action-settings']?.requestSettings}
      onSubmit={(requestSettings) => {
        fieldSchema['x-action-settings']['requestSettings'] = requestSettings;
        dn.emit('patch', {
          schema: {
            ['x-uid']: fieldSchema['x-uid'],
            'x-action-settings': fieldSchema['x-action-settings'],
          },
        });
        dn.refresh();
      }}
    />
  );
}

export function SkipValidation() {
  const { dn } = useDesignable();
  const { t } = useTranslation();
  const fieldSchema = useFieldSchema();

  return (
    <SchemaSettingsSwitchItem
      title={t('Skip required validation')}
      checked={!!fieldSchema?.['x-action-settings']?.skipValidator}
      onChange={(value) => {
        fieldSchema['x-action-settings'].skipValidator = value;
        dn.emit('patch', {
          schema: {
            ['x-uid']: fieldSchema['x-uid'],
            'x-action-settings': {
              ...fieldSchema['x-action-settings'],
            },
          },
        });
      }}
    />
  );
}

export const findSchema = (schema) => {
  if (!schema) return;
  if (schema['x-decorator'] === 'ACLActionProvider') {
    return schema['x-component-props']?.openMode;
  }
  return findSchema(schema?.parent);
};

export function AfterSuccess() {
  const { dn } = useDesignable();
  const { t } = useTranslation();
  const fieldSchema = useFieldSchema();
  const ctx = useActionContext();
  const openMode = findSchema(ctx.fieldSchema);
  const component = fieldSchema.parent.parent['x-component'];
  const schema = { ...(afterSuccessSchema(t) as any) };
  if (
    ((!openMode || openMode === 'page') && (component as string).includes('Form')) ||
    !(component as string).includes('Form')
  ) {
    delete schema.properties.popupClose;
  }
  return (
    <SchemaSettingsModalItem
      title={t('After successful submission')}
      initialValues={fieldSchema?.['x-action-settings']?.['onSuccess']}
      schema={{ ...schema } as ISchema}
      onSubmit={(onSuccess) => {
        fieldSchema['x-action-settings']['onSuccess'] = onSuccess;
        dn.emit('patch', {
          schema: {
            ['x-uid']: fieldSchema['x-uid'],
            'x-action-settings': fieldSchema['x-action-settings'],
          },
        });
      }}
    />
  );
}
export function RemoveButton(
  props: {
    onConfirmOk?: ModalProps['onOk'];
  } = {},
) {
  const { t } = useTranslation();
  const fieldSchema = useFieldSchema();
  const isDeletable = fieldSchema?.parent['x-component'] === 'CollectionField';
  return (
    !isDeletable && (
      <>
        <SchemaSettingsDivider />
        <SchemaSettingsRemove
          removeParentsIfNoChildren
          breakRemoveOn={(s) => {
            return s['x-component'] === 'Space' || s['x-component'].endsWith('ActionBar');
          }}
          confirm={{
            title: t('Delete action'),
            onOk: props.onConfirmOk,
          }}
        />
      </>
    )
  );
}

function WorkflowSelectComponent({
  formAction,
  buttonAction,
  actionType,
  direct = false,
  noCollection = false,
  ...props
}) {
  const { t } = useTranslation();
  const index = ArrayTable.useIndex();
  const { setValuesIn } = useForm();
  const baseCollection = useCollection_deprecated();
  const { getCollection } = useCollectionManager_deprecated();
  const dataSourceKey = useDataSourceKey();
  const [workflowCollection, setWorkflowCollection] = useState(joinCollectionName(dataSourceKey, baseCollection.name));
  const compile = useCompile();

  const workflowPlugin = usePlugin('workflow') as any;
  const workflowTypes = useMemo(
    () =>
      workflowPlugin
        .getTriggersOptions()
        .filter((item) => {
          return typeof item.options.isActionTriggerable === 'function' || item.options.isActionTriggerable === true;
        })
        .map((item) => item.value),
    [workflowPlugin],
  );

  useFormEffects(() => {
    onFieldValueChange(`group[${index}].context`, (field) => {
      let collection: any = baseCollection;
      if (field.value) {
        const paths = field.value.split('.');
        for (let i = 0; i < paths.length && collection; i++) {
          const path = paths[i];
          const associationField = collection.fields.find((f) => f.name === path);
          if (associationField) {
            collection = getCollection(associationField.target, dataSourceKey);
          }
        }
      }
      setWorkflowCollection(joinCollectionName(dataSourceKey, collection.name));
      setValuesIn(`group[${index}].workflowKey`, null);
    });
  });

  const optionFilter = useCallback(
    ({ key, type, config }) => {
      if (key === props.value) {
        return true;
      }
      const trigger = workflowPlugin.triggers.get(type);
      if (trigger.isActionTriggerable === true) {
        return true;
      }
      if (typeof trigger.isActionTriggerable === 'function') {
        return trigger.isActionTriggerable(config, {
          action: actionType,
          formAction,
          buttonAction,
          /**
           * @deprecated
           */
          direct: buttonAction === 'customize:triggerWorkflows',
        });
      }
      return false;
    },
    [props.value, workflowPlugin.triggers, actionType, formAction, buttonAction],
  );

  return (
    <DataSourceProvider dataSource="main">
      <RemoteSelect
        manual={false}
        placeholder={t('Select workflow', { ns: 'workflow' })}
        fieldNames={{
          label: 'title',
          value: 'key',
        }}
        service={{
          resource: 'workflows',
          action: 'list',
          params: {
            filter: {
              type: props.filterType === undefined ? undefined : props.filterType,
              enabled: props.filterEnabled === undefined ? true : props.filterEnabled,
              'config.collection': noCollection ? undefined : workflowCollection,
              sync: props.filterSync === undefined ? undefined : props.filterSync,
              key: props.filterKey === undefined ? undefined : props.filterKey,
            },
            sort: ['-updatedAt'],
          },
        }}
        optionFilter={optionFilter}
        optionRender={({ label, data }) => {
          const typeOption = workflowPlugin.getTriggersOptions().find((item) => item.value === data.type);
          return typeOption ? (
            <Flex justify="space-between">
              <span>{label}</span>
              <Tag color={typeOption.color}>{compile(typeOption.label)}</Tag>
            </Flex>
          ) : (
            label
          );
        }}
        {...props}
      />
    </DataSourceProvider>
  );
}

export const WorkflowSelect = withDynamicSchemaProps(WorkflowSelectComponent);

export function WorkflowConfig() {
  const { dn } = useDesignable();
  const { t } = useTranslation();
  const fieldSchema = useFieldSchema();
  const collection = useCollection_deprecated();
  // TODO(refactor): should refactor for getting certain action type, better from 'x-action'.
  const formBlock = useFormBlockContext();
  const actionType = formBlock?.type || fieldSchema['x-action'];
  const formAction = formBlock?.type;
  const buttonAction = fieldSchema['x-action'];

  const description = {
    submit: t('Workflow will be triggered before or after submitting succeeded.', {
      ns: 'workflow',
    }),
    'customize:save': t('Workflow will be triggered before or after submitting succeeded.', {
      ns: 'workflow',
    }),
    'customize:triggerWorkflows': t(
      'Workflow will be triggered directly once the button clicked, without data saving.',
      { ns: 'workflow' },
    ),
    destroy: t('Workflow will be triggered before or after submitting succeeded.', { ns: 'workflow' }),
  }[fieldSchema?.['x-action']];

  let orderColumn = {};
  // 暂定删除也可以指定顺序
  if (['submit', 'customize:save', 'destroy'].includes(fieldSchema?.['x-action'])) {
    orderColumn = {
      order: {
        type: 'void',
        'x-component': 'ArrayTable.Column',
        'x-component-props': {
          title: t('Sequentially', { ns: 'workflow' }),
        },
        properties: {
          order: {
            type: 'string',
            'x-decorator': 'FormItem',
            'x-component': 'Select',
            default: 'after',
            enum: [
              { label: t('After'), value: 'after' },
              { label: t('Before'), value: 'before' },
            ],
          },
        },
      },
    };
  }

  return (
    <SchemaSettingsActionModalItem
      title={t('Bind workflows', { ns: 'workflow' })}
      scope={{
        fieldFilter(field) {
          return ['belongsTo', 'hasOne'].includes(field.type);
        },
      }}
      components={{
        Alert,
        ArrayTable,
        WorkflowSelect,
      }}
      schema={
        {
          type: 'void',
          title: t('Bind workflows', { ns: 'workflow' }),
          properties: {
            description: description && {
              type: 'void',
              'x-component': 'Alert',
              'x-component-props': {
                message: description,
                style: {
                  marginBottom: '1em',
                },
              },
            },
            group: {
              type: 'array',
              'x-component': 'ArrayTable',
              'x-decorator': 'FormItem',
              items: {
                type: 'object',
                properties: {
                  context: {
                    type: 'void',
                    'x-component': 'ArrayTable.Column',
                    'x-component-props': {
                      title: t('Trigger data context', { ns: 'workflow' }),
                      width: 200,
                    },
                    properties: {
                      context: {
                        type: 'string',
                        'x-decorator': 'FormItem',
                        'x-component': 'AppendsTreeSelect',
                        'x-component-props': {
                          placeholder: t('Select context', { ns: 'workflow' }),
                          popupMatchSelectWidth: false,
                          collection: `${
                            collection.dataSource && collection.dataSource !== 'main' ? `${collection.dataSource}:` : ''
                          }${collection.name}`,
                          filter: '{{ fieldFilter }}',
                          rootOption: {
                            label: t('Full form data', { ns: 'workflow' }),
                            value: '',
                          },
                          allowClear: false,
                          loadData: buttonAction === 'destroy' ? null : undefined,
                        },
                        default: '',
                      },
                    },
                  },
                  workflowKey: {
                    type: 'void',
                    'x-component': 'ArrayTable.Column',
                    'x-component-props': {
                      title: t('Workflow', { ns: 'workflow' }),
                    },
                    properties: {
                      workflowKey: {
                        type: 'number',
                        'x-decorator': 'FormItem',
                        'x-component': 'WorkflowSelect',
                        'x-component-props': {
                          placeholder: t('Select workflow', { ns: 'workflow' }),
                          actionType,
                          formAction,
                          buttonAction,
                          direct: fieldSchema['x-action'] === 'customize:triggerWorkflows',
                        },
                        required: true,
                      },
                    },
                  },
                  ...orderColumn,
                  operations: {
                    type: 'void',
                    'x-component': 'ArrayTable.Column',
                    'x-component-props': {
                      width: 32,
                    },
                    properties: {
                      remove: {
                        type: 'void',
                        'x-component': 'ArrayTable.Remove',
                      },
                    },
                  },
                },
              },
              properties: {
                add: {
                  type: 'void',
                  title: t('Add workflow', { ns: 'workflow' }),
                  'x-component': 'ArrayTable.Addition',
                },
              },
            },
          },
        } as ISchema
      }
      initialValues={{ group: fieldSchema?.['x-action-settings']?.triggerWorkflows }}
      onSubmit={({ group }) => {
        fieldSchema['x-action-settings']['triggerWorkflows'] = group;
        dn.emit('patch', {
          schema: {
            ['x-uid']: fieldSchema['x-uid'],
            'x-action-settings': fieldSchema['x-action-settings'],
          },
        });
      }}
    />
  );
}

const findGridSchema = (fieldSchema) => {
  return fieldSchema.reduceProperties((buf, s) => {
    if (s['x-component'] === 'FormV2') {
      const f = s.reduceProperties((buf, s) => {
        if (s['x-component'] === 'Grid' || s['x-component'] === 'BlockTemplate') {
          return s;
        }
        return buf;
      }, null);
      if (f) {
        return f;
      }
    }
    return buf;
  }, null);
};

export const useSetFilterScopeVisible = () => {
  const fieldSchema = useFieldSchema();
  return (
    fieldSchema['x-component-props']?.useProps === '{{ useFilterBlockActionProps }}' ||
    fieldSchema['x-use-component-props'] === 'useFilterBlockActionProps'
  );
};

export const SetFilterScope = (props) => {
  const { t } = useTranslation();
  const fieldSchema = useFieldSchema();
  const { collectionName } = props;
  const gridSchema = findGridSchema(fieldSchema) || fieldSchema;
  const { form } = useFormBlockContext();
  const type = props?.type || ['Action', 'Action.Link'].includes(fieldSchema['x-component']) ? 'button' : 'field';
  const variables = useVariables();
  const localVariables = useLocalVariables();
  const record = useRecord();
  const { type: formBlockType } = useFormBlockType();
  const schema = useMemo<ISchema>(
    () => ({
      type: 'object',
      title: t('Custom filter'),
      properties: {
        fieldReaction: {
          'x-component': FormFilterScope,
          'x-component-props': {
            useProps: () => {
              const options = useCollectionFilterOptions(collectionName);
              return {
                options,
                defaultValues: gridSchema?.['x-filter-rules'] || fieldSchema?.['x-filter-rules'],
                type,
                collectionName,
                form,
                variables,
                localVariables,
                record,
                formBlockType,
              };
            },
          },
        },
      },
    }),
    [],
  );
  const { getTemplateById } = useSchemaTemplateManager();
  const { dn } = useDesignable();
  const onSubmit = useCallback(
    (v) => {
      const rules = v.fieldReaction.condition;
      const templateId = gridSchema['x-component'] === 'BlockTemplate' && gridSchema['x-component-props'].templateId;
      const uid = (templateId && getTemplateById(templateId).uid) || gridSchema['x-uid'];
      const schema = {
        ['x-uid']: uid,
      };

      gridSchema['x-filter-rules'] = rules;
      schema['x-filter-rules'] = rules;
      dn.emit('patch', {
        schema,
      });
      dn.refresh();
    },
    [dn, getTemplateById, gridSchema],
  );
  return <SchemaSettingsModalItem title={t('Custom filter')} width={770} schema={schema} onSubmit={onSubmit} />;
};

export const actionSettingsItems: SchemaSettingOptions['items'] = [
  {
    name: 'Customize',
    Component: MenuGroup,
    children: [
      {
        name: 'editButton',
        Component: ButtonEditor,
        useComponentProps() {
          const { buttonEditorProps } = useSchemaToolbar();
          return buttonEditorProps;
        },
      },
      {
        name: 'linkageRules',
        Component: (props) => {
          return <SchemaSettingsLinkageRules {...props} />;
        },
        useVisible() {
          const isAction = useLinkageAction();
          const { linkageAction } = useSchemaToolbar();
          return linkageAction || isAction;
        },
        useComponentProps() {
          const { name } = useCollection_deprecated();
          const { linkageRulesProps } = useSchemaToolbar();
          return {
            ...linkageRulesProps,
            collectionName: name,
          };
        },
      },
      {
        name: 'openMode',
        Component: SchemaSettingOpenModeSchemaItems,
        useComponentProps() {
          const fieldSchema = useFieldSchema();
          const isPopupAction = [
            'create',
            'update',
            'view',
            'customize:popup',
            'duplicate',
            'customize:create',
          ].includes(fieldSchema['x-action'] || '');

          return {
            openMode: isPopupAction,
            openSize: isPopupAction,
          };
        },
      },
      {
        name: 'secondConFirm',
        Component: SecondConFirm,
        useVisible() {
          const fieldSchema = useFieldSchema();
          const isPopupAction = [
            'create',
            'update',
            'view',
            'customize:popup',
            'duplicate',
            'customize:create',
          ].includes(fieldSchema['x-action'] || '');
          return !isPopupAction;
        },
      },
      {
        name: 'assignFieldValues',
        Component: AssignedFieldValues,
        useVisible() {
          const fieldSchema = useFieldSchema();
          return isValid(fieldSchema?.['x-action-settings']?.assignedValues);
        },
      },
      {
        name: 'requestSettings',
        Component: RequestSettings,
        useVisible() {
          const fieldSchema = useFieldSchema();
          return isValid(fieldSchema?.['x-action-settings']?.requestSettings);
        },
      },
      {
        name: 'skipValidator',
        Component: SkipValidation,
        useVisible() {
          const fieldSchema = useFieldSchema();
          return isValid(fieldSchema?.['x-action-settings']?.skipValidator);
        },
      },
      {
        name: 'afterSuccess',
        Component: AfterSuccess,
        useVisible() {
          const fieldSchema = useFieldSchema();
          return isValid(fieldSchema?.['x-action-settings']?.onSuccess);
        },
      },
      {
        name: 'workflowConfig',
        Component: WorkflowConfig,
        useVisible() {
          const fieldSchema = useFieldSchema();
          return isValid(fieldSchema?.['x-action-settings']?.triggerWorkflows);
        },
      },
      {
        name: 'saveMode',
        Component: SaveMode,
        useVisible() {
          const fieldSchema = useFieldSchema();
          return (
            fieldSchema['x-action'] === 'submit' &&
            fieldSchema.parent?.['x-initializer'] === 'createForm:configureActions'
          );
        },
      },
      {
        name: 'enableChildCollections',
        Component: SchemaSettingsEnableChildCollections,
        useVisible() {
          const fieldSchema = useFieldSchema();
          const { name } = useCollection_deprecated();
          const { getChildrenCollections } = useCollectionManager_deprecated();
          const isChildCollectionAction =
            getChildrenCollections(name).length > 0 && fieldSchema['x-action'] === 'create';
          return isChildCollectionAction;
        },
        useComponentProps() {
          const { name } = useCollection_deprecated();
          return {
            collectionName: name,
          };
        },
      },
      {
        name: 'Customize.setFilterScope',
        Component: SetFilterScope,
        useVisible: useSetFilterScopeVisible,
        useComponentProps() {
          const collection = useCollection();
          return {
            collectionName: collection.name,
          };
        },
      },
      {
        name: 'remove',
        sort: 100,
        Component: RemoveButton as any,
        useComponentProps() {
          const { removeButtonProps } = useSchemaToolbar();
          return removeButtonProps;
        },
        useVisible() {
          const fieldSchema = useFieldSchema();
          return fieldSchema?.['x-action-settings']?.removable !== false;
        },
      },
    ],
  },
];
export function SecondConFirm() {
  const { dn } = useDesignable();
  const fieldSchema = useFieldSchema();
  const { t } = useTranslation();
  const field = useField<Field>();

  return (
    <SchemaSettingsSwitchItem
      title={t('Secondary confirmation')}
      checked={!!fieldSchema?.['x-component-props']?.confirm?.content}
      onChange={(value) => {
        if (!fieldSchema['x-component-props']) {
          fieldSchema['x-component-props'] = {};
        }
        if (value) {
          fieldSchema['x-component-props'].confirm = value
            ? {
                title: 'Perform the {{title}}',
                content: 'Are you sure you want to perform the {{title}} action?',
              }
            : {};
        } else {
          fieldSchema['x-component-props'].confirm = {};
        }
        field.componentProps.confirm = { ...fieldSchema['x-component-props']?.confirm };

        dn.emit('patch', {
          schema: {
            ['x-uid']: fieldSchema['x-uid'],
            'x-component-props': { ...fieldSchema['x-component-props'] },
          },
        });
      }}
    />
  );
}
export function IsDownLoad() {
  const { dn } = useDesignable();
  const fieldSchema = useFieldSchema();
  const { t } = useTranslation();

  return (
    <SchemaSettingsSwitchItem
      title={t('Is DownLoad')}
      checked={!!fieldSchema?.['x-action-settings']?.onSuccess?.down}
      onChange={(value) => {
        if (!fieldSchema?.['x-action-settings']?.onSuccess) {
          fieldSchema['x-action-settings'] = {
            ...fieldSchema?.['x-action-settings'],
            onSuccess: {
              down: false,
            },
          };
        }
        fieldSchema['x-action-settings'].onSuccess.down = value;

        dn.emit('patch', {
          schema: {
            ['x-uid']: fieldSchema['x-uid'],
            'x-action-settings': { ...fieldSchema['x-action-settings'] },
          },
        });
      }}
    />
  );
}
export function ShowData() {
  const { dn } = useDesignable();
  const fieldSchema = useFieldSchema();
  const { t } = useTranslation();
  const field = useField();
  return (
    <SchemaSettingsSwitchItem
      title={t('Show Data')}
      checked={!!fieldSchema?.['x-component-props']?.showData}
      onChange={(value) => {
        if (!fieldSchema?.['x-component-props']) {
          fieldSchema['x-component-props'] = { showData: false };
        }
        fieldSchema['x-component-props'].showData = value;
        field.componentProps = fieldSchema['x-component-props'];
        dn.emit('patch', {
          schema: {
            ['x-uid']: fieldSchema['x-uid'],
            'x-component-props': { ...fieldSchema['x-component-props'] },
          },
        });
      }}
    />
  );
}

export function SettingDownTitle() {
  const fieldSchema = useFieldSchema();
  const { dn } = useDesignable();
  const { t } = useTranslation();
  return (
    <SchemaSettingsModalItem
      title={t('Setting Down Title')}
      onSubmit={({ title }) => {
        if (!fieldSchema?.['x-action-settings']) {
          fieldSchema['x-action-settings'] = {
            onSussess: {
              downTitle: title,
            },
          };
        } else {
          fieldSchema['x-action-settings']['onSuccess'] = {
            ...fieldSchema['x-action-settings']?.['onSuccess'],
            downTitle: title,
          };
        }
        dn.emit('patch', {
          schema: {
            ['x-uid']: fieldSchema['x-uid'],
            'x-action-settings': { ...fieldSchema['x-action-settings'] },
          },
        });
      }}
      schema={{
        type: 'item',
        title: t('Setting Down Title'),
        properties: {
          title: {
            'x-component': 'Input',
            default: fieldSchema['x-action-settings']?.['onSuccess']?.downTitle || 'document.docx',
          },
        },
      }}
    />
  );
}

/**
 * @deprecated
 */
export const actionSettings = new SchemaSettings({
  name: 'ActionSettings',
  items: actionSettingsItems,
});

export const ActionDesigner = (props) => {
  const {
    modalTip,
    linkageAction,
    removeButtonProps,
    buttonEditorProps,
    linkageRulesProps,
    schemaSettings,
    ...restProps
  } = props;
  const app = useApp();
  const fieldSchema = useFieldSchema();
  const isDraggable = fieldSchema?.parent['x-component'] !== 'CollectionField';
  const settingsName = `ActionSettings:${fieldSchema['x-action']}`;
  const defaultActionSettings = schemaSettings || 'ActionSettings';
  const hasAction = app.schemaSettingsManager.has(settingsName);

  return (
    <GeneralSchemaDesigner
      schemaSettings={hasAction ? settingsName : defaultActionSettings}
      contextValue={{ modalTip, linkageAction, removeButtonProps, buttonEditorProps, linkageRulesProps }}
      {...restProps}
      disableInitializer
      draggable={isDraggable}
    ></GeneralSchemaDesigner>
  );
};

ActionDesigner.ButtonEditor = ButtonEditor;
ActionDesigner.RemoveButton = RemoveButton;
