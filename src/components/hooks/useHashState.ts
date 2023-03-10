import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from 'lz-string';
import { useCallback, useEffect, useState } from 'react';

import { toJson } from '../config/utils';
import type { ConfigModel } from '../playground/types';
import { hasOwnProperty } from '../util/has-own-property';

function writeQueryParam(value: string | null): string {
  return (value && compressToEncodedURIComponent(value)) || '';
}

function readQueryParam(value: string | null, fallback: string): string {
  return (value && decompressFromEncodedURIComponent(value)) || fallback;
}

function readShowAST(value: string | null): ConfigModel['showAST'] {
  switch (value) {
    case 'es':
    case 'ts':
    case 'scope':
    case 'types':
      return value;
  }
  return value ? 'es' : false;
}

function readFileType(value: string | null): ConfigModel['fileType'] {
  switch (value) {
    case 'ts':
    case 'tsx':
    case 'd.ts':
    case 'js':
    case 'jsx':
      return value;
  }
  return 'ts';
}

function toJsonConfig(cfg: unknown, prop: string): string {
  return toJson({ [prop]: cfg });
}

function readLegacyParam(
  data: string | null,
  prop: string
): string | undefined {
  try {
    return toJsonConfig(JSON.parse(readQueryParam(data, '{}')), prop);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e, data, prop);
  }
  return undefined;
}

const parseStateFromUrl = (hash: string): Partial<ConfigModel> | undefined => {
  if (!hash) {
    return;
  }

  try {
    const searchParams = new URLSearchParams(hash);

    let eslintrc: string | undefined;
    if (searchParams.has('eslintrc')) {
      eslintrc = readQueryParam(searchParams.get('eslintrc'), '');
    } else if (searchParams.has('rules')) {
      eslintrc = readLegacyParam(searchParams.get('rules'), 'rules');
    }

    let tsconfig: string | undefined;
    if (searchParams.has('tsconfig')) {
      tsconfig = readQueryParam(searchParams.get('tsconfig'), '');
    } else if (searchParams.has('tsConfig')) {
      tsconfig = readLegacyParam(
        searchParams.get('tsConfig'),
        'compilerOptions'
      );
    }

    let fileType = readFileType(searchParams.get('fileType'));
    if (searchParams.get('jsx') === 'true') {
      fileType = 'tsx';
    }

    const code = searchParams.has('code')
      ? readQueryParam(searchParams.get('code'), '')
      : '';

    return {
      ts: searchParams.get('ts') ?? undefined,
      tse: searchParams.get('tse') ?? undefined,
      showAST: readShowAST(searchParams.get('showAST')),
      sourceType:
        searchParams.get('sourceType') === 'script' ? 'script' : 'module',
      code,
      fileType,
      eslintrc: eslintrc ?? '',
      tsconfig: tsconfig ?? '',
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(e);
  }
  return undefined;
};

const writeStateToUrl = (newState: ConfigModel): string | undefined => {
  try {
    const searchParams = new URLSearchParams();
    searchParams.set('ts', newState.ts.trim());
    searchParams.set('tse', newState.tse.trim());
    if (newState.sourceType === 'script') {
      searchParams.set('sourceType', newState.sourceType);
    }
    if (newState.showAST) {
      searchParams.set('showAST', newState.showAST);
    }
    if (newState.fileType !== 'ts') {
      searchParams.set('fileType', newState.fileType);
    }
    searchParams.set('code', writeQueryParam(newState.code));
    searchParams.set('eslintrc', writeQueryParam(newState.eslintrc));
    searchParams.set('tsconfig', writeQueryParam(newState.tsconfig));
    return searchParams.toString();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(e);
  }
  return undefined;
};

const retrieveStateFromLocalStorage = (): Partial<ConfigModel> | undefined => {
  try {
    const configString = window.localStorage.getItem('config');
    if (!configString) {
      return undefined;
    }

    const config: unknown = JSON.parse(configString);
    if (typeof config !== 'object' || !config) {
      return undefined;
    }

    const state: Partial<ConfigModel> = {};
    if (hasOwnProperty('ts', config)) {
      const ts = config.ts;
      if (typeof ts === 'string') {
        state.ts = ts;
      }
    }
    if (hasOwnProperty('tse', config)) {
      const tse = config.tse;
      if (typeof tse === 'string') {
        state.tse = tse;
      }
    }
    if (hasOwnProperty('fileType', config)) {
      const fileType = config.fileType;
      if (fileType === 'true') {
        state.fileType = readFileType(fileType);
      }
    }
    if (hasOwnProperty('showAST', config)) {
      const showAST = config.showAST;
      if (typeof showAST === 'string') {
        state.showAST = readShowAST(showAST);
      }
    }

    return state;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(e);
  }
  return undefined;
};

const writeStateToLocalStorage = (newState: ConfigModel): void => {
  const config: Partial<ConfigModel> = {
    ts: newState.ts,
    tse: newState.tse,
    sourceType: newState.sourceType,
    showAST: newState.showAST,
  };
  window.localStorage.setItem('config', JSON.stringify(config));
};

const getHash = (): string => {
  return window.location.hash.slice(1);
};

function useHashState(
  initialState: ConfigModel
): [ConfigModel, (cfg: Partial<ConfigModel>) => void] {
  const [state, setState] = useState<ConfigModel>(() => ({
    ...initialState,
    ...retrieveStateFromLocalStorage(),
    ...parseStateFromUrl(getHash()),
  }));

  useEffect(() => {
    const hash = getHash();
    // eslint-disable-next-line no-console
    console.info('[State] hash change detected', hash);

    const newState = parseStateFromUrl(hash);
    if (newState) {
      setState((oldState) => ({ ...oldState, ...newState }));
    }
  }, []);

  const updateState = useCallback(
    (cfg: Partial<ConfigModel>) => {
      // eslint-disable-next-line no-console
      console.info('[State] updating config diff', cfg);

      const newState = { ...state, ...cfg };

      const newHash = writeStateToUrl(newState);
      if (getHash() !== newHash) {
        writeStateToLocalStorage(newState);
        setState(newState);

        const url = `${window.location.pathname}#${newHash}`;

        if (cfg.ts || cfg.tse) {
          window.location.href = url;
          window.location.reload();
        } else {
          window.history.replaceState(undefined, document.title, url);
        }
      }
    },
    [state]
  );

  return [state, updateState];
}

export default useHashState;
