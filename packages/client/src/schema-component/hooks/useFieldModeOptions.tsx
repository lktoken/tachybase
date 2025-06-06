import { useMemo } from 'react';
import { useField, useFieldSchema, useForm } from '@tachybase/schema';

import { useTranslation } from 'react-i18next';

import { useCollection_deprecated, useCollectionManager_deprecated } from '../../collection-manager';

export const useFieldModeOptions = (props?) => {
  const { t } = useTranslation();
  const { getCollectionJoinField, getCollection } = useCollectionManager_deprecated();
  const currentFieldSchema = useFieldSchema();
  const fieldSchema = props?.fieldSchema || currentFieldSchema;
  const field = useField();
  const form = useForm();
  const isReadPretty = fieldSchema?.['x-read-pretty'] || field.readPretty || form.readPretty;
  const isTableField = props?.fieldSchema;
  const { getField } = useCollection_deprecated();
  const collectionField =
    props?.collectionField ||
    getField(fieldSchema['name']) ||
    getCollectionJoinField(fieldSchema['x-collection-field']);
  const { label } = fieldSchema['x-component-props']?.fieldNames || {};
  const fieldModeOptions = useMemo(() => {
    if (!collectionField || !collectionField?.interface) {
      return;
    }
    if (
      !['o2o', 'oho', 'obo', 'o2m', 'linkTo', 'm2o', 'm2m', 'updatedBy', 'createdBy'].includes(
        collectionField.interface,
      )
    )
      return;
    const collection = getCollection(collectionField.target);
    if (collection?.template === 'file') {
      return isReadPretty
        ? [
            { label: t('Title'), value: 'Select' },
            { label: t('File manager'), value: 'FileManager' },
            { label: t('Tag'), value: 'Tag' },
          ]
        : [
            { label: t('Select'), value: 'Select' },
            { label: t('Record picker'), value: 'Picker' },
            { label: t('File manager'), value: 'FileManager' },
          ];
    }
    if (collection?.template === 'tree' && ['m2m', 'o2m', 'm2o'].includes(collectionField.interface)) {
      return isReadPretty
        ? [
            { label: t('Title'), value: 'Select' },
            { label: t('Tag'), value: 'Tag' },
          ]
        : [
            { label: t('Select'), value: 'Select' },
            { label: t('Record picker'), value: 'Picker' },
            ['m2m', 'o2m'].includes(collectionField.interface) && { label: t('Sub-table'), value: 'SubTable' },
            { label: t('Cascade Select'), value: 'CascadeSelect' },
            !isTableField && { label: t('Sub-form'), value: 'Nester' },
            { label: t('Subform: Popover'), value: 'PopoverNester' },
            { label: t('Subtable: Drawer'), value: 'DrawerSubTable' },
            { label: t('Cascader'), value: 'Cascader' },
          ];
    }
    switch (collectionField.interface) {
      case 'o2m':
        return isReadPretty
          ? [
              { label: t('Title'), value: 'Select' },
              { label: t('Tag'), value: 'Tag' },
              !isTableField && { label: t('Sub-table'), value: 'SubTable' },
              !isTableField && { label: t('Sub-details'), value: 'Nester' },
            ]
          : [
              { label: t('Select'), value: 'Select' },
              { label: t('Record picker'), value: 'Picker' },
              !isTableField && { label: t('Sub-form'), value: 'Nester' },
              { label: t('Subform: Popover'), value: 'PopoverNester' },
              { label: t('Subtable: Drawer'), value: 'DrawerSubTable' },
              !isTableField && { label: t('Sub-table'), value: 'SubTable' },
            ];
      case 'm2m':
        return isReadPretty
          ? [
              { label: t('Title'), value: 'Select' },
              { label: t('Tag'), value: 'Tag' },
              !isTableField && { label: t('Sub-details'), value: 'Nester' },
              !isTableField && { label: t('Sub-table'), value: 'SubTable' },
            ]
          : [
              { label: t('Select'), value: 'Select' },
              { label: t('Record picker'), value: 'Picker' },
              !isTableField && { label: t('Sub-table'), value: 'SubTable' },
              !isTableField && { label: t('Sub-form'), value: 'Nester' },
              { label: t('Subform: Popover'), value: 'PopoverNester' },
              { label: t('Subtable: Drawer'), value: 'DrawerSubTable' },
            ];
      case 'm2o':
      case 'linkTo':
        return isReadPretty
          ? [
              { label: t('Title'), value: 'Select' },
              { label: t('Tag'), value: 'Tag' },
              { label: t('Custom Title'), value: 'CustomTitle' },
              !isTableField && { label: t('Sub-details'), value: 'Nester' },
            ]
          : [
              { label: t('Select'), value: 'Select' },
              { label: t('Record picker'), value: 'Picker' },
              !isTableField && { label: t('Sub-form'), value: 'Nester' },
              { label: t('Subform: Popover'), value: 'PopoverNester' },
              { label: t('Subtable: Drawer'), value: 'DrawerSubTable' },
              { label: t('Cascader'), value: 'Cascader' },
              { label: t('Custom Title'), value: 'CustomTitle' },
            ];

      default:
        return isReadPretty
          ? [
              { label: t('Title'), value: 'Select' },
              { label: t('Tag'), value: 'Tag' },
              !isTableField && { label: t('Sub-details'), value: 'Nester' },
            ]
          : [
              { label: t('Select'), value: 'Select' },
              { label: t('Record picker'), value: 'Picker' },
              !isTableField && { label: t('Sub-form'), value: 'Nester' },
              { label: t('Subform: Popover'), value: 'PopoverNester' },
              { label: t('Subtable: Drawer'), value: 'DrawerSubTable' },
            ];
    }
  }, [t, collectionField?.interface, label]);
  return (fieldModeOptions || []).filter(Boolean);
};
