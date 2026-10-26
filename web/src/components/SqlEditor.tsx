import { useEffect, useRef } from 'react';
import { Compartment, EditorState } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  highlightActiveLine,
} from '@codemirror/view';
import {
  defaultHighlightStyle,
  syntaxHighlighting,
  indentOnInput,
  bracketMatching,
  foldGutter,
  foldKeymap,
} from '@codemirror/language';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { sql, MySQL } from '@codemirror/lang-sql';

interface Props {
  doc: string;
  onChange: (v: string) => void;
  onRun: () => void;
  onSubmit: () => void;
  /** 面试模式：关掉自动补全 */
  autocomplete?: boolean;
  /** 交卷后锁定编辑 */
  readOnly?: boolean;
}

const lightTheme = EditorView.theme(
  {
    '&': { backgroundColor: '#ffffff', color: '#1a1a18', fontSize: '13.5px', height: '100%' },
    '.cm-scroller': {
      fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
      lineHeight: '1.75',
    },
    '.cm-gutters': { backgroundColor: '#fafaf7', color: '#b0b0a6', border: 'none' },
    '.cm-activeLine': { backgroundColor: '#f5f8fc' },
    '.cm-activeLineGutter': { backgroundColor: '#eef3fa' },
    '.cm-content': { padding: '12px 0' },
    '&.cm-focused': { outline: 'none' },
    '.cm-selectionBackground, .cm-content ::selection': { backgroundColor: '#cfe2f7' },
    '.cm-cursor': { borderLeftColor: '#185fa5', borderLeftWidth: '2px' },
    '&.cm-readonly .cm-content': { color: '#5c5b54' },
  },
  { dark: false },
);

// 自己拼基础扩展，而不是用 basicSetup —— 这样才能按模式去掉自动补全
function baseExtensions(allowAutocomplete: boolean) {
  return [
    lineNumbers({
      // 点行号选中整行。这个事件必须挂在行号栏上——内容区的 domEventHandlers 收不到 gutter 的事件
      domEventHandlers: {
        mousedown(view, line, event) {
          view.dispatch({ selection: { anchor: line.from, head: line.to } });
          view.focus();
          event.preventDefault();
          return true;
        },
      },
    }),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    foldGutter(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    bracketMatching(),
    closeBrackets(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    ...(allowAutocomplete ? [autocompletion(), keymap.of(completionKeymap)] : []),
  ];
}

const readOnlyExt = (ro: boolean) => [EditorState.readOnly.of(ro), EditorView.editable.of(!ro)];

export default function SqlEditor({
  doc,
  onChange,
  onRun,
  onSubmit,
  autocomplete = true,
  readOnly = false,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const roCompartment = useRef(new Compartment());
  const cb = useRef({ onChange, onRun, onSubmit });
  cb.current = { onChange, onRun, onSubmit };

  useEffect(() => {
    if (!host.current) return;
    const v = new EditorView({
      doc,
      parent: host.current,
      extensions: [
        baseExtensions(autocomplete),
        sql({ dialect: MySQL }),
        lightTheme,
        EditorView.lineWrapping,
        roCompartment.current.of(readOnlyExt(readOnly)),
        keymap.of([
          // Tab 用于缩进（选中多行时整块缩进），Shift-Tab 反缩进
          indentWithTab,
          {
            key: 'Mod-Enter',
            run: () => {
              cb.current.onRun();
              return true;
            },
          },
          {
            key: 'Mod-Shift-Enter',
            run: () => {
              cb.current.onSubmit();
              return true;
            },
          },
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...closeBracketsKeymap,
        ]),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) cb.current.onChange(u.state.doc.toString());
        }),
      ],
    });
    view.current = v;
    (window as any).__cm = v;
    return () => {
      v.destroy();
      view.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 交卷后锁定，不重建编辑器（保留光标和滚动位置）
  useEffect(() => {
    view.current?.dispatch({ effects: roCompartment.current.reconfigure(readOnlyExt(readOnly)) });
  }, [readOnly]);

  return <div className="editor-host" ref={host} />;
}
