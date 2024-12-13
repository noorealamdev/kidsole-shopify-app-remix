import {authenticate} from "../shopify.server.js";
import {json} from "@remix-run/node";
import prisma from "../db.server.js";
import {Resend} from "resend";

// Loader Function
export async function loader({ request }) {
  // const url = new URL(request.url);
  // const shop = url.searchParams.get('shop');
  const { session } = await authenticate.public.appProxy(request);

  let reviews = await prisma.review.findMany({
    where: {shop: session.shop, status: 'published'},
  });

  if ( reviews.length > 0 ) {
    return json({ success: true, reviews: reviews })
  } else {
    return json({ success: false, message: 'No review found' })
  }
}

// Action Function
export async function action({ request }) {
  const { admin } = await authenticate.public.appProxy(request);

  const formData = await request.formData();
  const shop = formData.get('shop');
  const productId = formData.get('productId');
  const rating = parseInt(formData.get('rating'));
  const name = formData.get('name');
  const email = formData.get('email');
  const content = formData.get('content');

  //console.log('Form Data>>>>', shop, productId, rating, name, email, content)
  // Process the form data (e.g., save to a database, send an email, etc.)

  // Get the product title, handle and image and save to review table db
  const productResponse = await admin.graphql(
      `#graphql
    query {
      node(id: "gid://shopify/Product/${productId}") {
        id
        ... on Product {
          title
          handle
          featuredMedia {
            preview {
              image {
                url
              }
            }
          }
        }
      }
    }`,
  );

  const product = await productResponse.json();
  //console.log(product.data.node.title)

  if (product) {
    // Send email if the rating value is less than 4
    if (rating < 4) {
      // Send email to the shop owner
      // Get to email from option table
      const badRatingEmail = await prisma.option.findUnique({
        where: {key: `${shop}_collect_reviews_bad_rating_email`}
      });
      if (badRatingEmail.value) {
        // Send email now
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'Kidsole <no-reply@noor-e-alam.com>',
          to: [badRatingEmail.value],
          subject: `User just submitted ${rating} star review`,
          html: `<h3>Review details</h3>
          <p>Shop: ${shop}</p>
          <p>Product Item: ${product.data.node.title}</p>
          <p>Rating: ${rating}</p>
          <p>User Name: ${name}</p>
          <p>User Email: ${email}</p>
          <p>Review: ${content}</p>
          `,
        });
      }
    }
    else {
      const review = await prisma.review.create({
        data: {
          shop: shop,
          productId: productId,
          productTitle: product.data.node.title,
          productHandle: product.data.node.handle,
          productImage: product.data.node.featuredMedia.preview.image.url,
          rating: rating,
          name: name,
          email: email,
          content: content,
          status: 'published',
        },
      });
    }

    return json({success: true});

  } else {
    return json({success: false});
  }
}
