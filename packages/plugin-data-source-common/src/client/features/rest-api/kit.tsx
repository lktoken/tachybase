import { Plugin } from '@tachybase/client';
import PluginDataSourceManagerClient from '@tachybase/module-data-source/client';

import { tval } from '../../locale';
import { AddCollection } from './collection-add/AddCollection';
import { DeleteCollection } from './collection-delete/DeleteCollection';
import { EditCollection } from './collection-edit/EditCollection';
import { DataSourceSettingsForm } from './form-data-source/DataSourceSettingsForm';

export class KitHttpDatasource extends Plugin {
  async load() {
    this.app.pm.get(PluginDataSourceManagerClient).registerType('http', {
      label: tval('HTTP'),
      allowCollectionCreate: true,
      allowCollectionDeletion: true,
      disabledConfigureFields: false,
      disableAddFields: true,
      disableTestConnection: true,
      // 组件
      DataSourceSettingsForm,
      AddCollection,
      EditCollection,
      DeleteCollection,
    });
  }
}
