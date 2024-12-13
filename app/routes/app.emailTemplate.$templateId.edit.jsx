import {
  Page,
  Layout,
  Card,
  FormLayout,
  Text,
  Button,
  BlockStack,
  TextField,
  Box,
  Divider, InlineStack
} from "@shopify/polaris";
import {Modal, TitleBar} from "@shopify/app-bridge-react";
import {Suspense, useEffect, useState} from "react";
import {Form, useActionData, useLoaderData} from "@remix-run/react";
import {json, redirect} from "@remix-run/node";
import {authenticate} from "../shopify.server.js";
import prisma from "../db.server.js";
import TextEditor from "../components/TextEditor.client.jsx";
import {Resend} from "resend";
import ReviewRequest from "../emails/ReviewRequest.jsx";

// Loader Function
export async function loader({request, params}) {
  await authenticate.admin(request);

  const emailTemplate = await prisma.emailTemplate.findUnique({
    where: {
      id: parseInt(params.templateId),
    }
  });

  if (emailTemplate) {
    return { emailTemplate: emailTemplate }
  } else {
    return redirect('/app/emailTemplate/index');
  }

}

// Action Function
export async function action({request, params}) {
  await authenticate.admin(request);

  const formData = await request.formData();

  // Send test email if intent is sendTestEmailIntent
  if (formData.get('intent') === 'sendTestEmailIntent') {
    let email = formData.get('email');
    if (email) {
      let emailTemplateId = formData.get('emailTemplateId');
      const emailTemplate = await prisma.emailTemplate.findUnique({
        where: {
          id: parseInt(emailTemplateId),
        }
      });
      if (emailTemplate) {
        let subject = emailTemplate.subject;
        let body = emailTemplate.body;
        let productId = '11360739623230';
        let productTitle = 'Test product title';
        let customerName = 'John Doe';
        let reviewLink = `https://kidsole.myshopify.com/pages/add-review?productId=${productId}`;
        let shop = 'Kidsole.com';

        let formatBody = body.replaceAll("{{customer_name}}", customerName).replaceAll("{{product_title}}", productTitle).replaceAll("{{review_link}}", reviewLink).replaceAll("{{shop_name}}", shop);

        // Send email now
        const resend = new Resend(process.env.RESEND_API_KEY);
        const emailResponse = await resend.emails.send({
          from: 'Kidsole <no-reply@noor-e-alam.com>',
          to: email,
          subject: subject,
          react: <ReviewRequest customerName={customerName} bodyText={formatBody} reviewLink={reviewLink} shopName={shop} />,
        });

        if (emailResponse.error == null) {
          return json({ success: true, message: "Test email sent!"});
        } else {
          return json({ success: false, message: "Email could not sent! please try again"});
        }
      }

    }
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
    const updateTemplate = await prisma.emailTemplate.update({
      where: {
        id: parseInt(params.templateId),
      },
      data: {
        name: name,
        subject: subject,
        body: body,
      },
    });

    return json({ success: true, message: "Template updated"});
  }
}

export default function AppEmailTemplateEdit() {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [textEditor, setTextEditor] = useState('');
  const [testEmail, setTestEmail] = useState('');


  const { emailTemplate } = useLoaderData();
  const actionData = useActionData();

  useEffect(() => {
    if (emailTemplate) {
      setTextEditor(emailTemplate.body);
    }
  }, []);

  useEffect(() => {
    if (actionData) {
      if (actionData.success === true) {
        shopify.toast.show(actionData.message);
        shopify.modal.hide(`testEmailModal`);
      } else {
        shopify.toast.show(actionData.message);
        shopify.modal.hide(`testEmailModal`);
      }
    }
  }, [actionData])

  return (
    <Page>
      <TitleBar title="Edit template">
        <button variant="primary" onClick={() => shopify.modal.show(`testEmailModal`)}>
          Send test email
        </button>
      </TitleBar>
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack inlineAlign="start">
              <Text as="h2" variant="headingMd">
                Edit template
              </Text>
            </BlockStack>
            <Form method="post" style={{padding: '20px 0'}}>
              <FormLayout>
                <label className="label">
                  <span>Template name</span>
                  <input className="input" type="text" name="name" defaultValue={emailTemplate?.name} onChange={(newValue) => setName(newValue)}/>
                  {actionData?.errors?.name ? (
                    <em className="text-danger">{actionData?.errors.name}</em>
                  ) : null}
                </label>
                <label className="label">
                  <span>Email subject</span>
                  <input className="input" type="text" name="subject" defaultValue={emailTemplate?.subject} onChange={(newValue) => setSubject(newValue)}/>
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
                <Button submit variant="primary">Update now</Button>
              </FormLayout>
            </Form>
          </Card>
          <Modal id="testEmailModal">
            <TitleBar title="Send test email"/>
            <Box padding="400">
              <BlockStack gap="400">
                <Form method="post">
                  <TextField
                    name="email"
                    label="Email"
                    type="email"
                    value={testEmail}
                    onChange={(newValue) => setTestEmail(newValue)}
                    autoComplete="email"
                  />
                  <input type="hidden" name="emailTemplateId" value={emailTemplate?.id}/>
                  <button
                    type="submit"
                    name="intent"
                    value="sendTestEmailIntent"
                    className="Polaris-Button Polaris-Button--pressable Polaris-Button--variantPrimary Polaris-Button--sizeMedium Polaris-Button--textAlignCenter"
                    style={{marginTop: '20px'}}
                  >
                    <span className="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--medium">Send now</span>
                  </button>
                </Form>
              </BlockStack>
            </Box>
          </Modal>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
