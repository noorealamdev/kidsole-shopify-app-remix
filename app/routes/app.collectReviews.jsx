import {
  BlockStack, Box,
  Button,
  Card,
  FormLayout,
  Grid,
  InlineStack,
  Layout,
  Page,
  Select,
  Text,
  TextField
} from "@shopify/polaris";
import {Modal, TitleBar} from "@shopify/app-bridge-react";
import {authenticate} from "../shopify.server.js";
import {useCallback, useEffect, useState} from "react";
import {Form, useActionData, useLoaderData, useNavigation} from "@remix-run/react";
import prisma from "../db.server.js";
import cron from "node-cron";
import {sendReviewRequestEmail} from "../utils/sendReviewRequestEmail.jsx";

// Loader Function
export async function loader({request}) {
  const {admin, session} = await authenticate.admin(request);

  // Creating a cron job which runs on every 10 second
  let task = cron.schedule("*/10 * * * * *", function () {
    console.log("running a task every 10 second");
  });

  task.stop();

  // Get all products for creating review link
  const productsResponse = await admin.graphql(
    `#graphql
      query {
        products(first: 250) {
          edges {
            node {
              id
              title
            }
          }
        }
      }`,
  );
  const products = await productsResponse.json();

  // Get email templates
  const emailTemplates = await prisma.emailTemplate.findMany({
    where: {
      shop: session.shop,
    },
  })

  // Get ReviewEmailSend table data
  const reviewEmailSendingList = await prisma.reviewEmailSend.findMany({
    where: {
      shop: session.shop,
    },
  })

  // Get ReviewEmailSent table data
  const reviewEmailSentList = await prisma.reviewEmailSent.findMany({
    where: {
      shop: session.shop,
    },
  })

  return {
    shop: session.shop,
    emailTemplates: emailTemplates,
    products: products.data.products.edges,
    reviewEmailSendingList: reviewEmailSendingList,
    reviewEmailSentList: reviewEmailSentList
  };
}

// Action Function
export async function action({request}) {
  const {session, admin} = await authenticate.admin(request);
  const formData = await request.formData();
  // Insert new data to db function
  const insertReviewEmailSendTableData = async (shop, orderId, email, customerName, productId, productTitle) => {
    // Check if email is already in the 'ReviewEmailSent' table
    // We don't need to send review email to the same customer again
    const emailAlreadySent = await prisma.reviewEmailSent.findUnique({
      where: {
        orderId: orderId,
      },
    });
    //console.log('email already sent>>>>>', emailAlreadySent)
    // If email is not in the 'ReviewEmailSent' table, insert new data
    if (emailAlreadySent == null) {
      await prisma.reviewEmailSend.upsert({
        where: {orderId: orderId},
        update: {},
        create: {
          shop: shop,
          orderId: orderId,
          email: email,
          customerName: customerName,
          productId: productId,
          productTitle: productTitle,
        },
      });
    }
  }

  if (formData.get('intent') === 'fetchEmailsIntent') {
    let emailsCount = formData.get('emailsCount');
    let emailsOlderThan = formData.get('emailsOlderThan');
    // Get orders based on the older date
    let currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - emailsOlderThan);
    let orderFromDate = currentDate.toISOString().split('T')[0]; //"2024-10-28"
    const ordersResponse = await admin.graphql(
      `#graphql
      query {
        orders(first: ${emailsCount}, query: "closed:true, updated_at:>${orderFromDate}") {
          edges {
            node {
              id
              name
              email
              updatedAt
              customer {
                firstName
                lastName
              }
              lineItems(first: 1) {
                edges {
                  node {
                    product {
                      id
                      title
                    }
                  }
                }
              }
            }
          }
        }
      }`,
    );
    const orders = await ordersResponse.json();
    if (orders.data.orders.edges.length > 0) {
      orders.data.orders.edges.forEach((order) => {
        // Check if current order has email address
        if (order.node.email) {
          const orderId = order.node.id.replace("gid://shopify/Order/", "");
          const email = order.node.email;
          const shop = session.shop;
          const customerName = `${order.node.customer.firstName} ${order.node.customer.lastName}`;
          const productId = order.node.lineItems.edges[0]?.node.product.id.replace("gid://shopify/Product/", "");
          const productTitle = order.node.lineItems.edges[0]?.node.product.title;
          //console.log(`orderId: ${orderId}, email: ${email}, shop: ${shop}, productId: ${productId}, productTitle: ${productTitle}`);
          // Insert email to the db table
          insertReviewEmailSendTableData(shop, orderId, email, customerName, productId, productTitle);
        }
      })
      return {success: true, message: 'Emails fetched successfully'};
    } else {
      return {success: false, message: 'No emails found'};
    }
  }

  if (formData.get('intent') === 'sendEmailsIntent') {
    // Sending review request email
    await sendReviewRequestEmail(session.shop);
    return {success: true, message: 'Emails will start sending shortly in the background'};
  }

  if (formData.get('intent') === 'saveSettings') {
    const prefix = session.shop;
    await prisma.option.upsert({
      where: {
        key: `${prefix}_collect_reviews_email_template_id`,
      },
      update: {
        value: formData.get('emailTemplateId')
      },
      create: {
        key: `${prefix}_collect_reviews_email_template_id`,
        value: formData.get('emailTemplateId')
      },
    })
    await prisma.option.upsert({
      where: {
        key: `${prefix}_collect_reviews_auto_review_request`,
      },
      update: {
        value: formData.get('autoReviewRequest')
      },
      create: {
        key: `${prefix}_collect_reviews_auto_review_request`,
        value: formData.get('autoReviewRequest')
      },
    })
    await prisma.option.upsert({
      where: {
        key: `${prefix}_collect_reviews_email_timing`,
      },
      update: {
        value: formData.get('emailTiming')
      },
      create: {
        key: `${prefix}_collect_reviews_email_timing`,
        value: formData.get('emailTiming')
      },
    })
    await prisma.option.upsert({
      where: {
        key: `${prefix}_collect_reviews_bad_rating_email`,
      },
      update: {
        value: formData.get('badRatingEmail')
      },
      create: {
        key: `${prefix}_collect_reviews_bad_rating_email`,
        value: formData.get('badRatingEmail')
      },
    })

    return {success: true, message: 'Settings saved'}
  }

  return null;
}

