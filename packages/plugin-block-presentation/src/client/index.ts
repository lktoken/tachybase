import { Plugin } from '@tachybase/client';

import { IframeBlockProvider } from './IframeBlockProvider';
import { iframeBlockSchemaSettings } from './schemaSettings';

export class IframeBlockPlugin extends Plugin {
  async load() {
    this.app.schemaSettingsManager.add(iframeBlockSchemaSettings);
    this.app.use(IframeBlockProvider);
    const blockInitializers = this.app.schemaInitializerManager.get('page:addBlock');
    blockInitializers?.add('otherBlocks.iframe', {
      title: '{{t("Embedded page")}}',
      Component: 'IframeBlockInitializer',
    });

    const createFormBlockInitializers = this.app.schemaInitializerManager.get('popup:addNew:addBlock');
    createFormBlockInitializers?.add('otherBlocks.iframe', {
      title: '{{t("Embedded page")}}',
      Component: 'IframeBlockInitializer',
    });

    const recordBlockInitializers = this.app.schemaInitializerManager.get('popup:common:addBlock');
    recordBlockInitializers?.add('otherBlocks.iframe', {
      title: '{{t("Embedded page")}}',
      Component: 'IframeBlockInitializer',
    });

    const recordFormBlockInitializers = this.app.schemaInitializerManager.get('RecordFormBlockInitializers');
    recordFormBlockInitializers?.add('otherBlocks.iframe', {
      title: '{{t("Embedded page")}}',
      Component: 'IframeBlockInitializer',
    });
  }
}

export default IframeBlockPlugin;
