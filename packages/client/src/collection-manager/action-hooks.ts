import { useCallback, useEffect, useMemo } from 'react';
import { useField, useForm } from '@tachybase/schema';

import { App } from 'antd';
import _ from 'lodash';
import cloneDeep from 'lodash/cloneDeep';
import omit from 'lodash/omit';
import { useTranslation } from 'react-i18next';

import { useCollection_deprecated, useCollectionManager_deprecated } from '.';
import { useRequest } from '../api-client';
import { useRecord } from '../record-provider';
import { useActionContext } from '../schema-component';
import { useFilterFieldOptions, useFilterFieldProps } from '../schema-component/antd/filter/useFilterActionProps';
import { useResourceActionContext, useResourceContext } from './ResourceActionProvider';

export const useCancelAction = () => {
  const form = useForm();
  const ctx = useActionContext();
  return {
    async run() {
      ctx.setVisible(false);
      form.reset();
    },
  };
};

export const useValuesFromRecord = (options) => {
  const record = useRecord();
  const result = useRequest(
    () => Promise.resolve({ data: omit(cloneDeep(record), ['__parent', '__collectionName']) }),
    {
      ...options,
      manual: true,
    },
  );
  const ctx = useActionContext();
  useEffect(() => {
    if (ctx.visible) {
      result.run();
    }
  }, [ctx.visible]);
  return result;
};

export const useResetFilterAction = () => {
  const { run } = useResourceActionContext();
  const form = useForm();
  const ctx = useActionContext();

  return {
    async run() {
      form.reset();
      run();
      ctx.setVisible(false);
    },
  };
};

export const useKanbanEvents = () => {
  const { resource } = useCollection_deprecated();
  return {
    async onCardDragEnd({ columns, groupField }, { fromColumnId, fromPosition }, { toColumnId, toPosition }) {
      const sourceColumn = columns.find((column) => column.id === fromColumnId);
      const destinationColumn = columns.find((column) => column.id === toColumnId);
      const sourceCard = sourceColumn?.cards?.[fromPosition];
      const targetCard = destinationColumn?.cards?.[toPosition];
      const values = {
        sourceId: sourceCard.id,
        sortField: `${groupField.name}_sort`,
      };
      if (targetCard) {
        values['targetId'] = targetCard.id;
      } else {
        values['targetScope'] = {
          [groupField.name]: toColumnId,
        };
      }
      await resource.move(values);
    },
  };
};

// 多对一或者一对一
const toOneField = (field) => {
  return ['belongsTo', 'hasOne'].includes(field.type);
};

export const useSortFields = (collectionName, depth = 1, parentFieldName = '', parentLabel = '') => {
  const { t } = useTranslation();
  // 这个执行了多次
  const { getCollectionFields, getInterface } = useCollectionManager_deprecated();

  // 获取当前集合的字段
  const fields = getCollectionFields(collectionName);
  if (!Array.isArray(fields) || fields.length === 0) return [];

  // 关联字段排在后面
  fields.sort((a, b) => {
    const toOnFieldA = toOneField(a);
    const toOnFieldB = toOneField(b);
    if (toOnFieldA && !toOnFieldB) {
      return 1;
    } else if (!toOnFieldA && toOnFieldB) {
      return -1;
    }
    return a.sort - b.sort;
  });

  return fields
    .map((field) => {
      if (!field.interface) return null;

      const fieldInterface = getInterface(field.interface);
      if (!fieldInterface?.sortable && !toOneField(field)) {
        return null;
      }

      // 深度限制，避免过度递归；TODO: Select只能套两层
      if (!fieldInterface?.sortable && depth >= 2) {
        return null;
      }

      if (field.target === collectionName) {
        return null;
      }

      // 顶层字段直接使用字段名；子字段拼接父字段名
      const value = parentFieldName ? `${parentFieldName}.${field.name}` : field.name;

      // 动态拼接 fullLabel
      const currentLabel = field?.uiSchema?.title || field.name;

      let fullLabel = '';
      // 检查 parentLabel 和 currentLabel 是否都没有 {{}}，如果都没有，直接拼接
      if (!parentLabel) {
        fullLabel = currentLabel;
      } else if (!parentLabel.includes('{{') && !currentLabel.includes('{{')) {
        fullLabel = `${parentLabel} / ${currentLabel}`; // 直接拼接原始字符串
      } else {
        // 去掉外层的 {{ 和 }}
        const formatLabel = (label) =>
          label.includes('{{t(')
            ? `t(${label.slice(4, -3)})`
            : label.includes('{{')
              ? `t(${label.slice(2, -2)})`
              : `"${label}"`;
        // 对 parentLabel 和 currentLabel 进行格式化
        let formattedParentLabel = formatLabel(parentLabel);
        const formattedCurrentLabel = formatLabel(currentLabel);
        // 返回最终的 t() 调用表达式
        fullLabel = `{{t(${formattedParentLabel} +  "/" + ${formattedCurrentLabel})}}`;
      }

      const option: any = {
        label: currentLabel, // 当前层级的字段名或标题
        fullLabel, // 完整路径用于展示
        value, // 唯一标识
      };

      // 如果字段是关联字段，递归处理子字段
      if (field.target) {
        option.children = useSortFields(field.target, depth + 1, value, fullLabel);
      }

      return option;
    })
    .filter(Boolean); // 过滤掉无效字段
};

