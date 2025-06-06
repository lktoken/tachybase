import React, { useState } from 'react';
import { css } from '@tachybase/client';

import { PlusOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';

import {
  Branch,
  NodeDefaultView,
  RadioWithTooltip,
  useFlowContext,
  useGetAriaLabelOfAddButton,
  useStyles,
} from '../..';
import { lang, NAMESPACE } from '../../locale';
import { Instruction } from '../../nodes/default-node/interface';

/** 节点: 分支 */
export default class extends Instruction {
  title = `{{t("Parallel branch", { ns: "${NAMESPACE}" })}}`;
  type = 'parallel';
  group = 'control';
  icon = 'MergeOutlined';
  color = '#6e93e8';
  description = `{{t("Run multiple branch processes in parallel.", { ns: "${NAMESPACE}" })}}`;
  fieldset = {
    mode: {
      type: 'string',
      title: `{{t("Mode", { ns: "${NAMESPACE}" })}}`,
      'x-decorator': 'FormItem',
      'x-component': 'RadioWithTooltip',
      'x-component-props': {
        options: [
          {
            value: 'all',
            label: `{{t('All succeeded', { ns: "${NAMESPACE}" })}}`,
            tooltip: `{{t('Continue after all branches succeeded', { ns: "${NAMESPACE}" })}}`,
          },

          {
            value: 'allSettled',
            label: `{{t('All settled', { ns: "${NAMESPACE}" })}}`,
            tooltip: `{{t('Continue after all branches finished', { ns: "${NAMESPACE}" })}}`,
          },
          {
            value: 'any',
            label: `{{t('Any succeeded', { ns: "${NAMESPACE}" })}}`,
            tooltip: `{{t('Continue after any branch succeeded', { ns: "${NAMESPACE}" })}}`,
          },
          {
            value: 'race',
            label: `{{t('Any succeeded or failed', { ns: "${NAMESPACE}" })}}`,
            tooltip: `{{t('Continue after any branch succeeded, or exit after any branch failed.', { ns: "${NAMESPACE}" })}}`,
          },
        ],
      },
      default: 'all',
    },
    remarks: {
      type: 'string',
      title: `{{t("Remarks", { ns: "${NAMESPACE}" })}}`,
      'x-decorator': 'FormItem',
      'x-component': 'Input.TextArea',
      'x-component-props': {
        autoSize: {
          minRows: 3,
        },
        placeholder: `{{t("Input remarks", { ns: "${NAMESPACE}" })}}`,
      },
    },
  };
  components = {
    RadioWithTooltip,
  };
  Component({ data }) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { styles } = useStyles();
    const {
      id,
      config: { mode },
    } = data;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { workflow, nodes } = useFlowContext();
    const branches = nodes
      .reduce((result, node) => {
        if (node.upstreamId === id && node.branchIndex != null) {
          return result.concat(node);
        }
        return result;
      }, [])
      .sort((a, b) => a.branchIndex - b.branchIndex);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [branchCount, setBranchCount] = useState(Math.max(2, branches.length));
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { getAriaLabel } = useGetAriaLabelOfAddButton(data);
    const langAddBranch = lang('Add branch');

    const tempBranches = Array(Math.max(0, branchCount - branches.length)).fill(null);
    const lastBranchHead = branches[branches.length - 1];

    return (
      <NodeDefaultView data={data}>
        <div className={styles.nodeSubtreeClass}>
          <div className={styles.branchBlockClass}>
            {branches.map((branch) => (
              <Branch key={branch.id} from={data} entry={branch} branchIndex={branch.branchIndex} />
            ))}
            {tempBranches.map((_, i) => (
              <Branch
                key={`temp_${branches.length + i}`}
                from={data}
                branchIndex={(lastBranchHead ? lastBranchHead.branchIndex : 0) + i + 1}
                controller={
                  branches.length + i > 1 ? (
                    <div
                      className={css`
                        padding-top: 2em;

                        > button {
                          .anticon {
                            transform: rotate(45deg);
                          }
                        }
                      `}
                    >
                      <Button
                        shape="circle"
                        icon={<PlusOutlined />}
                        onClick={() => setBranchCount(branchCount - 1)}
                        disabled={workflow.executed}
                      />
                    </div>
                  ) : null
                }
              />
            ))}
          </div>
          <Tooltip
            title={langAddBranch}
            className={css`
              visibility: ${workflow.executed ? 'hidden' : 'visible'};
            `}
          >
            <Button
              aria-label={getAriaLabel('add-branch')}
              icon={<PlusOutlined />}
              className={css`
                position: relative;
                top: 1em;
                transform-origin: center;
                transform: rotate(45deg);

                .anticon {
                  transform-origin: center;
                  transform: rotate(-45deg);
                }
              `}
              onClick={() => setBranchCount(branchCount + 1)}
              disabled={workflow.executed}
            />
          </Tooltip>
        </div>
      </NodeDefaultView>
    );
  }
}
