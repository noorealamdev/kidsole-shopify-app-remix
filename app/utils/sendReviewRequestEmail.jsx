import {Resend} from "resend";
import ReviewRequest from "../emails/ReviewRequest.jsx";

export const sendReviewRequestEmail = async (shop) => {

  // Get ReviewEmailSend table data
  const reviewEmailSendingList = await prisma.reviewEmailSend.findMany({
    where: {shop: shop}
  });

  // Get email template id from option table
  const emailTemplateId = await prisma.option.findUnique({
    where: {key: `${shop}_collect_reviews_email_template_id`}
  });

  // Get email template details
  const emailTemplate = await prisma.emailTemplate.findUnique({
    where: {
      id: parseInt(emailTemplateId.value),
    }
  });

  if (reviewEmailSendingList.length > 0) {
    for (const reviewEmailItem of reviewEmailSendingList) {
      //console.log(emailTemplate)
      if (emailTemplate) {
        let subject = emailTemplate.subject;
        let body = emailTemplate.body;
        let orderId = reviewEmailItem.orderId;
        let email = reviewEmailItem.email;
        let productId = reviewEmailItem.productId;
        let productTitle = reviewEmailItem.productTitle;
        let customerName = reviewEmailItem.customerName;
        let reviewLink = `https://${shop}/pages/add-review?productId=${productId}`;

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
          console.log('Email sent successfully');
          // Add this email to the database table 'ReviewEmailSent'
          await prisma.reviewEmailSent.upsert({
            where: {orderId: orderId},
            update: {},
            create: {
              shop: shop,
              orderId: orderId,
              email: email,
            },
          });

          // Now remove the email from the 'ReviewEmailSend' table
          await prisma.reviewEmailSend.delete({
            where: {id: reviewEmailItem.id}
          });

        } else {
          console.log('Email could not sent! please try again');
        }
      }
    }
  }
  return null;
};