export const useChildrenCollections = (collectionName: string) => {
  const { getChildrenCollections } = useCollectionManager_deprecated();
  const childrenCollections = getChildrenCollections(collectionName);
  return childrenCollections.map((collection: any) => {
    return {
      value: collection.name,
      label: collection?.title || collection.name,
    };
  });
};

export const useSelfAndChildrenCollections = (collectionName: string) => {
  const { getChildrenCollections, getCollection } = useCollectionManager_deprecated();
  const childrenCollections = getChildrenCollections(collectionName);
  const self = getCollection(collectionName);
  if (!collectionName) {
    return null;
  }
  const options = childrenCollections.map((collection: any) => {
    return {
      value: collection.name,
      label: collection?.title || collection.name,
    };
  });
  options.unshift({
    value: self.name,
    label: self?.title || self.name,
  });
  return options;
};

export const useCollectionFilterOptions = (collection: any, dataSource?: string) => {
  const { getCollectionFields, getInterface } = useCollectionManager_deprecated();
  return useMemo(() => {
    const fields = getCollectionFields(collection, dataSource);
    const field2option = (field, depth) => {
      if (!field.interface) {
        return;
      }
      const fieldInterface = getInterface(field.interface);
      if (!fieldInterface?.filterable) {
        return;
      }
      const { nested, children, operators } = fieldInterface.filterable;
      const option = {
        name: field.name,
        title: field?.uiSchema?.title || field.name,
        schema: field?.uiSchema,
        operators:
          operators?.filter?.((operator) => {
            return !operator?.visible || operator.visible(field);
          }) || [],
        interface: field.interface,
      };
      if (field.target && depth > 2) {
        return;
      }
      if (depth > 2) {
        return option;
      }
      if (children?.length) {
        option['children'] = children;
      }
      if (nested) {
        const targetFields = getCollectionFields(field.target, dataSource);
        const options = getOptions(targetFields, depth + 1).filter(Boolean);
        option['children'] = option['children'] || [];
        option['children'].push(...options);
      }
      return option;
    };
    const getOptions = (fields, depth) => {
      const options = [];
      fields.forEach((field) => {
        const option = field2option(field, depth);
        if (option) {
          options.push(option);
        }
      });
      return options;
    };
    const options = getOptions(fields, 1);
    return options;
  }, [_.isString(collection) ? collection : collection?.name, dataSource]);
};

export const useCollectionFilterOptionsV2 = (collection: any) => {
  const { getCollectionFields, getInterface } = useCollectionManager_deprecated();

  const getFields = useCallback(() => {
    const fields = getCollectionFields(collection);
    const field2option = (field, depth) => {
      if (!field.interface) {
        return;
      }
      const fieldInterface = getInterface(field.interface);
      if (!fieldInterface?.filterable) {
        return;
      }
      const { nested, children, operators } = fieldInterface.filterable;
      const option = {
        name: field.name,
        title: field?.uiSchema?.title || field.name,
        schema: field?.uiSchema,
        operators:
          operators?.filter?.((operator) => {
            return !operator?.visible || operator.visible(field);
          }) || [],
        interface: field.interface,
      };
      if (field.target && depth > 2) {
        return;
      }
      if (depth > 2) {
        return option;
      }
      if (children?.length) {
        option['children'] = children;
      }
      if (nested) {
        const targetFields = getCollectionFields(field.target);
        const options = getOptions(targetFields, depth + 1).filter(Boolean);
        option['children'] = option['children'] || [];
        option['children'].push(...options);
      }
      return option;
    };
    const getOptions = (fields, depth) => {
      const options = [];
      fields.forEach((field) => {
        const option = field2option(field, depth);
        if (option) {
          options.push(option);
        }
      });
      return options;
    };
    const options = getOptions(fields, 1);
    return options;
  }, [_.isString(collection) ? collection : collection?.name]);

  return { getFields };
};

