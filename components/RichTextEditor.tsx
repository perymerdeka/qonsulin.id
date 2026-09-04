"use client";
import { MDXEditor, headingsPlugin, listsPlugin, quotePlugin, linkPlugin, linkDialogPlugin, toolbarPlugin, BlockTypeSelect, BoldItalicUnderlineToggles, UndoRedo, CreateLink } from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';

export default function RichTextEditor({ value, onChange }: { value: string, onChange: (v: string) => void }) {
  return (
    <div style={{ border: "1px solid var(--color-rule)", borderRadius: "8px", background: "white", marginTop: "0.5rem" }}>
      <MDXEditor
        markdown={value}
        onChange={onChange}
        contentEditableClassName="cms-prose"
        plugins={[
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          toolbarPlugin({
            toolbarContents: () => (
              <div style={{ display: "flex", gap: "10px", padding: "10px", borderBottom: "1px solid #eee", width: "100%", overflowX: "auto" }}>
                <UndoRedo />
                <div style={{ width: "1px", background: "#eee", margin: "0 5px" }} />
                <BoldItalicUnderlineToggles />
                <div style={{ width: "1px", background: "#eee", margin: "0 5px" }} />
                <BlockTypeSelect />
                <div style={{ width: "1px", background: "#eee", margin: "0 5px" }} />
                <CreateLink />
              </div>
            )
          })
        ]}
      />
    </div>
  );
}
