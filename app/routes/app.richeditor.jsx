import {
  Card,
  Layout,
  Page,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { Suspense, useState } from "react";
import TextEditor from "../components/TextEditor.client";


export default function RichEditorPage() {
  const [textEditor, setTextEditor] = useState("");

  return (
    <Page>
      <TitleBar title="Rich text editor" />
      <Layout>
        <Layout.Section>
          <Card>
            <h1 className="btn btn-primary">{textEditor}</h1>
            <Suspense fallback={<div>Editor is loading...</div>}>
              <TextEditor
                theme="snow"
                placeholder="Write email body"
                onChange={setTextEditor}
                value={textEditor}
              />
            </Suspense>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