export const useLinkageCollectionFilterOptions = (collectionName: string) => {
  const { getCollectionFields, getInterface } = useCollectionManager_deprecated();
  const fields = getCollectionFields(collectionName);
  const field2option = (field, depth) => {
    if (!field.interface) {
      return;
    }
    const fieldInterface = getInterface(field.interface);
    if (!fieldInterface?.filterable) {
      return;
    }
    const { nested, children, operators } = fieldInterface.filterable;
    const option = {
      name: field.name,
      title: field?.uiSchema?.title || field.name,
      schema: field?.uiSchema,
      operators:
        operators?.filter?.((operator) => {
          return !operator?.visible || operator.visible(field);
        }) || [],
      interface: field.interface,
    };
    if (field.target && depth > 2) {
      return;
    }
    if (depth > 2) {
      return option;
    }
    if (children?.length) {
      option['children'] = children;
    }
    if (nested) {
      const targetFields = getCollectionFields(field.target).filter((v) => {
        if (['hasMany', 'belongsToMany'].includes(field.type)) {
          return !['hasOne', 'hasMany', 'belongsTo', 'belongsToMany'].includes(v.type);
        }
        return !['hasMany', 'belongsToMany'].includes(v.type);
      });
      const options = getOptions(targetFields, depth + 1).filter(Boolean);
      option['children'] = option['children'] || [];
      option['children'].push(...options);
    }
    return option;
  };
  const getOptions = (fields, depth) => {
    const options = [];
    fields.forEach((field) => {
      const option = field2option(field, depth);
      if (option) {
        options.push(option);
      }
    });
    return options;
  };
  const options = getOptions(fields, 1);
  return options;
};
// 通用
export const useCollectionFieldsOptions = (collectionName: string, maxDepth = 2, excludes = []) => {
  const { getCollectionFields, getInterface } = useCollectionManager_deprecated();
  const fields = getCollectionFields(collectionName).filter((v) => !excludes.includes(v.interface));

  const field2option = (field, depth, prefix?) => {
    if (!field.interface) {
      return;
    }
    const fieldInterface = getInterface(field.interface);
    if (!fieldInterface?.filterable) {
      return;
    }
    const { nested, children } = fieldInterface.filterable;
    const value = prefix ? `${prefix}.${field.name}` : field.name;
    const option = {
      ...field,
      name: field.name,
      title: field?.uiSchema?.title || field.name,
      schema: field?.uiSchema,
      key: value,
    };
    if (field.target && depth > maxDepth) {
      return;
    }
    if (depth > maxDepth) {
      return option;
    }
    if (children?.length) {
      option['children'] = children.map((v) => {
        return {
          ...v,
          key: `${field.name}.${v.name}`,
        };
      });
    }
    if (nested) {
      const targetFields = getCollectionFields(field.target).filter((v) => !excludes.includes(v.interface));
      const options = getOptions(targetFields, depth + 1, field.name).filter(Boolean);
      option['children'] = option['children'] || [];
      option['children'].push(...options);
    }
    return option;
  };
  const getOptions = (fields, depth, prefix?) => {
    const options = [];
    fields.forEach((field) => {
      const option = field2option(field, depth, prefix);
      if (option) {
        options.push(option);
      }
    });
    return options;
  };
  const options = getOptions(fields, 1);
  return options;
};

export const useFilterDataSource = (options) => {
  const { name } = useCollection_deprecated();
  const data = useCollectionFilterOptions(name);
  return useRequest(
    () =>
      Promise.resolve({
        data,
      }),
    options,
  );
};

export const useFilterAction = () => {
  const { run, params, defaultRequest } = useResourceActionContext();
  const form = useForm();
  const ctx = useActionContext();
  const [first, ...others] = params;
  return {
    async run() {
      const prevFilter = defaultRequest?.params?.filter;
      const filter = prevFilter ? { $and: [prevFilter, form.values.filter] } : form.values.filter;
      run({ ...first, filter }, ...others);
      ctx.setVisible(false);
    },
  };
};

export const useCreateAction = (actionCallback?: (values: any) => void) => {
  const form = useForm();
  const field = useField();
  const ctx = useActionContext();
  const { refresh } = useResourceActionContext();
  const { resource } = useResourceContext();
  return {
    async run() {
      try {
        await form.submit();
        field.data = field.data || {};
        field.data.loading = true;
        const res = await resource.create({ values: form.values });
        ctx.setVisible(false);
        actionCallback?.(res?.data?.data);
        await form.reset();
        field.data.loading = false;
        refresh();
      } catch (error) {
        if (field.data) {
          field.data.loading = false;
        }
      }
    },
  };
};

