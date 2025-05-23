import { i18n } from '@tachybase/client';

import { useTranslation } from 'react-i18next';

export const NAMESPACE = 'block-charts';

// i18n.addResources('zh-CN', NAMESPACE, zhCN);
// i18n.addResources('en-US', NAMESPACE, enUS);
// i18n.addResources('ja-JP', NAMESPACE, jaJP);
// i18n.addResources('ru-RU', NAMESPACE, ruRU);
// i18n.addResources('tr-TR', NAMESPACE, trTR);

export function lang(key: string) {
  return i18n.t(key, { ns: [NAMESPACE, 'core'] });
}

export function useChartsTranslation() {
  return useTranslation([NAMESPACE, 'core'], { nsMode: 'fallback' });
}
