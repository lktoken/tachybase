import { SchemaInitializer } from '../../../../application/schema-initializer/SchemaInitializer';
import { useOptionalFieldList } from '../../../../block-provider/hooks';
import { useCollectionManager } from '../../../../data-source';
import { useAssociatedFields } from '../../../../filter-provider/utils';

/**
 * @deprecated
 */
export const associationFilterFilterBlockInitializer = new SchemaInitializer({
  name: 'AssociationFilter.FilterBlockInitializer',
  style: { marginTop: 16 },
  icon: 'SettingOutlined',
  title: '{{t("Configure fields")}}',
  items: [
    {
      type: 'itemGroup',
      name: 'associationFields',
      title: '{{t("Association fields")}}',
      useChildren() {
        const associatedFields = useAssociatedFields();
        const children = associatedFields.map((field) => ({
          name: field.key,
          title: field.uiSchema?.title,
          Component: 'AssociationFilterDesignerDisplayField',
          schema: {
            name: field.name,
            title: field.uiSchema?.title,
            type: 'void',
            'x-toolbar': 'CollapseItemSchemaToolbar',
            'x-settings': 'fieldSettings:FilterCollapseItem',
            'x-component': 'AssociationFilter.Item',
            'x-use-component-props': 'useAssociationFilterBlockProps',
            'x-component-props': {
              fieldNames: {
                label: field.targetKey || 'id',
              },
            },
            properties: {},
          },
        }));
        return children;
      },
    },
    {
      name: 'choicesFields',
      type: 'itemGroup',
      title: '{{t("Choices fields")}}',
      hideIfNoChildren: true,
      useChildren() {
        const optionalList = useOptionalFieldList();
        const useProps = '{{useAssociationFilterBlockProps}}';
        const optionalChildren = optionalList.map((field) => ({
          name: field.key,
          title: field.uiSchema.title,
          Component: 'AssociationFilterDesignerDisplayField',
          schema: {
            name: field.name,
            title: field.uiSchema.title,
            interface: field.interface,
            type: 'void',
            'x-toolbar': 'CollapseItemSchemaToolbar',
            'x-settings': 'fieldSettings:FilterCollapseItem',
            'x-component': 'AssociationFilter.Item',
            'x-component-props': {
              fieldNames: {
                label: field.name,
              },
              useProps,
            },
            properties: {},
          },
        }));

        return optionalChildren;
      },
    },
  ],
});

export const filterCollapseItemInitializer = new SchemaInitializer({
  name: 'filterCollapse:configureFields',
  style: { marginTop: 16 },
  icon: 'SettingOutlined',
  title: '{{t("Configure fields")}}',
  items: [
    {
      type: 'itemGroup',
      name: 'associationFields',
      title: '{{t("Association fields")}}',
      useChildren() {
        const associatedFields = useAssociatedFields();
        const cm = useCollectionManager();
        const children = associatedFields.map((field) => ({
          name: field.key,
          title: field.uiSchema?.title,
          Component: 'AssociationFilterDesignerDisplayField',
          schema: {
            name: field.name,
            title: field.uiSchema?.title,
            type: 'void',
            'x-toolbar': 'CollapseItemSchemaToolbar',
            'x-settings': 'fieldSettings:FilterCollapseItem',
            'x-component': 'AssociationFilter.Item',
            'x-use-component-props': 'useAssociationFilterBlockProps',
            'x-component-props': {
              fieldNames: {
                label: cm.getCollection(field.target)?.getPrimaryKey() || 'id',
              },
            },
            properties: {},
          },
        }));
        return children;
      },
    },
    {
      name: 'choicesFields',
      type: 'itemGroup',
      title: '{{t("Choices fields")}}',
      hideIfNoChildren: true,
      useChildren() {
        const optionalList = useOptionalFieldList();
        const optionalChildren = optionalList.map((field) => ({
          name: field.key,
          title: field.uiSchema.title,
          Component: 'AssociationFilterDesignerDisplayField',
          schema: {
            name: field.name,
            title: field.uiSchema.title,
            interface: field.interface,
            type: 'void',
            'x-toolbar': 'CollapseItemSchemaToolbar',
            'x-settings': 'fieldSettings:FilterCollapseItem',
            'x-component': 'AssociationFilter.Item',
            'x-use-component-props': 'useAssociationFilterBlockProps',
            'x-component-props': {
              fieldNames: {
                label: field.name,
              },
            },
            properties: {},
          },
        }));

        return optionalChildren;
      },
    },
  ],
});
