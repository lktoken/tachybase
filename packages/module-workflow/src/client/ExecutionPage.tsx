import React from 'react';
import { cx, SchemaComponent } from '@tachybase/client';

import { useParams } from 'react-router-dom';

import { ExecutionCanvas } from './ExecutionCanvas';
import useStyles from './style';

export const ExecutionPage = () => {
  const params = useParams<any>();
  const { styles } = useStyles();

  return (
    <div className={cx(styles.workflowPageClass)}>
      <SchemaComponent
        schema={{
          type: 'void',
          properties: {
            [`execution_${params.id}`]: {
              type: 'void',
              'x-decorator': 'ResourceActionProvider',
              'x-decorator-props': {
                collection: {
                  name: 'executions',
                  fields: [],
                },
                resourceName: 'executions',
                request: {
                  resource: 'executions',
                  action: 'get',
                  params: {
                    filter: params,
                    appends: ['jobs', 'workflow', 'workflow.nodes'],
                  },
                },
              },
              'x-component': 'ExecutionCanvas',
            },
          },
        }}
        components={{
          ExecutionCanvas,
        }}
      />
    </div>
  );
};