export default function AppCollectReviews() {
  const {shop, emailTemplates, products, reviewEmailSendingList, reviewEmailSentList} = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isLoading = navigation.state !== 'idle';

  const [selectedProduct, setSelectedProduct] = useState();
  const [selectedEmailTemplate, setSelectedEmailTemplate] = useState();
  const [badRatingEmail, setBadRatingEmail] = useState('joshmsinger@gmail.com');
  const [selectedAutoReviewRequest, setSelectedAutoReviewRequest] = useState();
  const [timing, setTiming] = useState('21');
  // Fetch emails states
  const [emailsOlderThan, setEmailsOlderThan] = useState('21');
  const [emailsCount, setEmailsCount] = useState('50');

  useEffect(() => {
    if (actionData) {
      if (actionData.success === true) {
        shopify.toast.show(actionData.message);
        shopify.modal.hide(`fetchEmailsModal`)
      }
    }
  }, [actionData])

  const selectProductOptions = [];
  selectProductOptions.push({label: "No product selected", value: ""});
  products.forEach((product) => {
    let productId = product.node.id.replace(
      "gid://shopify/Product/",
      "",
    );
    selectProductOptions.push({label: product.node.title, value: productId})
  })

  const selectEmailTemplateOptions = [];
  emailTemplates.forEach((template) => {
    selectEmailTemplateOptions.push({label: template.name, value: template.id.toString()})
  })

  const handleEmailsCount = useCallback(
    (value) => {
      setEmailsCount(value);
      if (value > 250) {
        alert('You can only fetch max 250 emails at a time');
      }
    },
    [],
  );

  const handleSelectProductChange = useCallback(
    (value) => setSelectedProduct(value),
    [],
  );
  const handleSelectEmailTemplateChange = useCallback(
    (value) => setSelectedEmailTemplate(value),
    [],
  );
  const handleTimingChange = useCallback(
    (value) => setTiming(value),
    [],
  );
  const handleAutoReviewRequestChange = useCallback(
    (value) => setSelectedAutoReviewRequest(value),
    [],
  );
  const autoReviewRequestOptions = [
    {label: 'Yes', value: 'yes'},
    {label: 'No', value: 'no'},
  ];

  return (
    <Page>
      <TitleBar title="Collect reviews"/>
      <Layout>
        <Layout.Section>
          <Grid>
            <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
              <Card>
                <InlineStack align="space-between">
                  <Text as="h2" variant="bodyLg">
                    Review requests will send
                  </Text>
                  <Button variant="secondary" onClick={() => shopify.modal.show(`fetchEmailsModal`)}>
                    Fetch customer emails
                  </Button>
                  {reviewEmailSendingList.length > 0 && (
                    <Form method="post">
                      <button
                        type="submit"
                        name="intent"
                        value="sendEmailsIntent"
                        className="Polaris-Button Polaris-Button--pressable Polaris-Button--variantPrimary Polaris-Button--sizeMedium Polaris-Button--textAlignCenter"
                        disabled={isLoading}
                      >
                      <span
                        className="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--medium">{isLoading ? 'Sending...' : 'Send emails'}</span>
                      </button>
                    </Form>
                  )}
                </InlineStack>
                <Box style={{paddingTop: '5px'}}>
                  <Text as="h1" variant="headingMd">
                    {reviewEmailSendingList.length}
                  </Text>
                </Box>
              </Card>
              <Modal id="fetchEmailsModal">
                <TitleBar title="Fetch customer order emails to send review requests"/>
                <Box padding="400">
                  <Form method="post">
                    <BlockStack gap="400">
                      <TextField
                        name="emailsOlderThan"
                        label="Get emails older than"
                        type="number"
                        requiredIndicator={true}
                        value={emailsOlderThan}
                        onChange={(value) => setEmailsOlderThan(value)}
                        suffix="days"
                        autoComplete="off"
                      />
                      <TextField
                        name="emailsCount"
                        label="How many emails to fetch"
                        type="number"
                        requiredIndicator={true}
                        value={emailsCount}
                        onChange={handleEmailsCount}
                        suffix="emails"
                        helpText="250 is maximum at a time according to Shopify API. If it fails to fetch correct number of emails, please try to increase older date or decrease emails count."
                        autoComplete="off"
                      />
                      <button
                        type="submit"
                        name="intent"
                        value="fetchEmailsIntent"
                        className="Polaris-Button Polaris-Button--pressable Polaris-Button--variantPrimary Polaris-Button--sizeMedium Polaris-Button--textAlignCenter"
                        disabled={isLoading}
                      >
                        <span
                          className="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--medium">{isLoading ? 'Fetching emails...' : 'Fetch emails now'}</span>
                      </button>
                    </BlockStack>
                  </Form>
                </Box>
              </Modal>
            </Grid.Cell>
            <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
              <Card>
                <BlockStack gap="300">
                  <Text as="h1" variant="bodyLg">
                    Review requests sent
                  </Text>
                  <Text as="h2" variant="headingMd">
                    {reviewEmailSentList.length}
                  </Text>
                </BlockStack>
              </Card>
            </Grid.Cell>
          </Grid>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Create a review link
              </Text>
              <Select
                label="Select product"
                options={selectProductOptions}
                onChange={handleSelectProductChange}
                value={selectedProduct}
              />

              {
                selectedProduct && (
                  <Text as="h1" variant="headingMd">
                    <Text as="h2" variant="bodyMd">
                      Review link
                    </Text>
                    <a
                      target="_blank"
                      rel="noreferrer"
                      href={`https://${shop}/pages/add-review?productId=${selectedProduct}`}
                    >
                      https://{shop}/pages/add-review?productId={selectedProduct}
                    </a>
                  </Text>
                )
              }
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Collect review settings
              </Text>
              <Form method="post">
                <FormLayout>
                  <Select
                    name="emailTemplateId"
                    label="Select email template"
                    options={selectEmailTemplateOptions}
                    onChange={handleSelectEmailTemplateChange}
                    value={selectedEmailTemplate}
                  />
                  <TextField
                    name="badRatingEmail"
                    label="Send email for bad rating"
                    type="email"
                    value={badRatingEmail}
                    onChange={(newValue) => setBadRatingEmail(newValue)}
                    autoComplete="on"
                    helpText="Send email if user submit a review with rating less than 4, so that you can help them personaly"
                  />
                  <Select
                    name="autoReviewRequest"
                    label="Automatic review requests"
                    options={autoReviewRequestOptions}
                    onChange={handleAutoReviewRequestChange}
                    value={selectedAutoReviewRequest}
                    helpText='Automatically send emails requesting reviews to gather customer feedback.'
                  />
                  <TextField
                    name="emailTiming"
                    label="Email timing"
                    type="number"
                    value={timing}
                    onChange={handleTimingChange}
                    suffix="days"
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    name="intent"
                    value="saveSettings"
                    className="Polaris-Button Polaris-Button--pressable Polaris-Button--variantPrimary Polaris-Button--sizeMedium Polaris-Button--textAlignCenter"
                    disabled={isLoading}
                  >
                    <span
                      className="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--medium">{isLoading ? 'Saving...' : 'Save settings'}</span>
                  </button>
                </FormLayout>
              </Form>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  )
}
