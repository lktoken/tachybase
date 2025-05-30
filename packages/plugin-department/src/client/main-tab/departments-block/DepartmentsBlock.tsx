import React, { useState } from 'react';
import { ActionContextProvider, RecordProvider, SchemaComponent, SchemaComponentOptions } from '@tachybase/client';

import { UserOutlined } from '@ant-design/icons';
import { Button, Divider, Row, theme } from 'antd';

import { useTranslation } from '../../locale';
import { useContextDepartments } from '../context/Department.context';
import { ProviderContextDepartmentsExpanded } from '../context/DepartmentsExpanded.context';
import { useGetDepTree } from '../hooks/useGetDepTree';
import { AddNewDepartment } from './AddNewDepartment.view';
import { DepartmentOwnersField } from './DepartmentOwnersField.component';
import { DepartmentsSearch } from './DepartmentsSearch.component';
import { DepartmentsTree } from './DepartmentsTree.component';
import { useCreateDepartment } from './scopes/useCreateDepartment';
import { useUpdateDepartment } from './scopes/useUpdateDepartment';

interface drawerState {
  node?: object;
  schema?: object;
}

// NOTE: 部门左边-部门列表部分
export const DepartmentsBlock = () => {
  const { t } = useTranslation();

  const [visible, setVisible] = useState(false);
  const [drawer, setDrawer] = useState<drawerState>({});

  const { department, setDepartment } = useContextDepartments();
  const { token } = theme.useToken();

  const LabelComp = ({ node }) => <DepartmentsTree.Item node={node} setVisible={setVisible} setDrawer={setDrawer} />;

  const value = useGetDepTree({
    label: LabelComp,
  });

  const schema = drawer.schema || {};

  return (
    <SchemaComponentOptions
      scope={{
        useCreateDepartment,
        useUpdateDepartment,
      }}
    >
      <ProviderContextDepartmentsExpanded value={value}>
        <Row>
          <DepartmentsSearch />
          <Button
            type="text"
            icon={<UserOutlined />}
            style={{
              textAlign: 'left',
              marginBottom: '5px',
              background: department ? '' : token.colorBgTextHover,
            }}
            onClick={() => {
              setDepartment(null);
            }}
            block={true}
          >
            {t('All users')}
          </Button>
          <AddNewDepartment />
        </Row>
        <Divider style={{ margin: '12px 0' }} />
        <DepartmentsTree />
        {/* 操作浮层部分 */}
        <ActionContextProvider
          value={{
            visible,
            setVisible,
          }}
        >
          <RecordProvider record={drawer.node || {}}>
            <SchemaComponent
              schema={schema}
              components={{
                DepartmentOwnersField,
              }}
            />
          </RecordProvider>
        </ActionContextProvider>
      </ProviderContextDepartmentsExpanded>
    </SchemaComponentOptions>
  );
};
