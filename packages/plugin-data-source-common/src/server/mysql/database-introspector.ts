import { EventEmitter } from 'events';
import { ViewFieldInference } from '@tachybase/database';
import { mergeOptions } from '@tachybase/module-data-source';

import _ from 'lodash';

export class DatabaseIntrospector extends EventEmitter {
  db;
  typeInterfaceMap;
  constructor(options) {
    super();
    this.db = options.db;
    this.typeInterfaceMap = options.typeInterfaceMap;
  }
  async getCollections(options: any = {}) {
    let tableList = await this.db.sequelize.getQueryInterface().showAllTables();
    const views = (await this.db.queryInterface.listViews()).map((view) => view.name);
    tableList = tableList.concat(views);
    if (this.db.options.tablePrefix) {
      tableList = tableList.filter((tableName) => {
        return tableName.startsWith(this.db.options.tablePrefix);
      });
    }
    const batchSize = 5;
    const results = [];
    for (let i = 0; i < tableList.length; i += batchSize) {
      const batch = tableList.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (tableName) => {
          const tableInfo = {
            tableName,
          };
          this.emit('loadMessage', {
            message: `load table ${tableName}`,
          });
          const collectionOptions = this.tableInfoToCollectionOptions(tableInfo);
          const localOptions = options.localData?.[collectionOptions.name];
          try {
            return await this.getCollection({
              tableInfo,
              localOptions,
              mergedOptions: views.includes(tableName) ? { view: true, template: 'view' } : {},
            });
          } catch (e) {
            if (e.message.includes('No description found for')) {
              return false;
            }
            throw e;
          }
        }),
      );
      results.push(...batchResults);
    }
    return results.filter(Boolean);
  }
  async getCollection(options) {
    const { tableInfo } = options;
    const columnsInfo = await this.db.sequelize.getQueryInterface().describeTable(tableInfo);
    const collectionOptions = this.tableInfoToCollectionOptions(tableInfo);
    const constraints = await this.db.sequelize
      .getQueryInterface()
      .showIndex(this.db.inDialect('postgres') ? tableInfo : tableInfo.tableName);
    try {
      const fields = Object.keys(columnsInfo).map((columnName) => {
        return this.columnInfoToFieldOptions(columnsInfo, columnName, constraints);
      });
      const unsupportedFields = fields.filter((field: any) => {
        return field.supported === false;
      });
      const supportFields = fields.filter((field: any) => {
        return field.supported !== false;
      });
      const remoteCollectionInfo = {
        ...collectionOptions,
        ...((options == null ? void 0 : options.mergedOptions) || {}),
        ...this.collectionOptionsByFields(supportFields),
        fields: supportFields,
      };
      if (unsupportedFields.length) {
        remoteCollectionInfo.unsupportedFields = unsupportedFields;
      }
      const finalOptions = this.mergeLocalDataIntoCollectionOptions(remoteCollectionInfo, options.localOptions);
      if (finalOptions.view && !finalOptions.filterTargetKey && supportFields.find((field) => field.name === 'id')) {
        finalOptions.filterTargetKey = 'id';
      }
      return finalOptions;
    } catch (e) {
      throw new Error(`table ${tableInfo.tableName} introspection error: ${e.message}`);
    }
  }
  loadCollection(options) {
    this.db.collection({
      ...options,
      introspected: true,
    });
  }
  loadCollections(options) {
    options.collections.forEach((collection) => {
      this.loadCollection(collection);
    });
  }
  tableInfoToCollectionOptions(tableInfo) {
    const tableName = tableInfo.tableName;
    let name = tableName;
    if (this.db.options.tablePrefix) {
      name = tableName.replace(this.db.options.tablePrefix, '');
    }
    return {
      name,
      title: name,
      schema: tableInfo.schema,
      tableName,
    };
  }
  collectionOptionsByFields(fields) {
    const options: any = {
      timestamps: false,
      autoGenId: false,
    };
    const autoIncrementField = fields.find((field) => field.autoIncrement);
    if (autoIncrementField) {
      options.filterTargetKey = autoIncrementField.name;
    }
    const primaryKeys = fields.filter((field) => field.primaryKey);
    if (!options.filterTargetKey && primaryKeys.length === 1) {
      options.filterTargetKey = primaryKeys[0].name;
    }
    const uniques = fields.filter((field) => field.unique);
    if (!options.filterTargetKey && uniques.length === 1) {
      options.filterTargetKey = uniques[0].name;
    }
    return options;
  }
  mergeLocalDataIntoCollectionOptions(collectionOptions, localData) {
    if (!localData) {
      return collectionOptions;
    }
    const collectionFields = collectionOptions.fields || [];
    const localFieldsAsObject = _.keyBy(localData.fields, 'name');
    const newFields = collectionFields.map((field) => {
      const localField = localFieldsAsObject[field.name];
      if (!localField) {
        return field;
      }
      return mergeOptions(field, localField);
    });
    const localAssociationFields = localData.fields?.filter((field) => {
      return ['belongsTo', 'belongsToMany', 'hasMany', 'hasOne'].includes(field.type);
    });
    if (localAssociationFields) {
      newFields.push(...localAssociationFields);
    }
    return {
      ...collectionOptions,
      ..._.omit(localData, ['fields']),
      fields: newFields,
    };
  }
  columnInfoToFieldOptions(columnsInfo, columnName, indexes) {
    const columnInfo = columnsInfo[columnName];
    let fieldOptions: any = {
      ...this.columnAttribute(columnsInfo, columnName, indexes),
      ...ViewFieldInference.inferToFieldType({
        dialect: this.db.options.dialect,
        type: columnInfo.type,
        name: columnName,
      }),
      rawType: columnInfo.type,
      name: columnName,
    };
    if (!fieldOptions.type) {
      return {
        rawType: columnInfo.type,
        name: columnName,
        supported: false,
      };
    }
    const interfaceConfig = this.getDefaultInterfaceByType(columnsInfo, columnName, fieldOptions.type);
    if (typeof interfaceConfig === 'string') {
      fieldOptions.interface = interfaceConfig;
    } else {
      fieldOptions = {
        ...fieldOptions,
        ...interfaceConfig,
      };
    }
    _.set(fieldOptions, 'uiSchema.title', columnName);
    return fieldOptions;
  }
  getDefaultInterfaceByType(columnsInfo, columnName, type) {
    const interfaceConfig = this.typeInterfaceMap[type];
    if (typeof interfaceConfig === 'function') {
      return interfaceConfig(columnsInfo[columnName]);
    }
    return interfaceConfig;
  }
  columnAttribute(columnsInfo, columnName, indexes) {
    const columnInfo = columnsInfo[columnName];
    const attr = {
      type: columnInfo.type,
      allowNull: columnInfo.allowNull,
      primaryKey: columnInfo.primaryKey,
      unique: false,
      autoIncrement: columnInfo.autoIncrement,
    };
    if (columnInfo.defaultValue && typeof columnInfo.defaultValue === 'string') {
      const isSerial = columnInfo.defaultValue.match(/^nextval\(/);
      const isUUID = columnInfo.defaultValue.match(/^uuid_generate_v4\(/);
      if (isSerial || isUUID) {
        attr.autoIncrement = true;
      }
    }
    for (const index of indexes) {
      if (index.fields.length === 1 && index.fields[0].attribute === columnName && index.unique) {
        attr.unique = true;
      }
    }
    return attr;
  }
}
