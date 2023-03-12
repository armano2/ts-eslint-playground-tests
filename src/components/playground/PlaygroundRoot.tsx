import type * as ESQuery from 'esquery';
import React, { useEffect, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useMedia } from 'react-use';

import ASTViewer from '../ast/ASTViewer';
import ConfigEslint from '../config/ConfigEslint';
import ConfigTypeScript from '../config/ConfigTypeScript';
import useHashState from '../hooks/useHashState';
import EditorTabs from '../layout/EditorTabs';
import { createFileSystem } from '../linter/bridge';
import type { UpdateModel } from '../linter/types';
import { debounce } from '../util/debounce';
import { defaultConfig, detailTabs } from './config';
import { ErrorsViewer } from './ErrorsViewer';
import { ESQueryFilter } from './ESQueryFilter';
import Options from './Options';
import styles from './playground.module.css';
import PlaygroundEditor from './PlaygroundEditor';
import type { ErrorGroup, PlaygroundSystem } from './types';

function PlaygroundRoot(): JSX.Element {
  const [config, setConfig] = useHashState(defaultConfig);

  const [system] = useState<PlaygroundSystem>(() => createFileSystem(config));
  const [activeFile, setFileName] = useState('file.ts');

  const [errors, setErrors] = useState<ErrorGroup[]>([]);
  const [astModel, setAstModel] = useState<UpdateModel>();
  const [esQueryFilter, setEsQueryFilter] = useState<ESQuery.Selector>();
  const [showModal, setShowModal] = useState<string | false>(false);
  const [selectedRange, setSelectedRange] = useState<[number, number]>();

  const isWide = useMedia('(min-width: 1280px)');

  useEffect(() => {
    const dispose = system.watchDirectory(
      '/',
      debounce((fileName) => {
        if (fileName === '/file.ts') {
          const code = system.readFile(fileName);
          if (config.code !== code) {
            setConfig({ code });
          }
        } else if (fileName === '/demo.tsx') {
          const code2 = system.readFile(fileName);
          if (config.code2 !== code2) {
            setConfig({ code2 });
          }
        } else if (fileName === '/.eslintrc') {
          const eslintrc = system.readFile(fileName);
          if (config.eslintrc !== eslintrc) {
            setConfig({ eslintrc });
          }
        } else if (fileName === '/tsconfig.json') {
          const tsconfig = system.readFile(fileName);
          if (config.tsconfig !== tsconfig) {
            setConfig({ tsconfig });
          }
        }
      }, 500)
    );
    return () => {
      dispose.close();
    };
  }, [config, setConfig, system]);

  useEffect(() => {
    system.writeFile('/file.ts', config.code);
    system.writeFile('/demo.tsx', config.code2);
    system.writeFile('/.eslintrc', config.eslintrc);
    system.writeFile('/tsconfig.json', config.tsconfig);
  }, [config, system]);

  return (
    <>
      <ConfigEslint
        system={system}
        isOpen={showModal === '.eslintrc'}
        onClose={setShowModal}
      />
      <ConfigTypeScript
        system={system}
        isOpen={showModal === 'tsconfig.json'}
        onClose={setShowModal}
      />
      <PanelGroup
        className={styles.panelGroup}
        autoSaveId="playground-resize"
        direction={isWide ? 'horizontal' : 'vertical'}
      >
        <Panel
          id="playgroundMenu"
          className={styles.PanelRow}
          defaultSize={13}
          maxSize={20}
          collapsible={true}
        >
          <div className={styles.playgroundMenu}>
            <Options config={config} setConfig={setConfig} />
          </div>
        </Panel>
        <PanelResizeHandle className={styles.PanelResizeHandle} />
        <Panel id="playgroundEditor" className={styles.PanelRow} maxSize={70}>
          <div className={styles.playgroundEditor}>
            <EditorTabs
              tabs={['file.ts', 'demo.tsx', '.eslintrc', 'tsconfig.json']}
              active={activeFile}
              change={setFileName}
            />
            <PlaygroundEditor
              tsEsVersion={config.tse}
              tsVersion={config.ts}
              onUpdate={setAstModel}
              system={system}
              activeFile={activeFile}
              onValidate={setErrors}
              selectedRange={selectedRange}
            />
          </div>
        </Panel>
        <PanelResizeHandle className={styles.PanelResizeHandle} />
        <Panel
          maxSize={70}
          id="playgroundInfo"
          className={styles.PanelRow}
          defaultSize={50}
        >
          <div className={styles.playgroundInfoContainer}>
            <div className={styles.playgroundInfoHeader}>
              <EditorTabs
                tabs={detailTabs}
                active={config.showAST ?? false}
                change={(v): void => setConfig({ showAST: v })}
              />
              {config.showAST === 'es' && (
                <ESQueryFilter onChange={setEsQueryFilter} />
              )}
            </div>
            <div className={styles.playgroundInfo}>
              {!config.showAST || !astModel ? (
                <ErrorsViewer value={errors} />
              ) : (
                <ASTViewer
                  key={config.showAST}
                  filter={config.showAST === 'es' ? esQueryFilter : undefined}
                  value={astModel}
                  tab={config.showAST}
                  onSelectNode={setSelectedRange}
                />
              )}
            </div>
          </div>
        </Panel>
      </PanelGroup>
    </>
  );
}

export default PlaygroundRoot;