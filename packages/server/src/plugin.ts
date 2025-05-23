import fs from 'node:fs';
import { basename, resolve } from 'node:path';
import { isMainThread } from 'worker_threads';
import { Model, Transactionable } from '@tachybase/database';
import { LoggerOptions } from '@tachybase/logger';
import { Container, fsExists, importModule } from '@tachybase/utils';

import { globSync } from 'glob';
import type { ParseKeys, TFunction, TOptions } from 'i18next';

import { Application } from './application';
import { getExposeChangelogUrl, getExposeReadmeUrl, InstallOptions } from './plugin-manager';
import { checkAndGetCompatible } from './plugin-manager/utils';
import { PubSubManagerPublishOptions } from './pub-sub-manager';

export type { ParseKeys, TOptions } from 'i18next';
export interface PluginInterface {
  beforeLoad?: () => void;

  load();

  getName(): string;
}

export interface PluginOptions {
  activate?: boolean;
  displayName?: string;
  description?: string;
  version?: string;
  enabled?: boolean;
  install?: (this: Plugin) => void;
  load?: (this: Plugin) => void;
  plugin?: typeof Plugin;

  [key: string]: any;
}

export abstract class Plugin implements PluginInterface {
  options: any;
  app: Application;
  features: (typeof Plugin)[];
  featureInstances: Plugin[];

  /**
   * @deprecated
   */
  model: Model;

  /**
   * @internal
   */
  state: any = {};

  /**
   * @internal
   */
  private _sourceDir: string;

  constructor(app: Application, options?: any) {
    this.app = app;
    this.setOptions(options);
    this.features = [];
    this.featureInstances = [];
  }

  addFeature<T extends Plugin>(plugin: new (app: Application, options?: any) => T) {
    this.features.push(plugin);
    this.featureInstances.push(new plugin(this.app, this.options));
  }

  get log() {
    return this.app.logger.child({
      reqId: this.app.context.reqId,
      module: this.name,
    });
  }

  get noticeManager() {
    return this.app.noticeManager;
  }

  get name() {
    return this.options.name as string;
  }

  get pm() {
    return this.app.pm;
  }

  get db() {
    return this.app.db;
  }

  get enabled() {
    return this.options.enabled;
  }

  set enabled(value) {
    this.options.enabled = value;
  }

  get installed() {
    return this.options.installed;
  }

  set installed(value) {
    this.options.installed = value;
  }

  get isPreset() {
    return this.options.isPreset;
  }

  getName() {
    return (this.options as any).name;
  }

  createLogger(options: LoggerOptions) {
    return this.app.createLogger(options);
  }

  afterAdd() {}

  beforeLoad() {}

  async load() {}

  async install(options?: InstallOptions) {}

  async upgrade() {}

  async beforeEnable() {}

  async afterEnable() {}

  async beforeDisable() {}

  async afterDisable() {}

  async beforeRemove() {}

  async afterRemove() {}

  async handleSyncMessage(message: Readonly<any>) {}
  async sendSyncMessage(message: any, options?: PubSubManagerPublishOptions & Transactionable) {
    if (!this.name) {
      throw new Error(`plugin name invalid`);
    }

    await this.app.syncMessageManager.publish(this.name, message, options);
  }

  /**
   * @deprecated
   */
  async importCollections(collectionsPath: string) {}

  /**
   * @internal
   */
  setOptions(options: any) {
    this.options = options || {};
  }

  /**
   * @internal
   */
  protected async getSourceDir() {
    if (this._sourceDir) {
      return this._sourceDir;
    }
    if (await this.isDev()) {
      return (this._sourceDir = 'src');
    }
    if (basename(__dirname) === 'src') {
      return (this._sourceDir = 'src');
    }
    if (!isMainThread) {
      return 'dist';
    }
    return (this._sourceDir = this.isPreset ? 'lib' : 'dist');
  }