export const useCreateActionWithoutRefresh = (actionCallback?: (values: any) => void) => {
  const form = useForm();
  const { resource } = useResourceContext();
  return {
    async run() {
      await form.submit();
      const res = await resource.create({ values: form.values });
      actionCallback?.(res?.data?.data);
      await form.reset();
    },
  };
};

export const useUpdateViewAction = (actionCallback?: (filterByTk: string, values: any) => void) => {
  const form = useForm();
  const { message } = App.useApp();
  const { t } = useTranslation();
  const { resource, targetKey } = useResourceContext();
  const { [targetKey]: filterByTk } = useRecord();
  return {
    async run() {
      await form.submit();
      const res = await resource.update({ filterByTk, values: form.values });
      actionCallback?.(filterByTk, res?.data?.data);
      message.success(t('Save successfully.'));
    },
  };
};

export const useMoveAction = () => {
  const { resource } = useResourceContext();
  const { refresh } = useResourceActionContext();
  return {
    async move(from, to) {
      await resource.move({
        sourceId: from.id,
        targetId: to.id,
      });
      refresh();
    },
  };
};

export const useUpdateAction = (actionCallback?: (key: string, values: any) => void) => {
  const field = useField();
  const form = useForm();
  const ctx = useActionContext();
  const { refresh } = useResourceActionContext();
  const { resource, targetKey } = useResourceContext();
  const { [targetKey]: filterByTk } = useRecord();
  return {
    async run() {
      await form.submit();
      field.data = field.data || {};
      field.data.loading = true;
      try {
        const res = await resource.update({ filterByTk, values: form.values });
        ctx.setVisible(false);
        actionCallback?.(filterByTk, res?.data?.data);
        await form.reset();
        refresh();
      } catch (e) {
        console.error(e);
      } finally {
        field.data.loading = false;
      }
    },
  };
};

export const useDestroyAction = (actionCallback?: (key: string) => void) => {
  const { refresh } = useResourceActionContext();
  const { resource, targetKey } = useResourceContext();
  const { [targetKey]: filterByTk } = useRecord();
  return {
    async run() {
      await resource.destroy({ filterByTk });
      actionCallback?.(filterByTk);
      refresh();
    },
  };
};

export const useBulkDestroyAction = (actionCallback?: (keys: string[]) => void) => {
  const { state, setState, refresh } = useResourceActionContext();
  const { resource } = useResourceContext();
  const { message } = App.useApp();
  const { t } = useTranslation();
  return {
    async run() {
      if (!state?.selectedRowKeys?.length) {
        return message.error(t('Please select the records you want to delete'));
      }
      await resource.destroy({
        filterByTk: state?.selectedRowKeys || [],
      });
      actionCallback?.(state?.selectedRowKeys);
      setState?.({ selectedRowKeys: [] });
      refresh();
    },
  };
};

export const useValuesFromRA = (options) => {
  const ctx = useResourceActionContext();
  return useRequest(() => Promise.resolve(ctx.data), {
    ...options,
    refreshDeps: [ctx.data],
  });
};

export const useCreateActionAndRefreshCM = () => {
  const { run } = useCreateAction();
  const { refreshCM } = useCollectionManager_deprecated();
  return {
    async run() {
      await run();
      await refreshCM();
    },
  };
};

export const useUpdateActionAndRefreshCM = () => {
  const { run } = useUpdateAction();
  const { refreshCM } = useCollectionManager_deprecated();
  return {
    async run() {
      await run();
      await refreshCM();
    },
  };
};

export const useDestroyActionAndRefreshCM = () => {
  const { run } = useDestroyAction();
  const { refreshCM } = useCollectionManager_deprecated();
  return {
    async run() {
      await run();
      await refreshCM();
    },
  };
};

export const useDeleteButtonDisabled = (record?: any) => {
  const recordFromProvider = useRecord();
  return isDeleteButtonDisabled(record || recordFromProvider);
};

export const isDeleteButtonDisabled = (record?: any) => {
  const { interface: i, deletable = true } = record || {};

  return !deletable || i === 'id';
};

export const useBulkDestroyActionAndRefreshCM = () => {
  const { run } = useBulkDestroyAction();
  const { refreshCM } = useCollectionManager_deprecated();
  return {
    async run() {
      await run();
      await refreshCM();
    },
  };
};

export const useFilterActionProps = () => {
  const { collection } = useResourceContext();
  const options = useFilterFieldOptions(collection.fields);
  const service = useResourceActionContext();
  return useFilterFieldProps({
    options: options.filter((option) => ['title', 'name'].includes(option.name)),
    params: service.state?.params?.[0] || service.params,
    service,
  });
};
