import {
  Page,
  Layout,
  Card,
  Icon,
  InlineGrid,
  FormLayout,
  Text,
  TextField,
  Button,
  BlockStack,
  Box, InlineStack, Divider
} from "@shopify/polaris";
import {Modal, TitleBar} from "@shopify/app-bridge-react";
import {Suspense, useEffect, useRef, useState} from "react";
import {Form, Link, useActionData, useLoaderData, useNavigation} from "@remix-run/react";
import DataTable from 'datatables.net-dt';
import {DeleteIcon, EditIcon} from '@shopify/polaris-icons';
import {authenticate} from "../shopify.server.js";
import prisma from "../db.server.js";
import {json} from "@remix-run/node";
import TextEditor from "../components/TextEditor.client.jsx";

// Loader Function
export async function loader({request}) {
  const { session } = await authenticate.admin(request);

  const emailTemplates = await prisma.emailTemplate.findMany({
    where: {
      shop: session.shop,
    },
  })
  return { emailTemplates: emailTemplates }
}

// Action Function
export async function action({request}) {
  const { session } = await authenticate.admin(request);

  const formData = await request.formData();
  // Delete Template
  if (formData.get('intent') === 'delete') {
    await prisma.emailTemplate.delete({
      where: {
        id: parseInt(formData.get('templateId')),
      }
    });

    return json({ success: true, message: "Template deleted" });
  }

  let name = formData.get('name');
  let subject = formData.get('subject');
  let body = formData.get('textEditor');

  // Form validation
  const errors = {};
  if (!name) {
    errors.name = "Template name is required";
  }
  if (!subject) {
    errors.subject = "Email subject is required";
  }
  if (!body) {
    errors.body = "Email body is required";
  }
  if (Object.keys(errors).length > 0) {
    return json({ errors });
  } else {
    const emailTemplate = await prisma.emailTemplate.create({
      data: {
        shop: session.shop,
        name: name,
        subject: subject,
        body: body,
      },
    });

    return json({ success: true, message: "Template created"});
  }
}

export default function AppEmailTemplates() {

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [textEditor, setTextEditor] = useState('');
  const navigation = useNavigation();
  const isLoading = navigation.state !== 'idle';

  const $form = useRef(null);

  const {emailTemplates} = useLoaderData();
  const actionData = useActionData();


  useEffect(() => {
    if (actionData) {
      if (actionData.success === true) {
        shopify.toast.show(actionData.message);
        $form.current?.reset();
        setTextEditor(null);
      }
    }
  }, [actionData])

  useEffect(() => {
    let dataTable = new DataTable('#dataTable', {
      // config options...
    });
    return () => {
      dataTable.destroy();
    };

  }, [])


  return (
    <Page>
      <TitleBar title="Email templates"/>
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack inlineAlign="start">
              <Text as="h2" variant="headingMd">
                Create template
              </Text>
            </BlockStack>
            <Form method="post" style={{padding: '20px 0'}} ref={$form}>
              <FormLayout>
                <label className="label">
                  <span>Template name</span>
                  <input className="input" type="text" name="name" onChange={(newValue) => setName(newValue)}/>
                  {actionData?.errors?.name ? (
                    <em className="text-danger">{actionData?.errors.name}</em>
                  ) : null}
                </label>
                <label className="label">
                  <span>Email subject</span>
                  <input className="input" type="text" name="subject" onChange={(newValue) => setSubject(newValue)}/>
                  {actionData?.errors?.subject ? (
                    <em className="text-danger">{actionData?.errors.subject}</em>
                  ) : null}
                </label>
                <label className="label">
                  <span>Email body</span>
                  <Suspense fallback={<div>Editor is loading...</div>}>
                    <TextEditor
                      theme="snow"
                      placeholder="Write email body"
                      onChange={setTextEditor}
                      value={textEditor}
                    />
                  </Suspense>
                  {actionData?.errors?.body ? (
                    <em className="text-danger">{actionData?.errors.body}</em>
                  ) : null}
                  <input type="hidden" name="textEditor" value={textEditor}/>
                </label>

                <Button submit variant="primary" disabled={isLoading}>{isLoading ? 'Creating template...' : 'Create now'}</Button>

              </FormLayout>
            </Form>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <BlockStack inlineAlign="start">
              <Text as="h2" variant="headingMd">
                Email templates 🎉
              </Text>
            </BlockStack>
            <table className="display" width="100%" id="dataTable">
              <thead>
              <tr>
                <th>Template ID</th>
                <th>Template name</th>
                <th>Template subject</th>
                <th>Action</th>
              </tr>
              </thead>
              <tbody>

              {emailTemplates.map((template) => (
                <tr key={template.id}>
                  <td>{template.id}</td>
                  <td>{template.name}</td>
                  <td>{template.subject}</td>
                  <td>
                    <InlineGrid columns={2}>
                      <Link
                        to={`/app/emailTemplate/${template.id}/edit`}
                        style={{color: 'var(--p-color-icon)', margin: 'auto', cursor: 'pointer'}}
                        title="Edit template"
                      >
                        <Icon source={EditIcon}/>
                      </Link>
                      <div
                        onClick={() => shopify.modal.show(`deleteModal${template.id}`)}
                        style={{color: 'var(--p-color-icon)', margin: 'auto', cursor: 'pointer'}}
                        title="Delete template">
                        <Icon source={DeleteIcon}/>
                      </div>
                      <Modal id={'deleteModal' + template.id}>
                        <TitleBar title="Delete template"/>
                        <Box padding="400">
                          <BlockStack gap="400">
                            <Text
                              variant="heading2xl"
                              as="h3"
                              alignment="center"
                            >
                              Are you sure?
                            </Text>
                          </BlockStack>
                          <Box paddingBlockStart="800">
                            <Divider/>
                            <Box paddingBlockStart="400">
                              <InlineStack gap="200" align="end">
                                <Button
                                  submit
                                  variant="secondary"
                                  onClick={() => shopify.modal.hide(`deleteModal${template.id}`)}
                                >
                                  Cancel
                                </Button>
                                <Form method="post">
                                  <input type="hidden" name="templateId" value={template.id}/>
                                  <button
                                    type="submit"
                                    name="intent"
                                    value="delete"
                                    className="Polaris-Button Polaris-Button--pressable Polaris-Button--variantPrimary Polaris-Button--sizeMedium Polaris-Button--textAlignCenter"
                                  >
                                    <span className="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--medium">Delete now</span>
                                  </button>
                                </Form>
                              </InlineStack>
                            </Box>
                          </Box>
                        </Box>
                      </Modal>
                    </InlineGrid>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