  /**
   * @internal
   */
  async loadCommands() {
    const extensions = ['js', 'ts'];
    const directory = resolve(
      process.env.NODE_MODULES_PATH,
      this.options.packageName,
      await this.getSourceDir(),
      'server/commands',
    );
    const patten = `${directory}/*.{${extensions.join(',')}}`;
    const files = globSync(patten, {
      ignore: ['**/*.d.ts'],
    });
    for (const file of files) {
      let filename = basename(file);
      filename = filename.substring(0, filename.lastIndexOf('.')) || filename;
      const callback = await importModule(file);
      callback(this.app);
    }
    if (files.length) {
      this.app.logger.debug(`load commands [${this.name}]`);
    }
  }

  /**
   * @internal
   */
  async loadMigrations() {
    this.app.logger.debug(`load plugin migrations [${this.name}]`);
    if (!this.options.packageName) {
      return { beforeLoad: [], afterSync: [], afterLoad: [] };
    }
    const directory = resolve(
      process.env.NODE_MODULES_PATH,
      this.options.packageName,
      await this.getSourceDir(),
      'server/migrations',
    );
    return await this.app.loadMigrations({
      directory,
      namespace: this.options.packageName,
      context: {
        plugin: this,
      },
    });
  }

  /**
   * @internal
   */
  async loadCollections() {
    if (!this.options.packageName) {
      return;
    }
    const directory = resolve(
      process.env.NODE_MODULES_PATH,
      this.options.packageName,
      await this.getSourceDir(),
      'server/collections',
    );
    if (await fsExists(directory)) {
      await this.db.import({
        directory,
        from: this.options.packageName,
      });
    }
  }

  /**
   * @deprecated
   */
  requiredPlugins() {
    return [];
  }

  t(text: ParseKeys | ParseKeys[], options: TOptions = {}) {
    return this.app.i18n.t(text, { ns: this.options['packageName'], ...(options as any) }) as string;
  }

  /**
   * @internal
   */
  protected async isDev() {
    if (!this.options.packageName) {
      return false;
    }
    const file = await fs.promises.realpath(
      resolve(process.env.NODE_MODULES_PATH || resolve(process.cwd(), 'node_modules'), this.options.packageName),
    );
    if (file.startsWith(resolve(process.cwd(), 'packages'))) {
      return !!process.env.IS_DEV_CMD;
    }
    return false;
  }

  /**
   * @experimental
   */
  async toJSON(options: any = {}) {
    const { locale = 'en-US' } = options;
    const { name, packageName, packageJson } = this.options;
    if (!packageName) {
      return {
        ...this.options,
      };
    }

    const results = {
      ...this.options,
      keywords: packageJson.keywords,
      readmeUrl: getExposeReadmeUrl(packageName, locale),
      changelogUrl: getExposeChangelogUrl(packageName),
      displayName: packageJson[`displayName.${locale}`] || packageJson.displayName || name,
      description: packageJson[`description.${locale}`] || packageJson.description,
      homepage: packageJson[`homepage.${locale}`] || packageJson.homepage,
    };

    if (!options.withOutOpenFile) {
      const file = await fs.promises.realpath(
        resolve(process.env.NODE_MODULES_PATH || resolve(process.cwd(), 'node_modules'), packageName),
      );

      return {
        ...results,
        ...(await checkAndGetCompatible(packageName)),
        lastUpdated: (await fs.promises.stat(file)).ctime,
        file,
        updatable: file.startsWith(process.env.PLUGIN_STORAGE_PATH),
      };
    }

    return results;
  }
}

export function InjectedPlugin<T extends Plugin>({
  Services = [],
  Resources = [],
  Controllers = [],
}: {
  Services?: any[];
  Resources?: any[];
  Controllers?: any[];
}) {
  return function (target: { new (...args: any[]): T }, context: ClassDecoratorContext) {
    // TODO fix any

    const originalLoad = target.prototype.load;
    target.prototype.load = async function () {
      const services = Services.map((i) => Container.get<any>(i));
      const resources = Resources.map((i) => Container.get<any>(i));
      await originalLoad.call(this);

      for (const service of services) {
        try {
          await service.load?.();
        } catch (e) {
          this.log.warn('load service error', { name: service.constructor?.name, error: e });
        }
      }

      for (const resource of resources) {
        try {
          await resource.load?.();
        } catch (e) {
          this.log.warn('load resource error', { name: resource.constructor?.name, error: e });
        }
      }
    };

    return target;
  };
}

export default Plugin;
