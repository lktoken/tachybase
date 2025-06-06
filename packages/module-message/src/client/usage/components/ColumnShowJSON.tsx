import React, { useMemo } from 'react';
import { useCollectionManager, useCollectionRecordData, useCompile } from '@tachybase/client';
import { dayjs } from '@tachybase/utils/client';

import { useStyles } from './ColumnShowJSON.style';

// THINK: 可以改造后, 作为系统内置的展示此类 jsonb 数据的通用组件, 供其他地方使用
export const ColumnShowJSON = (props) => {
  const { value } = props;
  const record = useCollectionRecordData();
  const cm = useCollectionManager();
  const compile = useCompile();
  const { styles } = useStyles();
  const { collectionName } = record;

  const results = useMemo(
    () =>
      Object.entries(value || {}).map(([key, objValue]) => {
        const field = cm.getCollectionField(`${collectionName}.${key}`);
        const realValue =
          Object.prototype.toString.call(objValue) === '[object Object]' ? objValue?.['name'] : objValue;
        // 如果是UTC时间字符串, 则转换为本地时区时间
        if (isUTCString(realValue)) {
          return {
            label: compile(field?.uiSchema?.title || key),
            value: convertUTCToLocal(realValue),
          };
        }
        return {
          label: compile(field?.uiSchema?.title || key),
          value: realValue,
        };
      }),
    [],
  );
  // 展示结果要展示一个数组对象, 是 label 和 value 的形式
  // label 放中文, value 放值
  return (
    <div className={styles.columnShowJSON}>
      {results.map((item) => (
        <div className="json-item" key={item.label}>
          <div className="item-label">{`${item.label}:`}&nbsp;&nbsp;&nbsp;</div>
          <div className="item-value">{item.value}</div>
        </div>
      ))}
    </div>
  );
};

// 定义正则表达式, 检测形如 2024-07-04T04:46:27.166Z 的UTC时间字符串
const utcRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

// 测试函数
function isUTCString(str = '') {
  return utcRegex.test(str);
}

// 将UTC时间字符串转换为本地时区时间
function convertUTCToLocal(utcString) {
  // 使用dayjs解析UTC时间，并转换为本地时区时间
  const localDate = dayjs.utc(utcString).local().format('YYYY-MM-DD HH:mm:ss');
  return localDate;
}
