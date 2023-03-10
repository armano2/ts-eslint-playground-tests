import type * as ESQuery from 'esquery';
import React, { useEffect, useMemo } from 'react';

import CopyButton from '../inputs/CopyButton';
import { debounce } from '../util/debounce';
import { scrollIntoViewIfNeeded } from '../util/scroll-into';
import styles from './ASTViewer.module.css';
import ElementItem from './ElementItem';
import { findSelectionPath } from './selectedRange';
import type { OnClickNodeFn, OnHoverNodeFn } from './types';
import { getTooltipLabel, getTypeName } from './utils';

export interface ASTViewerProps {
  readonly cursorPosition?: number;
  readonly onHoverNode?: OnHoverNodeFn;
  readonly onClickNode?: OnClickNodeFn;
  readonly value: unknown;
  readonly filter?: ESQuery.Selector;
  readonly enableScrolling?: boolean;
  readonly hideCopyButton?: boolean;
}

function tryToApplyFilter<T>(value: T, filter?: ESQuery.Selector): T | T[] {
  try {
    if (window.esquery && filter) {
      // @ts-expect-error - esquery requires js ast types
      return window.esquery.match(value, filter);
    }
  } catch (e: unknown) {
    // eslint-disable-next-line no-console
    console.error(e);
  }
  return value;
}

function ASTViewer({
  cursorPosition,
  onHoverNode,
  onClickNode,
  value,
  filter,
  enableScrolling,
  hideCopyButton,
}: ASTViewerProps): JSX.Element {
  const model = useMemo(() => {
    if (filter) {
      return tryToApplyFilter(value, filter);
    }
    return value;
  }, [value, filter]);

  const selectedPath = useMemo(() => {
    if (cursorPosition == null || !model || typeof model !== 'object') {
      return 'ast';
    }
    return findSelectionPath(model, cursorPosition).path.join('.');
  }, [cursorPosition, model]);

  useEffect(() => {
    if (enableScrolling) {
      const delayed = debounce(() => {
        const htmlElement = document.querySelector(
          `div[data-level="${selectedPath}"] > a`
        );
        if (htmlElement) {
          scrollIntoViewIfNeeded(htmlElement);
        }
      }, 100);
      delayed();
    }
  }, [selectedPath, enableScrolling]);

  return (
    <div className={styles.list}>
      <ElementItem
        getTypeName={getTypeName}
        value={model}
        level="ast"
        onClickNode={onClickNode}
        onHoverNode={onHoverNode}
        selectedPath={selectedPath}
        getTooltipLabel={getTooltipLabel}
      />
      {!hideCopyButton && <CopyButton className="margin--sm" value={model} />}
    </div>
  );
}

export default ASTViewer;
