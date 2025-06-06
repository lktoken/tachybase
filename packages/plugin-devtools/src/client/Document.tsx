import React, { useEffect, useRef, useState } from 'react';
import { css, useAPIClient, useApp, useRequest } from '@tachybase/client';
import { getSubAppName } from '@tachybase/sdk';

import { Select, Space, Spin, Typography } from 'antd';
import SwaggerUIBundle from 'swagger-ui-dist/swagger-ui-bundle';

import 'swagger-ui-dist/swagger-ui.css';

import { useTranslation } from './locale';

const DESTINATION_URL_KEY = 'API_DOC:DESTINATION_URL_KEY';
const getUrl = () => localStorage.getItem(DESTINATION_URL_KEY);

const Documentation = () => {
  const apiClient = useAPIClient();
  const { t } = useTranslation();
  const swaggerUIRef = useRef();
  const { data: urls } = useRequest<{ data: { name: string; url: string }[] }>({ url: 'swagger:getUrls' });
  const app = useApp();
  const requestInterceptor = (req) => {
    // 如果是a.localhost访问的子应用,而且主应用未开启api-doc,但是子应用开启
    req.headers['X-Hostname'] = window.location.hostname;
    if (!req.headers['Authorization']) {
      const appName = getSubAppName(app.getPublicPath());
      if (appName) {
        req.headers['X-App'] = appName;
      }
      req.headers['Authorization'] = `Bearer ${apiClient.auth.getToken()}`;
    }
    return req;
  };

  const [destination, onDestinationChange] = useState<string>(getUrl());

  useEffect(() => {
    if (destination) {
      localStorage.setItem(DESTINATION_URL_KEY, destination);
    }
  }, [destination]);

  useEffect(() => {
    if (!urls?.data?.length) return;

    if (!destination || !urls.data.find((item) => item.url === getUrl())) {
      onDestinationChange(urls.data[0].url);
    }
  }, [destination, urls]);

  useEffect(() => {
    SwaggerUIBundle({
      requestInterceptor,
      url: destination,
      domNode: swaggerUIRef.current,
    });
  }, [destination]);

  if (!destination) {
    return <Spin />;
  }
  return (
    <Space
      direction="vertical"
      style={{
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        <div
          className={css`
            display: flex;
            align-items: center;
            gap: 8px;
            max-width: 1460px;
            width: 100%;
            padding: 16px 20px;
          `}
        >
          <Typography.Text
            style={{
              whiteSpace: 'nowrap',
            }}
            strong
          >
            {t('Select a definition')}
          </Typography.Text>
          <Select
            showSearch
            value={destination}
            options={urls?.data}
            style={{
              width: '100%',
            }}
            fieldNames={{
              label: 'name',
              value: 'url',
            }}
            onChange={onDestinationChange}
          />
        </div>
      </div>
      <div ref={swaggerUIRef}></div>
      {/* <SwaggerUI url={destination} requestInterceptor={requestInterceptor} persistAuthorization deepLinking /> */}
    </Space>
  );
};

export default Documentation;
