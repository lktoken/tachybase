import { resolve } from 'path';
import { requireModule } from '@tachybase/utils';

export const getCronLocale = (lang: string) => {
  const lng = lang.replace('-', '_');
  const files = [resolve(__dirname, `./../../../client/src/locale/cron/${lng}`)];
  if (process.env.APP_ENV !== 'production') {
    files.push(`@tachybase/client/src/locale/cron/${lng}`, `@tachybase/client/lib/locale/cron/${lng}`);
  }
  for (const file of files) {
    try {
      require.resolve(file);
      return requireModule(file);
    } catch (error) {
      continue;
    }
  }
  return {};
};
